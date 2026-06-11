const { getSupabaseServerClient } = require('../_supabase')
const { normalizeUsername, hashDealerPassword } = require('../_security')
const { loadAdminAccountsState, persistAdminAccountSnapshot } = require('../_admin_accounts')
const { hashPasswordResetToken } = require('../_password_reset')

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

  const body = parseBody(req)
  const username = normalizeUsername(body.username || '')
  const token = String(body.token || '').trim()
  const newPassword = String(body.new_password || '')
  if (!username || !token || !newPassword) {
    return res.status(400).json({ error: 'Eksik bilgi gönderildi.' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır.' })
  }

  try {
    const supabase = getSupabaseServerClient()
    const { accounts } = await loadAdminAccountsState(supabase)
    const currentAccount = accounts.find(account => account.username === username && account.is_active !== false)
    if (!currentAccount) return res.status(400).json({ error: 'Sıfırlama bağlantısı geçersiz.' })

    const now = Date.now()
    const expectedHash = hashPasswordResetToken(username, token)
    const validHash = String(currentAccount.reset_token_hash || '') && currentAccount.reset_token_hash === expectedHash
    const validExpiry = parseInt(currentAccount.reset_token_exp || 0, 10) > now
    if (!validHash || !validExpiry) {
      return res.status(400).json({ error: 'Sıfırlama bağlantısı geçersiz veya süresi dolmuş.' })
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
      changeType: 'password_reset_completed',
      actor: { username: 'system', name: 'System Password Reset' },
    })

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('password reset confirm error', e)
    return res.status(500).json({ error: 'Şifre sıfırlama tamamlanamadı.' })
  }
}
