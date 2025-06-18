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

        // Delete design (only if it belongs to the user)
        const result = await db.collection("designs").deleteOne({
            _id: new ObjectId(designId),
            userId: new ObjectId(req.user.id),
        })

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: "Design not found or access denied",
            })
        }

        res.status(200).json({
            success: true,
            message: "Design deleted successfully",
        })
    } catch (error) {
        console.error("Delete design error:", error)
        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
