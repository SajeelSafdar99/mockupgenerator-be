const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")

module.exports = async function handler(req, res) {
    // Apply CORS
    corsMiddleware(req, res, () => {})

    if (req.method !== "POST") {
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
        const { imageData, imageType, metadata } = req.body

        // Validate input
        if (!imageData || !imageType) {
            return res.status(400).json({
                success: false,
                message: "Image data and type are required",
            })
        }

        // Validate image type
        if (!["logo", "mockup"].includes(imageType)) {
            return res.status(400).json({
                success: false,
                message: "Invalid image type. Must be 'logo' or 'mockup'",
            })
        }

        // Validate base64 image data
        if (!imageData.startsWith("data:image/")) {
            return res.status(400).json({
                success: false,
                message: "Invalid image data format",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Create image record
        const imageRecord = {
            userId: new require("mongodb").ObjectId(req.user.id),
            imageData: imageData, // Store base64 data (in production, use cloud storage)
            imageType: imageType,
            metadata: metadata || {},
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        const result = await db.collection("user_images").insertOne(imageRecord)

        res.status(201).json({
            success: true,
            message: "Image saved successfully",
            data: {
                imageId: result.insertedId,
                createdAt: imageRecord.createdAt,
            },
        })
    } catch (error) {
        console.error("Save image error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
