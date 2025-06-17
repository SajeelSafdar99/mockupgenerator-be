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
        const { type, page = 1, limit = 20 } = req.query

        // Connect to database
        const { db } = await connectToDatabase()

        // Build query
        const query = { userId: new require("mongodb").ObjectId(req.user.id) }
        if (type && ["logo", "mockup"].includes(type)) {
            query.imageType = type
        }

        // Calculate pagination
        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

        // Get images with pagination
        const images = await db
            .collection("user_images")
            .find(query, {
                projection: {
                    imageData: 0, // Exclude large image data from list
                },
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number.parseInt(limit))
            .toArray()

        // Get total count
        const totalCount = await db.collection("user_images").countDocuments(query)

        res.status(200).json({
            success: true,
            message: "Images retrieved successfully",
            data: {
                images: images.map((img) => ({
                    id: img._id,
                    imageType: img.imageType,
                    metadata: img.metadata,
                    createdAt: img.createdAt,
                    updatedAt: img.updatedAt,
                })),
                pagination: {
                    currentPage: Number.parseInt(page),
                    totalPages: Math.ceil(totalCount / Number.parseInt(limit)),
                    totalCount,
                    hasNext: skip + Number.parseInt(limit) < totalCount,
                    hasPrev: Number.parseInt(page) > 1,
                },
            },
        })
    } catch (error) {
        console.error("List images error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
        })
    }
}
