const { connectToDatabase } = require("../../lib/database")
const {
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateRememberToken,
  hashPassword,
  verifyRefreshToken,
} = require("../../lib/auth")
const { validateEmail, validatePassword, validateName, sanitizeInput } = require("../../lib/validation")
const { corsMiddleware } = require("../../lib/middleware")
const { ObjectId } = require("mongodb")

module.exports = async function handler(req, res) {
  // Apply CORS
  corsMiddleware(req, res, () => {})

  const { action } = req.query

  switch (action) {
    case "login":
      return handleLogin(req, res)
    case "signup":
      return handleSignup(req, res)
    case "logout":
      return handleLogout(req, res)
    case "refresh":
      return handleRefresh(req, res)
    default:
      return res.status(404).json({
        success: false,
        message: "Auth endpoint not found",
      })
  }
}

async function handleLogin(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    })
  }

  try {
    const { email, password, rememberMe = false } = req.body

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      })
    }

    const sanitizedEmail = email.toLowerCase().trim()

    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Find user
    const user = await db.collection("users").findOne({
      email: sanitizedEmail,
    })

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password)

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      })
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id.toString())
    const refreshToken = rememberMe
        ? generateRememberToken(user._id.toString())
        : generateRefreshToken(user._id.toString())

    // Store refresh token in database
    await db.collection("refresh_tokens").insertOne({
      userId: user._id,
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
    })

    // Update last login
    await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: { lastLogin: new Date(), updatedAt: new Date() } })

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        accessToken,
        refreshToken,
        rememberMe,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

async function handleSignup(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    })
  }

  try {
    const { firstName, lastName, email, password } = req.body

    // Validate input
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      })
    }

    // Sanitize inputs
    const sanitizedFirstName = sanitizeInput(firstName)
    const sanitizedLastName = sanitizeInput(lastName)
    const sanitizedEmail = email.toLowerCase().trim()

    // Validate email
    if (!validateEmail(sanitizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      })
    }

    // Validate names
    if (!validateName(sanitizedFirstName) || !validateName(sanitizedLastName)) {
      return res.status(400).json({
        success: false,
        message: "Names must be between 2-50 characters",
      })
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters with uppercase, lowercase, and number",
      })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      email: sanitizedEmail,
    })

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      })
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const newUser = {
      firstName: sanitizedFirstName,
      lastName: sanitizedLastName,
      email: sanitizedEmail,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("users").insertOne(newUser)

    // Generate tokens
    const accessToken = generateAccessToken(result.insertedId.toString())
    const refreshToken = generateRefreshToken(result.insertedId.toString())

    // Store refresh token in database
    await db.collection("refresh_tokens").insertOne({
      userId: result.insertedId,
      token: refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    })

    res.status(201).json({
      success: true,
      message: "User created successfully",
      data: {
        user: {
          id: result.insertedId,
          firstName: sanitizedFirstName,
          lastName: sanitizedLastName,
          email: sanitizedEmail,
        },
        accessToken,
        refreshToken,
      },
    })
  } catch (error) {
    console.error("Signup error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    })

    // More specific error handling
    if (error.name === "MongoError" || error.name === "MongoServerError") {
      return res.status(500).json({
        success: false,
        message: "Database connection error",
        details: process.env.NODE_ENV === "development" ? error.message : undefined,
      })
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
      timestamp: new Date().toISOString(),
    })
  }
}

async function handleLogout(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    })
  }

  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Remove refresh token from database
    await db.collection("refresh_tokens").deleteOne({
      token: refreshToken,
    })

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}

async function handleRefresh(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    })
  }

  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      })
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken)
    if (!decoded) {
      return res.status(403).json({
        success: false,
        message: "Invalid refresh token",
      })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Check if refresh token exists in database
    const tokenDoc = await db.collection("refresh_tokens").findOne({
      token: refreshToken,
      userId: new ObjectId(decoded.userId),
    })

    if (!tokenDoc) {
      return res.status(403).json({
        success: false,
        message: "Refresh token not found",
      })
    }

    // Check if token is expired
    if (new Date() > tokenDoc.expiresAt) {
      // Remove expired token
      await db.collection("refresh_tokens").deleteOne({ _id: tokenDoc._id })
      return res.status(403).json({
        success: false,
        message: "Refresh token expired",
      })
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded.userId)

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    })
  } catch (error) {
    console.error("Token refresh error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
