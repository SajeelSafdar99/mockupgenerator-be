const { connectToDatabase } = require("../../lib/database")
const { authenticateToken, corsMiddleware} = require("../../lib/middleware")
const multer = require("multer")
const { GridFSBucket, ObjectId } = require("mongodb")
const path = require("path")

// Configure multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Check if file is an image
        if (file.mimetype.startsWith("image/")) {
            cb(null, true)
        } else {
            cb(new Error("Only image files are allowed"), false)
        }
    },
})

// Helper function to handle multer middleware in serverless
const runMiddleware = (req, res, fn) => {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) {
                return reject(result)
            }
            return resolve(result)
        })
    })
}


module.exports = async function handler(req, res) {
    // Set CORS headers for all requests
    corsMiddleware(req, res, () => {})

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        return res.status(200).end()
    }

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
        // Run multer middleware
        await runMiddleware(req, res, upload.single("image"))

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No image file provided",
            })
        }

        // Connect to database
        const { db, client } = await connectToDatabase()

        // Create GridFS bucket for file storage
        const bucket = new GridFSBucket(db, { bucketName: "uploads" })

        // Generate unique filename
        const fileExtension = path.extname(req.file.originalname)
        const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${fileExtension}`

        // Create upload stream
        const uploadStream = bucket.openUploadStream(filename, {
            metadata: {
                userId: new ObjectId(req.user.id),
                originalName: req.file.originalname,
                contentType: req.file.mimetype,
                uploadedAt: new Date(),
            },
        })

        // Handle upload completion
        const uploadPromise = new Promise((resolve, reject) => {
            uploadStream.on("finish", () => {
                resolve(uploadStream.id)
            })
            uploadStream.on("error", reject)
        })

        // Write file to GridFS
        uploadStream.end(req.file.buffer)

        // Wait for upload to complete
        const fileId = await uploadPromise

        // Return file URL
        const fileUrl = `${process.env.BACKEND_URL || "http://localhost:3001"}/api/uploads/file/${fileId}`

        res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            data: {
                fileId: fileId.toString(),
                filename,
                originalName: req.file.originalname,
                url: fileUrl,
                size: req.file.size,
                contentType: req.file.mimetype,
            },
        })
    } catch (error) {
        console.error("Upload error:", error)

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File too large. Maximum size is 10MB.",
            })
        }

        if (error.message === "Only image files are allowed") {
            return res.status(400).json({
                success: false,
                message: "Only image files are allowed",
            })
        }

        res.status(500).json({
            success: false,
            message: "Internal server error",
            details: process.env.NODE_ENV === "development" ? error.message : undefined,
        })
    }
}
