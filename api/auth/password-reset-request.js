const { getSupabaseServerClient } = require('../_supabase')
const { normalizeUsername } = require('../_security')
const { loadAdminAccountsState, persistAdminAccountSnapshot } = require('../_admin_accounts')
const { PASSWORD_RESET_TTL_MINUTES, PASSWORD_RESET_TTL_MS, createPasswordResetToken, hashPasswordResetToken } = require('../_password_reset')
const { isPasswordResetMailerConfigured, sendPasswordResetEmail } = require('../_mailer')

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}

const getBaseUrl = (req) => {
  const configured = String(process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || process.env.RESET_PASSWORD_BASE_URL || '').trim()
  if (configured) return configured.replace(/\/+$/, '')
  const host = req.headers?.host ? `https://${req.headers.host}` : 'https://bayi.kesifkutusu.com.tr'
  return host.replace(/\/+$/, '')
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isPasswordResetMailerConfigured()) {
    return res.status(503).json({ error: 'Reset mail servisi henüz yapılandırılmadı.' })
  }

  const body = parseBody(req)
  const identifier = String(body.identifier || '').trim()
  if (!identifier) return res.status(400).json({ error: 'Kullanıcı adı veya e-posta zorunludur.' })

  try {
    const supabase = getSupabaseServerClient()
    const { accounts } = await loadAdminAccountsState(supabase)
    const normalizedIdentifier = normalizeUsername(identifier)
    const emailIdentifier = identifier.toLowerCase()
    const account = accounts.find(item => item.is_active !== false && (
      item.username === normalizedIdentifier ||
      (item.email && String(item.email).toLowerCase() === emailIdentifier)
    ))

    // Hesap var/yok bilgisini dışarı sızdırmamak için aynı yanıt deseni korunur.
    if (!account || !account.email) {
      return res.status(200).json({ ok: true, message: 'Hesap bulunduysa sıfırlama maili gönderilecektir.' })
    }

    const token = createPasswordResetToken()
    const resetTokenHash = hashPasswordResetToken(account.username, token)
    const resetTokenExp = Date.now() + PASSWORD_RESET_TTL_MS
    const nextAccount = { ...account, reset_token_hash: resetTokenHash, reset_token_exp: resetTokenExp }
    await persistAdminAccountSnapshot({
      supabase,
      account: nextAccount,
      changeType: 'password_reset_requested',
      actor: { username: 'system', name: 'System Password Reset' },
    })

    const baseUrl = getBaseUrl(req)
    const resetUrl = `${baseUrl}/?reset_token=${encodeURIComponent(token)}&user=${encodeURIComponent(account.username)}`
    await sendPasswordResetEmail({
      to: account.email,
      recipientName: account.name || account.username,
      resetUrl,
      expiresMinutes: PASSWORD_RESET_TTL_MINUTES,
    })

    return res.status(200).json({ ok: true, message: 'Hesap bulunduysa sıfırlama maili gönderilecektir.' })
  } catch (e) {
    console.error('password reset request error', e)
    return res.status(500).json({ error: 'Şifre sıfırlama maili gönderilemedi.' })
  }
}
