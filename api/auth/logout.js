const { connectToDatabase } = require("../../lib/database")
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
