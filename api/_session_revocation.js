const crypto = require('crypto')

const REVOCATION_USERNAME_PREFIX = '__admin__session__'
const REVOCATION_TAX_NO = '__SESSION_REVOKED__'

const hashSessionToken = (token = '') => {
  if (!token) return ''
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

const getRevocationUsername = (tokenHash) => `${REVOCATION_USERNAME_PREFIX}${tokenHash}`

const revokeSessionToken = async ({ supabase, token, authSession = null }) => {
  const tokenHash = hashSessionToken(token)
  if (!supabase || !tokenHash) return false
  const username = getRevocationUsername(tokenHash)
  const { data: existing } = await supabase
    .from('dealers')
    .select('id')
    .eq('username', username)
    .maybeSingle()
  if (existing?.id) return true
  const { error } = await supabase.from('dealers').insert([{
    username,
    name: 'session-revoked',
    city: '__system__',
    contact: 'system',
    phone: '',
    email: '',
    tax_no: REVOCATION_TAX_NO,
    tax_office: '',
    address: JSON.stringify({
      token_hash: tokenHash,
      role: authSession?.role || null,
      exp: authSession?.exp || null,
      revoked_at: new Date().toISOString(),
    }),
    password_hash: '',
    credit_limit: 0,
    balance: 0,
  }])
  return !error
}

const isSessionTokenRevoked = async ({ supabase, token }) => {
  const tokenHash = hashSessionToken(token)
  if (!supabase || !tokenHash) return false
  const { data, error } = await supabase
    .from('dealers')
    .select('id')
    .eq('username', getRevocationUsername(tokenHash))
    .eq('tax_no', REVOCATION_TAX_NO)
    .maybeSingle()
  if (error) return false
  return Boolean(data?.id)
}

module.exports = {
  revokeSessionToken,
  isSessionTokenRevoked,
}