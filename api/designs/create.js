const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")
const { ObjectId } = require("mongodb")

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
        const designData = req.body

        // Validate required fields
        if (!designData.name || !designData.data) {
            return res.status(400).json({
                success: false,
                message: "Design name and data are required",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Create design document
        const newDesign = {
            name: designData.name.trim(),
            userId: new ObjectId(req.user.id),
            data: designData.data,
            thumbnail: designData.thumbnail || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
            isPublic: false,
        }

        // Insert design
        const result = await db.collection("designs").insertOne(newDesign)

        // Return created design
        const createdDesign = {
            id: result.insertedId.toString(),
            name: newDesign.name,
            data: newDesign.data,
            thumbnail: newDesign.thumbnail,
            createdAt: newDesign.createdAt.toISOString(),
            updatedAt: newDesign.updatedAt.toISOString(),
            version: newDesign.version,
        }

        res.status(201).json({
            success: true,
            message: "Design created successfully",
            data: createdDesign,
        })
    } catch (error) {
        console.error("Create design error:", error)

        // Handle duplicate name error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A design with this name already exists",
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
