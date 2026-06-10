const { getSupabaseServerClient } = require('../_supabase')
const { clearSessionCookie, getSessionFromRequest, getSessionTokenFromRequest } = require('../_session')
const { normalizeUsername } = require('../_security')
const { isSessionTokenRevoked } = require('../_session_revocation')

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authSession = getSessionFromRequest(req)
  if (!authSession) {
    clearSessionCookie(res)
    return res.status(401).json({ error: 'Session not found' })
  }
  const rawToken = getSessionTokenFromRequest(req)
  const supabase = getSupabaseServerClient()
  try {
    const revoked = await isSessionTokenRevoked({ supabase, token: rawToken })
    if (revoked) {
      clearSessionCookie(res)
      return res.status(401).json({ error: 'Session revoked' })
    }
  } catch {}

  if (authSession.role === 'admin') {
    return res.status(200).json({
      ok: true,
      role: 'admin',
      admin: {
        username: authSession.admin?.username || 'admin',
        name: authSession.admin?.name || authSession.admin?.username || 'Admin',
        is_superuser: Boolean(authSession.admin?.is_superuser),
      }
    })
  }

  if (authSession.role !== 'dealer' || !authSession.dealer?.id) {
    clearSessionCookie(res)
    return res.status(401).json({ error: 'Invalid session' })
  }

  try {
    const { data } = await supabase
      .from('dealers')
      .select('id, name, contact, balance, username')
      .eq('id', authSession.dealer.id)
      .maybeSingle()

    const dealer = data
      ? {
        id: data.id,
        name: data.name,
        contact: data.contact,
        balance: data.balance,
        username: normalizeUsername(data.username),
      }
      : authSession.dealer

    return res.status(200).json({ ok: true, role: 'dealer', dealer })
  } catch {
    return res.status(200).json({ ok: true, role: 'dealer', dealer: authSession.dealer })
  }
}
