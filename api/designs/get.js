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
        const { designId } = req.query

        if (!designId) {
            return res.status(400).json({
                success: false,
                message: "Design ID is required",
            })
        }

        if (!ObjectId.isValid(designId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid design ID format",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Get design
        const design = await db.collection("designs").findOne(
            {
                _id: new ObjectId(designId),
                userId: new ObjectId(req.user.id),
            },
            { projection: { userId: 0 } },
        )

        if (!design) {
            return res.status(404).json({
                success: false,
                message: "Design not found or access denied",
            })
        }

        // Format response
        const formattedDesign = {
            id: design._id.toString(),
            name: design.name,
            data: design.data,
            thumbnail: design.thumbnail,
            createdAt: design.createdAt.toISOString(),
            updatedAt: design.updatedAt.toISOString(),
            version: design.version,
        }

        res.status(200).json({
            success: true,
            message: "Design retrieved successfully",
            data: formattedDesign,
        })
    } catch (error) {
        console.error("Get design error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
