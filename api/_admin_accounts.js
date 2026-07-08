const { normalizeUsername } = require('./_security')

const ADMIN_ACCOUNT_AUDIT_ACTION = 'admin_account_set'
const ADMIN_ACCOUNT_STORAGE_PREFIX = '__admin__'
const ADMIN_ACCOUNT_STORAGE_TAX_NO = '__ADMIN_ACCOUNT__'

const getDefaultAdminUsername = () => normalizeUsername(process.env.ADMIN_USERNAME || process.env.REACT_APP_ADMIN_USERNAME || 'admin')
const normalizeAdminRole = (value, fallback = 'admin') => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'muhasebe') return 'muhasebe'
  return fallback === 'muhasebe' ? 'muhasebe' : 'admin'
}

const normalizeAccountRecord = (record = {}) => {
  const username = normalizeUsername(record.username || '')
  if (!username) return null
  const passwordHash = record.password_hash || record.passwordHash || record.password || ''
  const email = String(record.email || '').trim().toLowerCase()
  const resetTokenHash = String(record.reset_token_hash || record.resetTokenHash || '')
  const resetTokenExp = parseInt(record.reset_token_exp ?? record.resetTokenExp ?? 0, 10) || 0
  const isSuperUser = Boolean(record.is_superuser)
  const role = isSuperUser ? 'admin' : normalizeAdminRole(record.role, 'admin')
  return {
    username,
    name: String(record.name || record.username || username),
    email,
    password_hash: String(passwordHash || ''),
    reset_token_hash: resetTokenHash,
    reset_token_exp: resetTokenExp,
    role,
    is_superuser: isSuperUser,
    is_active: record.is_active === false ? false : true,
  }
}

const parseStorageMeta = (value) => {
  if (!value || typeof value !== 'string') return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const applyDealerStorageEvents = (accounts = [], dealerRows = []) => {
  const map = new Map()
  for (const account of accounts) {
    const normalized = normalizeAccountRecord(account)
    if (!normalized) continue
    map.set(normalized.username, normalized)
  }

  for (const row of dealerRows || []) {
    const storageUsername = normalizeUsername(row?.username || '')
    if (!storageUsername || !storageUsername.startsWith(ADMIN_ACCOUNT_STORAGE_PREFIX)) continue
    const fromPrefix = storageUsername.slice(ADMIN_ACCOUNT_STORAGE_PREFIX.length)
    const meta = parseStorageMeta(row?.address)
    const username = normalizeUsername(meta.username || fromPrefix)
    if (!username) continue
    const previous = map.get(username) || {
      username,
      name: username,
      email: '',
      password_hash: '',
      reset_token_hash: '',
      reset_token_exp: 0,
      role: 'admin',
      is_superuser: false,
      is_active: true,
    }
    const next = { ...previous }
    if (typeof meta.name === 'string' && meta.name.trim()) next.name = meta.name.trim()
    else if (typeof row?.name === 'string' && row.name.trim()) next.name = row.name.trim()
    if (typeof meta.email === 'string' && meta.email.trim()) next.email = meta.email.trim().toLowerCase()
    else if (typeof row?.email === 'string' && row.email.trim()) next.email = row.email.trim().toLowerCase()
    if (typeof row?.password_hash === 'string' && row.password_hash.trim()) next.password_hash = row.password_hash.trim()
    if (typeof meta.reset_token_hash === 'string') next.reset_token_hash = meta.reset_token_hash
    if (meta.reset_token_exp !== undefined) next.reset_token_exp = parseInt(meta.reset_token_exp, 10) || 0
    if (typeof meta.role === 'string') next.role = normalizeAdminRole(meta.role, next.role || 'admin')
    if (typeof meta.is_superuser === 'boolean') next.is_superuser = meta.is_superuser
    if (typeof meta.is_active === 'boolean') next.is_active = meta.is_active
    if (next.is_superuser) next.role = 'admin'
    map.set(username, next)
  }
  return Array.from(map.values())
}

const buildDealerStoragePayload = (account, changeType) => ({
  username: `${ADMIN_ACCOUNT_STORAGE_PREFIX}${normalizeUsername(account.username || '')}`,
  name: account.name || account.username || 'admin',
  city: '__admin__',
  contact: 'admin-account',
  phone: '',
  email: String(account.email || ''),
  tax_no: ADMIN_ACCOUNT_STORAGE_TAX_NO,
  tax_office: '',
  address: JSON.stringify({
    username: normalizeUsername(account.username || ''),
    name: account.name || account.username || 'admin',
    email: String(account.email || ''),
    reset_token_hash: String(account.reset_token_hash || ''),
    reset_token_exp: parseInt(account.reset_token_exp || 0, 10) || 0,
    role: normalizeAdminRole(account.role || 'admin'),
    is_superuser: Boolean(account.is_superuser),
    is_active: account.is_active !== false,
    change_type: changeType,
  }),
  password_hash: String(account.password_hash || ''),
  credit_limit: 0,
  balance: 0,
})

const persistAdminAccountSnapshot = async ({ supabase, account, changeType, actor }) => {
  if (!supabase) throw new Error('Supabase client required')
  const normalizedAccount = normalizeAccountRecord(account)
  if (!normalizedAccount) throw new Error('Invalid admin account')
  const actorUsername = normalizeUsername(actor?.username || 'admin') || 'admin'
  const actorName = String(actor?.name || actorUsername || 'Admin')

  const entry = {
    admin_username: actorUsername,
    admin_name: actorName,
    action: ADMIN_ACCOUNT_AUDIT_ACTION,
    target: `admin_user:${normalizedAccount.username}`,
    details: {
      username: normalizedAccount.username,
      name: normalizedAccount.name,
      email: normalizedAccount.email,
      password_hash: normalizedAccount.password_hash,
      reset_token_hash: String(normalizedAccount.reset_token_hash || ''),
      reset_token_exp: parseInt(normalizedAccount.reset_token_exp || 0, 10) || 0,
      role: normalizeAdminRole(normalizedAccount.role || 'admin'),
      is_superuser: Boolean(normalizedAccount.is_superuser),
      is_active: normalizedAccount.is_active !== false,
      change_type: changeType,
    },
  }

  const { error } = await supabase.from('admin_audit_logs').insert([entry])
  if (!error) return { storage: 'audit' }

  const fallbackPayload = buildDealerStoragePayload(normalizedAccount, changeType)
  const { data: existingStorageRow, error: lookupError } = await supabase
    .from('dealers')
    .select('id')
    .eq('username', fallbackPayload.username)
    .maybeSingle()
  if (lookupError) throw lookupError

  const { error: fallbackError } = existingStorageRow?.id
    ? await supabase.from('dealers').update(fallbackPayload).eq('id', existingStorageRow.id)
    : await supabase.from('dealers').insert([fallbackPayload])
  if (fallbackError) throw fallbackError
  return { storage: 'dealer-storage' }
}

const getAdminAccountsFromEnv = () => {
  const json = process.env.ADMIN_ACCOUNTS_JSON || process.env.ADMIN_USERS_JSON
  if (json) {
    try {
      const parsed = JSON.parse(json)
      if (Array.isArray(parsed)) {
        const accounts = parsed
          .map(item => normalizeAccountRecord({
            username: item?.username,
            name: item?.name,
            email: item?.email,
            password: item?.password,
            password_hash: item?.password_hash || item?.passwordHash,
            role: item?.role,
            is_superuser: item?.is_superuser ?? item?.isSuperuser ?? item?.role === 'superuser',
            is_active: item?.is_active,
          }))
          .filter(Boolean)
        if (accounts.length > 0) return accounts
      }
    } catch {}
  }
  const username = normalizeUsername(process.env.ADMIN_USERNAME || process.env.REACT_APP_ADMIN_USERNAME || 'admin')
  const password = process.env.ADMIN_PASSWORD || process.env.REACT_APP_ADMIN_PASSWORD || 'kesif2024'
  return [normalizeAccountRecord({ username, name: process.env.ADMIN_DISPLAY_NAME || username, email: process.env.ADMIN_EMAIL || '', password, role: 'admin', is_superuser: true })].filter(Boolean)
}

const enforceSuperuserPolicy = (accounts = []) => {
  const deduped = []
  const seen = new Set()
  for (const account of accounts) {
    const normalized = normalizeAccountRecord(account)
    if (!normalized || seen.has(normalized.username)) continue
    seen.add(normalized.username)
    deduped.push(normalized)
  }

  const defaultUsername = getDefaultAdminUsername()
  const defaultAccount = deduped.find(account => account.username === defaultUsername)
  if (defaultAccount) {
    defaultAccount.is_superuser = true
    defaultAccount.is_active = true
    defaultAccount.role = 'admin'
  }

  const hasActiveSuperUser = deduped.some(account => account.is_active && account.is_superuser)
  if (!hasActiveSuperUser) {
    const fallback = deduped.find(account => account.is_active) || deduped[0]
    if (fallback) {
      fallback.is_superuser = true
      fallback.is_active = true
      fallback.role = 'admin'
    }
  }
  deduped.forEach(account => {
    if (account.is_superuser) account.role = 'admin'
    else account.role = normalizeAdminRole(account.role, 'admin')
  })
  return deduped
}

const applyAuditEvents = (accounts = [], auditEvents = []) => {
  const map = new Map()
  for (const account of accounts) {
    const normalized = normalizeAccountRecord(account)
    if (!normalized) continue
    map.set(normalized.username, normalized)
  }

  for (const event of auditEvents || []) {
    const details = event?.details && typeof event.details === 'object' ? event.details : {}
    const username = normalizeUsername(details.username || '')
    if (!username) continue
    const previous = map.get(username) || {
      username,
      name: username,
      password_hash: '',
      reset_token_hash: '',
      reset_token_exp: 0,
      role: 'admin',
      is_superuser: false,
      is_active: true,
    }
    const next = { ...previous }
    if (typeof details.name === 'string' && details.name.trim()) next.name = details.name.trim()
    if (typeof details.email === 'string') next.email = details.email.trim().toLowerCase()
    if (typeof details.password_hash === 'string' && details.password_hash.trim()) next.password_hash = details.password_hash.trim()
    if (typeof details.reset_token_hash === 'string') next.reset_token_hash = details.reset_token_hash
    if (details.reset_token_exp !== undefined) next.reset_token_exp = parseInt(details.reset_token_exp, 10) || 0
    if (typeof details.role === 'string') next.role = normalizeAdminRole(details.role, next.role || 'admin')
    if (typeof details.is_superuser === 'boolean') next.is_superuser = details.is_superuser
    if (typeof details.is_active === 'boolean') next.is_active = details.is_active
    if (next.is_superuser) next.role = 'admin'
    map.set(username, next)
  }
  return Array.from(map.values())
}

const loadAdminAccountsState = async (supabase) => {
  const envAccounts = getAdminAccountsFromEnv()
  if (!supabase) return { accounts: enforceSuperuserPolicy(envAccounts), source: 'env' }
  let merged = envAccounts
  let source = 'env'
  try {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('created_at, details')
      .eq('action', ADMIN_ACCOUNT_AUDIT_ACTION)
      .order('created_at', { ascending: true })
      .limit(1000)
    if (!error) {
      merged = applyAuditEvents(merged, data || [])
      source = 'audit'
    }
  } catch {}

  try {
    const { data, error } = await supabase
      .from('dealers')
      .select('username, name, email, password_hash, address, tax_no')
      .eq('tax_no', ADMIN_ACCOUNT_STORAGE_TAX_NO)
      .order('created_at', { ascending: true })
      .limit(1000)
    if (!error) {
      merged = applyDealerStorageEvents(merged, data || [])
      source = source === 'env' ? 'dealer-storage' : `${source}+dealer-storage`
    }
  } catch {}

  return { accounts: enforceSuperuserPolicy(merged), source }
}

const toLoginAdminAccounts = (accounts = []) => {
  return enforceSuperuserPolicy(accounts).map(account => ({
    username: account.username,
    name: account.name || account.username,
    email: account.email || '',
    password: account.password_hash || '',
    role: normalizeAdminRole(account.role || 'admin'),
    is_superuser: Boolean(account.is_superuser),
    is_active: account.is_active !== false,
  }))
}

const sanitizeAdminAccountForClient = (account = {}) => ({
  username: normalizeUsername(account.username || ''),
  name: String(account.name || account.username || ''),
  email: String(account.email || ''),
  role: normalizeAdminRole(account.role || 'admin'),
  is_superuser: Boolean(account.is_superuser),
  is_active: account.is_active !== false,
})

module.exports = {
  ADMIN_ACCOUNT_AUDIT_ACTION,
  ADMIN_ACCOUNT_STORAGE_PREFIX,
  ADMIN_ACCOUNT_STORAGE_TAX_NO,
  getDefaultAdminUsername,
  getAdminAccountsFromEnv,
  enforceSuperuserPolicy,
  loadAdminAccountsState,
  toLoginAdminAccounts,
  sanitizeAdminAccountForClient,
  persistAdminAccountSnapshot,
}
