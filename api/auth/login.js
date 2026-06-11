const { getSupabaseServerClient } = require('../_supabase')
const { createSessionToken, setSessionCookie } = require('../_session')
const { normalizeUsername, hashDealerPassword, isHashedPassword, verifyDealerPassword } = require('../_security')
const { loadAdminAccountsState, toLoginAdminAccounts } = require('../_admin_accounts')

const LOCK_WINDOW_MS = 10 * 60 * 1000
const LOCK_MAX_ATTEMPTS = 5
const LOCK_DURATION_MS = 10 * 60 * 1000
const LOCK_STORE_KEY = '__KK_LOGIN_LOCK_STORE__'


const getLockStore = () => {
  if (!globalThis[LOCK_STORE_KEY]) {
    globalThis[LOCK_STORE_KEY] = new Map()
  }
  return globalThis[LOCK_STORE_KEY]
}

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

const getLockKey = (username, req) => `${normalizeUsername(username)}::${getClientIp(req)}`

const getCurrentLock = (key) => {
  const now = Date.now()
  const store = getLockStore()
  const record = store.get(key)
  if (!record) return 0
  if (record.lockedUntil && record.lockedUntil > now) return record.lockedUntil
  if (record.lockedUntil && record.lockedUntil <= now) {
    store.delete(key)
  }
  return 0
}

const registerFailedAttempt = (key) => {
  const now = Date.now()
  const store = getLockStore()
  const record = store.get(key)
  const inWindow = record?.lastFailedAt && (now - record.lastFailedAt) < LOCK_WINDOW_MS
  const failedCount = inWindow ? (record.failedCount || 0) + 1 : 1
  const lockedUntil = failedCount >= LOCK_MAX_ATTEMPTS ? now + LOCK_DURATION_MS : 0
  store.set(key, { failedCount: lockedUntil ? 0 : failedCount, lastFailedAt: now, lockedUntil })
  return lockedUntil
}

const clearLock = (key) => {
  getLockStore().delete(key)
}

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { username = '', password = '' } = parseBody(req)
  const rawUsername = String(username || '').trim()
  const normalizedUsername = normalizeUsername(rawUsername)
  if (!rawUsername || !password) {
    return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' })
  }

  const lockKey = getLockKey(rawUsername, req)
  const lockedUntil = getCurrentLock(lockKey)
  if (lockedUntil) {
    return res.status(429).json({ error: 'Çok fazla hatalı giriş denemesi.', lockedUntil })
  }


  try {
    const supabase = getSupabaseServerClient()
    const { accounts: adminAccounts } = await loadAdminAccountsState(supabase)
    const adminAccount = toLoginAdminAccounts(adminAccounts)
      .filter(account => account.username === normalizedUsername && account.is_active !== false)
      .find(account => verifyDealerPassword(account.username, password, account.password))

    if (adminAccount) {
      const adminPayload = {
        username: adminAccount.username,
        name: adminAccount.name,
        is_superuser: Boolean(adminAccount.is_superuser),
      }
      const token = createSessionToken({ role: 'admin', admin: adminPayload })
      setSessionCookie(res, token)
      clearLock(lockKey)
      return res.status(200).json({ ok: true, role: 'admin', admin: adminPayload })
    }
    const usernameCandidates = [...new Set([rawUsername, normalizedUsername].filter(Boolean))]
    const { data, error } = await supabase
      .from('dealers')
      .select('id, name, contact, balance, username, password_hash')
      .in('username', usernameCandidates)
      .limit(5)

    const dealer = (data || []).find(row => normalizeUsername(row.username) === normalizedUsername) || (data || [])[0]
    if (error || !dealer) {
      const nextLock = registerFailedAttempt(lockKey)
      if (nextLock) return res.status(429).json({ error: 'Çok fazla hatalı giriş denemesi.', lockedUntil: nextLock })
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' })
    }

    const accountUsername = normalizeUsername(dealer.username)
    const passwordOk = verifyDealerPassword(accountUsername, password, dealer.password_hash)
    if (!passwordOk) {
      const nextLock = registerFailedAttempt(lockKey)
      if (nextLock) return res.status(429).json({ error: 'Çok fazla hatalı giriş denemesi.', lockedUntil: nextLock })
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' })
    }

    const needsMigration = !isHashedPassword(dealer.password_hash) || dealer.username !== accountUsername
    if (needsMigration) {
      await supabase
        .from('dealers')
        .update({ username: accountUsername, password_hash: hashDealerPassword(accountUsername, password) })
        .eq('id', dealer.id)
    }

    const safeDealer = {
      id: dealer.id,
      name: dealer.name,
      contact: dealer.contact,
      balance: dealer.balance,
      username: accountUsername,
    }
    const token = createSessionToken({ role: 'dealer', dealer: safeDealer })
    setSessionCookie(res, token)
    clearLock(lockKey)
    return res.status(200).json({ ok: true, role: 'dealer', dealer: safeDealer })
  } catch (e) {
    return res.status(500).json({ error: 'Giriş servisi hatası.' })
  }
}
