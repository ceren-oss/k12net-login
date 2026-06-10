const { getSupabaseServerClient } = require('../_supabase')
const { clearSessionCookie, getSessionFromRequest, getSessionTokenFromRequest } = require('../_session')
const { revokeSessionToken } = require('../_session_revocation')

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const authSession = getSessionFromRequest(req)
  const rawToken = getSessionTokenFromRequest(req)
  if (rawToken && authSession) {
    try {
      const supabase = getSupabaseServerClient()
      await revokeSessionToken({ supabase, token: rawToken, authSession })
    } catch {}
  }
  clearSessionCookie(res)
  return res.status(200).json({ ok: true })
}
