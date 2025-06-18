const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")
const { ObjectId } = require("mongodb")

module.exports = async function handler(req, res) {
    // Apply CORS
    corsMiddleware(req, res, () => {})

    if (req.method !== "DELETE") {
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
        const { designIds } = req.body

        if (!designIds || !Array.isArray(designIds) || designIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Design IDs array is required",
            })
        }

        // Validate all IDs
        const validIds = designIds.filter(id => ObjectId.isValid(id))
        if (validIds.length !== designIds.length) {
            return res.status(400).json({
                success: false,
                message: "One or more invalid design ID formats",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Delete designs (only if they belong to the user)
        const result = await db.collection("designs").deleteMany({
            _id: { $in: validIds.map(id => new ObjectId(id)) },
            userId: new ObjectId(req.user.id),
        })

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} design(s) deleted successfully`,
            data: {
                deletedCount: result.deletedCount,
                requestedCount: designIds.length,
            },
        })
    } catch (error) {
        console.error("Bulk delete designs error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
