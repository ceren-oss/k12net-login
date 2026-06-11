const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ggfipvqblkfzysvftkcd.supabase.co'
const SUPABASE_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_SERVICE_KEY
  || process.env.SUPABASE_ANON_KEY
  || 'sb_publishable_NJiLNbPrqjzLq9OnaqBzNg_e9aJlzAo'

let cachedClient = null

const getSupabaseServerClient = () => {
  if (!cachedClient) {
    cachedClient = createClient(SUPABASE_URL, SUPABASE_SERVER_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  }
  return cachedClient
}

module.exports = {
  getSupabaseServerClient,
}
