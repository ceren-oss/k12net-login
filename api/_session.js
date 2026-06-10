const crypto = require('crypto')

const COOKIE_NAME = 'kk_session'
const SESSION_TTL_SECONDS = 60 * 60 * 12
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.AUTH_SESSION_SECRET || 'kk-change-session-secret'
const SESSION_COOKIE_DOMAIN = String(process.env.SESSION_COOKIE_DOMAIN || process.env.COOKIE_DOMAIN || '').trim()
const SESSION_COOKIE_SAMESITE = String(process.env.SESSION_COOKIE_SAMESITE || 'Lax').trim()

const resolveSameSite = () => {
  const value = SESSION_COOKIE_SAMESITE.toLowerCase()
  if (value === 'strict') return 'Strict'
  if (value === 'none') return 'None'
  return 'Lax'
}

const parseCookies = (cookieHeader = '') => {
  return cookieHeader
    .split(';')
    .map(part => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const [key, ...rest] = part.split('=')
      acc[key] = rest.join('=')
      return acc
    }, {})
}

const sign = (value) => crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url')

const createSessionToken = (payload) => {
  const safePayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }
  const encoded = Buffer.from(JSON.stringify(safePayload)).toString('base64url')
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

const verifySessionToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [encoded, signature] = token.split('.')
  const expected = sign(encoded)
  if (expected.length !== signature.length) return null
  const valid = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  if (!valid) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

const setSessionCookie = (res, token) => {
  const secure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
  const sameSite = resolveSameSite()
  const parts = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    `Max-Age=${SESSION_TTL_SECONDS}`,
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Priority=High',
  ]
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`)
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

const clearSessionCookie = (res) => {
  const secure = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
  const sameSite = resolveSameSite()
  const parts = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    `SameSite=${sameSite}`,
    'Priority=High',
  ]
  if (SESSION_COOKIE_DOMAIN) parts.push(`Domain=${SESSION_COOKIE_DOMAIN}`)
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

const getSessionFromRequest = (req) => {
  const cookies = parseCookies(req.headers?.cookie || '')
  return verifySessionToken(cookies[COOKIE_NAME] || '')
}

const getSessionTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers?.cookie || '')
  return cookies[COOKIE_NAME] || ''
}

module.exports = {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
  getSessionTokenFromRequest,
}
