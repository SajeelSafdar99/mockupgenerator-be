const { connectToDatabase } = require("../../lib/database")
const { comparePassword, generateAccessToken, generateRefreshToken, generateRememberToken } = require("../../lib/auth")
const { validateEmail } = require("../../lib/validation")
const { corsMiddleware } = require("../../lib/middleware")

module.exports = async function handler(req, res) {
  // Apply CORS
  corsMiddleware(req, res, () => {})

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
    })
  }
}
