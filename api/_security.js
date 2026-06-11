const crypto = require('crypto')

const HASH_PREFIX = 'sha256$'

const normalizeUsername = (value = '') => String(value).trim().toLowerCase()

const hashDealerPassword = (username, plainPassword) => {
  const normalized = normalizeUsername(username)
  const raw = `${normalized}::${plainPassword}`
  const digest = crypto.createHash('sha256').update(raw).digest('hex')
  return `${HASH_PREFIX}${digest}`
}

const isHashedPassword = (storedValue = '') => typeof storedValue === 'string' && storedValue.startsWith(HASH_PREFIX)

const verifyDealerPassword = (username, plainPassword, storedPassword) => {
  if (!storedPassword) return false
  if (isHashedPassword(storedPassword)) {
    return hashDealerPassword(username, plainPassword) === storedPassword
  }
  return storedPassword === plainPassword
}

module.exports = {
  HASH_PREFIX,
  normalizeUsername,
  hashDealerPassword,
  isHashedPassword,
  verifyDealerPassword,
}
