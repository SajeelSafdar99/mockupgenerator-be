const { connectToDatabase } = require("../lib/database")
const { corsMiddleware } = require("../lib/middleware")

module.exports = async function handler(req, res) {
    // Apply CORS
    corsMiddleware(req, res, () => {})

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed. Use GET request.",
        })
    }

    try {
        // Test database connection
        let dbStatus = "disconnected"
        let dbMessage = "Could not connect to database"

        try {
            const { db } = await connectToDatabase()
            // Simple ping to test connection
            await db.admin().ping()
            dbStatus = "connected"
            dbMessage = "Database connection successful"
        } catch (dbError) {
            console.error("Database connection error:", dbError.message)
            dbMessage = `Database error: ${dbError.message}`
        }

        // Get environment info (without exposing secrets)
        const envInfo = {
            nodeVersion: process.version,
            platform: process.platform,
            environment: process.env.NODE_ENV || "development",
            hasMongoUri: !!process.env.MONGODB_URI,
            mongoUriLength: process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 0,
            dbName: process.env.DB_NAME || "authdb",
            hasJwtSecret: !!process.env.JWT_SECRET,
            hasRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
            jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        }

        res.status(200).json({
            success: true,
            message: "API is working correctly!",
            data: {
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                database: {
                    status: dbStatus,
                    message: dbMessage,
                },
                environment: envInfo,
                endpoints: {
                    auth: {
                        signup: "POST /api/auth/signup",
                        login: "POST /api/auth/login",
                        refresh: "POST /api/auth/refresh",
                        logout: "POST /api/auth/logout",
                    },
                    user: {
                        profile: "GET /api/user/profile (protected)",
                    },
                    test: "GET /api/test",
                },
                version: "1.0.0",
            },
        })
    } catch (error) {
        console.error("Test API error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message,
            timestamp: new Date().toISOString(),
        })
    }
}
