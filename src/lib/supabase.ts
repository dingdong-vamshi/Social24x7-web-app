import { createClient } from '@supabase/supabase-js'
import { isAuthOrigin } from './domains'

export const expectedProjectRef = 'kcuxyxqtfkxrbtmugjsn'
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)?.trim()
const validUrl = url === `https://${expectedProjectRef}.supabase.co`
// Reject secret keys and legacy privileged JWTs before creating a browser client.
function isPublicKey(value: string | undefined) {
  if (!value) return false
  if (value.startsWith('sb_publishable_')) return true
  try { return JSON.parse(atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon' } catch { return false }
}
export const supabaseConfigured = Boolean(validUrl && isPublicKey(key))
export const supabase = supabaseConfigured ? createClient(url!, key!, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: isAuthOrigin(window.location.origin, import.meta.env.DEV), flowType: 'pkce' },
}) : null
export function requireSupabase() {
  if (!supabase) throw new Error('Account services are unavailable. Please try again later.')
  return supabase
}
