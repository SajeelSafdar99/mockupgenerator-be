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

module.exports = {
  validateEmail,
  validatePassword,
  validateName,
  sanitizeInput,
}
