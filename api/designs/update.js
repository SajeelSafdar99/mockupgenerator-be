const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware } = require("../../lib/middleware")
const { ObjectId } = require("mongodb")

module.exports = async function handler(req, res) {
    // Apply CORS
    corsMiddleware(req, res, () => {})

    if (req.method !== "PUT") {
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
        const updateData = req.body

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

        // Check if design exists and belongs to user
        const existingDesign = await db.collection("designs").findOne({
            _id: new ObjectId(designId),
            userId: new ObjectId(req.user.id),
        })

        if (!existingDesign) {
            return res.status(404).json({
                success: false,
                message: "Design not found or access denied",
            })
        }

        // Prepare update document
        const updateDoc = {
            updatedAt: new Date(),
            version: existingDesign.version + 1,
        }

        // Update allowed fields
        if (updateData.name && updateData.name.trim()) {
            updateDoc.name = updateData.name.trim()
        }
        if (updateData.data) {
            updateDoc.data = updateData.data
        }
        if (updateData.thumbnail !== undefined) {
            updateDoc.thumbnail = updateData.thumbnail
        }

        // Update design
        const result = await db.collection("designs").updateOne({ _id: new ObjectId(designId) }, { $set: updateDoc })

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Design not found",
            })
        }

        // Get updated design
        const updatedDesign = await db
            .collection("designs")
            .findOne({ _id: new ObjectId(designId) }, { projection: { userId: 0 } })

        // Format response
        const formattedDesign = {
            id: updatedDesign._id.toString(),
            name: updatedDesign.name,
            data: updatedDesign.data,
            thumbnail: updatedDesign.thumbnail,
            createdAt: updatedDesign.createdAt.toISOString(),
            updatedAt: updatedDesign.updatedAt.toISOString(),
            version: updatedDesign.version,
        }

        res.status(200).json({
            success: true,
            message: "Design updated successfully",
            data: formattedDesign,
        })
    } catch (error) {
        console.error("Update design error:", error)

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
