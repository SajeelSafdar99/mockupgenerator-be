const { MongoClient } = require("mongodb")

let cachedClient = null
let cachedDb = null

async function connectToDatabase() {
  // Check if we have cached connections
  if (cachedClient && cachedDb) {
    try {
      // Test the connection
      await cachedClient.db().admin().ping()
      return { client: cachedClient, db: cachedDb }
    } catch (error) {
      console.log("Cached connection failed, creating new connection")
      cachedClient = null
      cachedDb = null
    }
  }

  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not set")
  }

  console.log("Creating new MongoDB Atlas connection...")

  try {
    // MongoDB Atlas optimized connection options
    const client = new MongoClient(process.env.MONGODB_URI, {
      // Atlas-specific options
      useNewUrlParser: true,
      useUnifiedTopology: true,

      // Connection pool settings for serverless
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,

      // Timeout settings for Atlas
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds

      // Atlas SSL/TLS (automatically handled by Atlas URI)
      ssl: true,

      // Retry settings
      retryWrites: true,
      retryReads: true,

      // Compression for better performance
      compressors: ["zlib"],

      // Atlas monitoring
      monitorCommands: false,
    })

    await client.connect()
    console.log("MongoDB Atlas connected successfully")

    const db = client.db(process.env.DB_NAME || "authdb")

    // Test database access with Atlas
    await db.admin().ping()
    console.log("Atlas database ping successful")

    // Create indexes for better performance (Atlas optimized)
    try {
      // User indexes
      await db.collection("users").createIndex({ email: 1 }, { unique: true, background: true })

      // Refresh token indexes
      await db.collection("refresh_tokens").createIndex({ token: 1 }, { background: true })
      await db.collection("refresh_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })

      // Design indexes
      await db.collection("designs").createIndex({ userId: 1, updatedAt: -1 }, { background: true })
      await db.collection("designs").createIndex({ userId: 1, name: 1 }, { unique: true, background: true })
      await db.collection("designs").createIndex({ userId: 1, createdAt: -1 }, { background: true })
      await db.collection("designs").createIndex({ isPublic: 1, updatedAt: -1 }, { background: true })

      console.log("Atlas indexes created successfully")
    } catch (indexError) {
      console.log("Index creation skipped (may already exist):", indexError.message)
    }

    cachedClient = client
    cachedDb = db

    return { client, db }
  } catch (error) {
    console.error("MongoDB Atlas connection error:", {
      message: error.message,
      code: error.code,
      name: error.name,
      codeName: error.codeName,
    })

    // Atlas-specific error messages
    if (error.message.includes("authentication failed")) {
      throw new Error("MongoDB Atlas authentication failed. Check username/password in connection string.")
    }
    if (error.message.includes("network timeout")) {
      throw new Error("MongoDB Atlas network timeout. Check if IP is whitelisted.")
    }
    if (error.message.includes("ENOTFOUND")) {
      throw new Error("MongoDB Atlas cluster not found. Check connection string.")
    }

    throw error
  }
}

module.exports = { connectToDatabase }
