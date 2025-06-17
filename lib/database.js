const { MongoClient } = require("mongodb")

let cachedClient = null
let cachedDb = null

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  await client.connect()
  const db = client.db(process.env.DB_NAME || "authdb")

  cachedClient = client
  cachedDb = db

  return { client, db }
}

module.exports = { connectToDatabase }
