const { getSupabaseServerClient } = require('../_supabase')
const { getSessionFromRequest } = require('../_session')
const { normalizeUsername, verifyDealerPassword, hashDealerPassword } = require('../_security')
const { loadAdminAccountsState, persistAdminAccountSnapshot } = require('../_admin_accounts')

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

  const authSession = getSessionFromRequest(req)
  if (!authSession || authSession.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const body = parseBody(req)
  const currentPassword = String(body.current_password || '')
  const newPassword = String(body.new_password || '')
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre zorunludur.' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' })
  }

  const username = normalizeUsername(authSession.admin?.username || '')
  if (!username) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const supabase = getSupabaseServerClient()
    const { accounts } = await loadAdminAccountsState(supabase)
    const currentAccount = accounts.find(account => account.username === username && account.is_active !== false)
    if (!currentAccount) {
      return res.status(404).json({ error: 'Admin kullanıcı bulunamadı.' })
    }

    const currentStoredPassword = String(currentAccount.password_hash || '')
    const currentPasswordOk = verifyDealerPassword(username, currentPassword, currentStoredPassword)
    if (!currentPasswordOk) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı.' })
    }
    if (verifyDealerPassword(username, newPassword, currentStoredPassword)) {
      return res.status(400).json({ error: 'Yeni şifre mevcut şifreyle aynı olamaz.' })
    }

    const nextAccount = {
      ...currentAccount,
      password_hash: hashDealerPassword(username, newPassword),
      reset_token_hash: '',
      reset_token_exp: 0,
      is_active: true,
    }
    await persistAdminAccountSnapshot({
      supabase,
      account: nextAccount,
      changeType: 'password_changed_self',
      actor: authSession.admin,
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('admin password api error', e)
    return res.status(500).json({ error: 'Şifre güncellenemedi.' })
  }
}
