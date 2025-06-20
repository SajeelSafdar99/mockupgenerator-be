const { verifyAccessToken } = require("./auth")
const { connectToDatabase } = require("./database")
const { ObjectId } = require("mongodb")

async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
      code: "NO_TOKEN",
    })
  }

  const decoded = verifyAccessToken(token)
  if (!decoded) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token",
      code: "INVALID_TOKEN",
    })
  }

  // Verify user still exists
  try {
    const { db } = await connectToDatabase()
    const user = await db.collection("users").findOne({
      _id: new ObjectId(decoded.userId),
    })

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND",
      })
    }

    req.user = { id: decoded.userId, email: user.email }
    next()
  } catch (error) {
    console.error("Authentication database error:", error)
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      code: "AUTH_DB_ERROR",
      details: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

function corsMiddleware(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization")

  if (req.method === "OPTIONS") {
    res.status(200).end()
  } else {
    next()
  }
}

module.exports = {
  authenticateToken,
  corsMiddleware,
}
