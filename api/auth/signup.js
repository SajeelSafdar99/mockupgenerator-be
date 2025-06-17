const { connectToDatabase } = require("../../lib/database")
const { hashPassword, generateAccessToken, generateRefreshToken } = require("../../lib/auth")
const { validateEmail, validatePassword, validateName, sanitizeInput } = require("../../lib/validation")
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
    console.error("Signup error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
    })
  }
}
