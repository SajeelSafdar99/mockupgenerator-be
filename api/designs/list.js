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
        const { page = 1, limit = 10, search = "" } = req.query

        // Connect to database
        const { db } = await connectToDatabase()

        // Build query
        const query = {
            userId: new ObjectId(req.user.id),
        }

        // Add search filter if provided
        if (search.trim()) {
            query.name = { $regex: search.trim(), $options: "i" }
        }

        // Calculate pagination
        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

        // Get designs with pagination
        const designs = await db
            .collection("designs")
            .find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(Number.parseInt(limit))
            .project({
                name: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                version: 1,
                data: 1, // Include full data for frontend compatibility
            })
            .toArray()

        // Get total count for pagination
        const totalCount = await db.collection("designs").countDocuments(query)

        // Format response
        const formattedDesigns = designs.map((design) => ({
            id: design._id.toString(),
            name: design.name,
            data: design.data,
            thumbnail: design.thumbnail,
            createdAt: design.createdAt.toISOString(),
            updatedAt: design.updatedAt.toISOString(),
            version: design.version,
        }))

        res.status(200).json({
            success: true,
            message: "Designs retrieved successfully",
            data: {
                designs: formattedDesigns,
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
        console.error("List designs error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
