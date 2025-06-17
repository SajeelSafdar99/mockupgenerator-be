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

  console.log("Creating new MongoDB connection...")

  try {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })

    await client.connect()
    console.log("MongoDB connected successfully")

    const db = client.db(process.env.DB_NAME || "authdb")

    // Test database access
    await db.admin().ping()
    console.log("Database ping successful")

    cachedClient = client
    cachedDb = db

    return { client, db }
  } catch (error) {
    console.error("MongoDB connection error:", {
      message: error.message,
      code: error.code,
      name: error.name,
    })
    throw error
  }
}

module.exports = { connectToDatabase }
