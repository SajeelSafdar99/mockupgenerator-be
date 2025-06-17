const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key"

// Generate access token (short-lived)
function generateAccessToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" })
}

// Generate refresh token (long-lived)
function generateRefreshToken(userId) {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" })
}

// Generate remember me token (very long-lived)
function generateRememberToken(userId) {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "30d" })
}

// Verify access token
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// Verify refresh token
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET)
  } catch (error) {
    return null
  }
}

// Hash password
async function hashPassword(password) {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Compare password
async function comparePassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword)
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateRememberToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashPassword,
  comparePassword,
}
