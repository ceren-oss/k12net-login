const HASH_PREFIX = 'sha256$'

export const normalizeUsername = (value = '') => String(value).trim().toLowerCase()

const toHex = (buffer) => Array.from(new Uint8Array(buffer)).map(byte => byte.toString(16).padStart(2, '0')).join('')

const fallbackHash = (value) => {
  if (typeof btoa !== 'undefined') {
    return btoa(unescape(encodeURIComponent(value)))
  }
  return value
}

export const hashDealerPassword = async (username, plainPassword) => {
  const normalized = normalizeUsername(username)
  const raw = `${normalized}::${plainPassword}`
  if (typeof window !== 'undefined' && window.crypto?.subtle && typeof TextEncoder !== 'undefined') {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
    return `${HASH_PREFIX}${toHex(digest)}`
  }
  return `${HASH_PREFIX}${fallbackHash(raw)}`
}

export const isHashedPassword = (storedValue = '') => typeof storedValue === 'string' && storedValue.startsWith(HASH_PREFIX)

export const verifyDealerPassword = async (username, plainPassword, storedPassword) => {
  if (!storedPassword) return false
  if (isHashedPassword(storedPassword)) {
    return (await hashDealerPassword(username, plainPassword)) === storedPassword
  }
  return storedPassword === plainPassword
}
