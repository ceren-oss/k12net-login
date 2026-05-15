import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ggfipvqblkfzysvftkcd.supabase.co'
const supabaseKey = 'sb_publishable_NJiLNbPrqjzLq9OnaqBzNg_e9aJlzAo'

export const supabase = createClient(supabaseUrl, supabaseKey)