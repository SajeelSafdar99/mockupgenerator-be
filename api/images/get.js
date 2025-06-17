const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")

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
        const { id } = req.query

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Image ID is required",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Get image
        const image = await db.collection("user_images").findOne({
            _id: new require("mongodb").ObjectId(id),
            userId: new require("mongodb").ObjectId(req.user.id),
        })

        if (!image) {
            return res.status(404).json({
                success: false,
                message: "Image not found",
            })
        }

        res.status(200).json({
            success: true,
            message: "Image retrieved successfully",
            data: {
                id: image._id,
                imageData: image.imageData,
                imageType: image.imageType,
                metadata: image.metadata,
                createdAt: image.createdAt,
                updatedAt: image.updatedAt,
            },
        })
    } catch (error) {
        console.error("Get image error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
