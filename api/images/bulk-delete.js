const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")

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
        const { imageIds } = req.body

        if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Image IDs array is required",
            })
        }

        // Validate all IDs are valid ObjectIds
        const validIds = imageIds.filter((id) => {
            try {
                new require("mongodb").ObjectId(id)
                return true
            } catch {
                return false
            }
        })

        if (validIds.length !== imageIds.length) {
            return res.status(400).json({
                success: false,
                message: "Some image IDs are invalid",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Delete images (only if they belong to the user)
        const result = await db.collection("user_images").deleteMany({
            _id: { $in: validIds.map((id) => new require("mongodb").ObjectId(id)) },
            userId: new require("mongodb").ObjectId(req.user.id),
        })

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} images deleted successfully`,
            data: {
                deletedCount: result.deletedCount,
                requestedCount: imageIds.length,
            },
        })
    } catch (error) {
        console.error("Bulk delete images error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
