const validator = require("validator")

function validateEmail(email) {
  return validator.isEmail(email)
}

function validatePassword(password) {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
  return passwordRegex.test(password)
}

function validateName(name) {
  return name && name.trim().length >= 2 && name.trim().length <= 50
}

function sanitizeInput(input) {
  return validator.escape(input.trim())
}

function validateDesignName(name) {
  return typeof name === "string" && name.trim().length >= 1 && name.trim().length <= 100
}

function validateDesignData(data) {
  if (!data || typeof data !== "object") return false

  // Check required fields
  if (!data.selectedTemplate || typeof data.selectedTemplate !== "string") return false
  if (!Array.isArray(data.logos)) return false
  if (!data.canvasSize || typeof data.canvasSize !== "object") return false
  if (typeof data.canvasSize.width !== "number" || typeof data.canvasSize.height !== "number") return false

  return true
}

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  sanitizeInput,
  validateDesignName,
  validateDesignData
}
