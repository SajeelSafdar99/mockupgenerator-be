const { connectToDatabase } = require("../../lib/database")
const { verifyRefreshToken, generateAccessToken } = require("../../lib/auth")
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
      userId: new require("mongodb").ObjectId(decoded.userId),
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
    })
  }
}
