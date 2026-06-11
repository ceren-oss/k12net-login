const crypto = require('crypto')
const { normalizeUsername } = require('./_security')

const PASSWORD_RESET_TTL_MINUTES = parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10) || 30
const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000
const PASSWORD_RESET_SECRET = String(process.env.PASSWORD_RESET_SECRET || process.env.SESSION_SECRET || process.env.AUTH_SESSION_SECRET || 'kk-reset-secret').trim()

const createPasswordResetToken = () => crypto.randomBytes(32).toString('base64url')

const hashPasswordResetToken = (username, token) => {
  const normalizedUsername = normalizeUsername(username || '')
  return crypto.createHash('sha256').update(`${normalizedUsername}::${String(token || '')}::${PASSWORD_RESET_SECRET}`).digest('hex')
}

module.exports = {
  PASSWORD_RESET_TTL_MINUTES,
  PASSWORD_RESET_TTL_MS,
  createPasswordResetToken,
  hashPasswordResetToken,
}
