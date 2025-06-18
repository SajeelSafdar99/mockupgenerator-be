const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")
const { ObjectId } = require("mongodb")

module.exports = async function handler(req, res) {
  // Apply CORS
  corsMiddleware(req, res, () => {})

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    })
  }

  // Authenticate user
  try {
    await new Promise((resolve, reject) => {
      authenticateToken(req, res, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  } catch (error) {
    return // Error already handled by middleware
  }

  try {
    // Connect to database
    const { db } = await connectToDatabase()

    // Get user profile
    const user = await db.collection("users").findOne(
        { _id: new ObjectId(req.user.id) },
        { projection: { password: 0 } }, // Exclude password
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    res.status(200).json({
      success: true,
      message: "Profile retrieved successfully",
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
        },
      },
    })
  } catch (error) {
    console.error("Profile error:", error)
    res.status(500).json({
      success: false,
      message: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
