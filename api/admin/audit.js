const { getSupabaseServerClient } = require('../_supabase')
const { getSessionFromRequest } = require('../_session')

const AUDIT_BUFFER_KEY = '__KK_ADMIN_AUDIT_BUFFER__'
const BUFFER_LIMIT = 200

const getBuffer = () => {
  if (!globalThis[AUDIT_BUFFER_KEY]) {
    globalThis[AUDIT_BUFFER_KEY] = []
  }
  return globalThis[AUDIT_BUFFER_KEY]
}

const parseBody = (req) => {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body.trim().length > 0) {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return {}
}

const getAdminFromSession = (session) => ({
  admin_username: session.admin?.username || 'admin',
  admin_name: session.admin?.name || session.admin?.username || 'Admin',
})

const sanitizeDetails = (details) => {
  if (details && typeof details === 'object') return details
  if (details === undefined || details === null) return {}
  return { value: String(details) }
}

const addToBuffer = (entry) => {
  const buffer = getBuffer()
  buffer.unshift(entry)
  if (buffer.length > BUFFER_LIMIT) buffer.pop()
}

module.exports = async (req, res) => {
  const authSession = getSessionFromRequest(req)
  if (!authSession || authSession.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  const isSuperUser = Boolean(authSession.admin?.is_superuser)

  if (req.method === 'GET') {
    if (!isSuperUser) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const limit = Math.min(parseInt(req.query?.limit || '25', 10) || 25, 100)
    try {
      const supabase = getSupabaseServerClient()
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, created_at, admin_username, admin_name, action, target, details')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return res.status(200).json({ ok: true, logs: data || [] })
    } catch {
      return res.status(200).json({ ok: true, logs: getBuffer().slice(0, limit), source: 'memory' })
    }
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const body = parseBody(req)
  const action = String(body.action || '').trim() || 'unknown_action'
  const target = body.target ? String(body.target).trim() : null
  const details = sanitizeDetails(body.details)
  const adminMeta = getAdminFromSession(authSession)
  const entry = {
    ...adminMeta,
    action,
    target,
    details,
    created_at: new Date().toISOString(),
  }

  try {
    const supabase = getSupabaseServerClient()
    const { error } = await supabase.from('admin_audit_logs').insert([entry])
    if (error) throw error
    return res.status(200).json({ ok: true })
  } catch {
    addToBuffer(entry)
    return res.status(202).json({ ok: true, buffered: true })
  }
}
