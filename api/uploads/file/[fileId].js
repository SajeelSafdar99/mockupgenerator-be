const { connectToDatabase } = require("../../../lib/database")
const { GridFSBucket, ObjectId } = require("mongodb")
const {corsMiddleware} = require("../../../lib/middleware");


module.exports = async function handler(req, res) {
    // Set CORS headers for all requests
    corsMiddleware(req, res, () => {})

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
        return res.status(200).end()
    }

    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed",
        })
    }

    try {
        const { fileId } = req.query

        if (!fileId || !ObjectId.isValid(fileId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid file ID",
            })
        }

        // Connect to database
        const { db } = await connectToDatabase()

        // Create GridFS bucket
        const bucket = new GridFSBucket(db, { bucketName: "uploads" })

        // Find file metadata
        const files = await bucket.find({ _id: new ObjectId(fileId) }).toArray()

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: "File not found",
            })
        }

        const file = files[0]

        // Set appropriate headers
        res.setHeader("Content-Type", file.metadata.contentType || "application/octet-stream")
        res.setHeader("Content-Length", file.length)
        res.setHeader("Cache-Control", "public, max-age=31536000") // Cache for 1 year
        res.setHeader("ETag", file._id.toString())

        // Check if client has cached version
        const clientETag = req.headers["if-none-match"]
        if (clientETag === file._id.toString()) {
            return res.status(304).end()
        }

        // Stream file to response
        const downloadStream = bucket.openDownloadStream(new ObjectId(fileId))

        downloadStream.on("error", (error) => {
            console.error("Download stream error:", error)
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: "Error streaming file",
                })
            }
        })

        downloadStream.pipe(res)
    } catch (error) {
        console.error("File serve error:", error)
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Internal server error",
            })
        }
    }
}
