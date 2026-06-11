const { getSupabaseServerClient } = require('../_supabase')
const { getSessionFromRequest } = require('../_session')
const { normalizeUsername, hashDealerPassword, isHashedPassword } = require('../_security')
const {
  getDefaultAdminUsername,
  loadAdminAccountsState,
  sanitizeAdminAccountForClient,
  persistAdminAccountSnapshot,
} = require('../_admin_accounts')

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}


const hasActiveSuperUser = (accounts = []) => accounts.some(account => account.is_active && account.is_superuser)

const sortAccounts = (accounts = []) => {
  return [...accounts].sort((a, b) => {
    if (a.is_superuser !== b.is_superuser) return a.is_superuser ? -1 : 1
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return String(a.username || '').localeCompare(String(b.username || ''), 'tr')
  })
}


module.exports = async (req, res) => {
  const authSession = getSessionFromRequest(req)
  if (!authSession || authSession.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!authSession.admin?.is_superuser) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { accounts } = await loadAdminAccountsState(supabase)
    const defaultAdminUsername = getDefaultAdminUsername()

    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        users: sortAccounts(accounts).map(account => sanitizeAdminAccountForClient(account)),
      })
    }

    if (req.method !== 'POST' && req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, POST, PATCH')
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const body = parseBody(req)

    if (req.method === 'POST') {
      const username = normalizeUsername(body.username || '')
      const name = String(body.name || '').trim() || username
      const email = String(body.email || '').trim().toLowerCase()
      const rawPassword = String(body.password || '')
      if (!username || !rawPassword) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre zorunludur.' })
      }
      if (accounts.some(account => account.username === username)) {
        return res.status(409).json({ error: 'Bu kullanıcı adı zaten tanımlı.' })
      }
      const nextAccount = {
        username,
        name,
        email,
        password_hash: isHashedPassword(rawPassword) ? rawPassword : hashDealerPassword(username, rawPassword),
        is_superuser: Boolean(body.is_superuser),
        is_active: true,
      }
      if (username === defaultAdminUsername) {
        nextAccount.is_superuser = true
        nextAccount.is_active = true
      }
      await persistAdminAccountSnapshot({
        supabase,
        account: nextAccount,
        changeType: 'created',
        actor: authSession.admin,
      })
      const nextUsers = sortAccounts([...accounts, nextAccount]).map(account => sanitizeAdminAccountForClient(account))
      return res.status(200).json({ ok: true, users: nextUsers })
    }

    const username = normalizeUsername(body.username || '')
    if (!username) return res.status(400).json({ error: 'Kullanıcı adı zorunludur.' })
    const currentAccount = accounts.find(account => account.username === username)
    if (!currentAccount) return res.status(404).json({ error: 'Admin kullanıcı bulunamadı.' })

    const nextAccount = { ...currentAccount }
    if (body.name !== undefined) {
      const nextName = String(body.name || '').trim()
      if (nextName) nextAccount.name = nextName
    }
    if (body.email !== undefined) {
      nextAccount.email = String(body.email || '').trim().toLowerCase()
    }
    if (body.password !== undefined) {
      const rawPassword = String(body.password || '')
      if (rawPassword.trim()) {
        nextAccount.password_hash = isHashedPassword(rawPassword) ? rawPassword : hashDealerPassword(username, rawPassword)
      }
    }
    if (nextAccount.password_hash && !isHashedPassword(nextAccount.password_hash)) {
      nextAccount.password_hash = hashDealerPassword(username, nextAccount.password_hash)
    }
    if (body.is_superuser !== undefined) nextAccount.is_superuser = Boolean(body.is_superuser)
    if (body.is_active !== undefined) nextAccount.is_active = Boolean(body.is_active)

    if (username === defaultAdminUsername) {
      nextAccount.is_superuser = true
      nextAccount.is_active = true
    }

    const nextAccounts = accounts.map(account => account.username === username ? nextAccount : account)
    if (!hasActiveSuperUser(nextAccounts)) {
      return res.status(400).json({ error: 'En az bir aktif superuser bulunmalıdır.' })
    }

    await persistAdminAccountSnapshot({
      supabase,
      account: nextAccount,
      changeType: 'updated',
      actor: authSession.admin,
    })
    return res.status(200).json({
      ok: true,
      users: sortAccounts(nextAccounts).map(account => sanitizeAdminAccountForClient(account)),
    })
  } catch (e) {
    console.error('admin users api error', e)
    return res.status(500).json({ error: 'Admin ekip servisi hatası.' })
  }
}
