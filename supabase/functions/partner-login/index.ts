import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createPartnerLoginHandler } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const anon = Deno.env.get('SUPABASE_ANON_KEY')!
const options = { auth: { persistSession: false, autoRefreshToken: false } }
Deno.serve(createPartnerLoginHandler({
  async resolve(identifier, address) {
    if (url !== 'https://kcuxyxqtfkxrbtmugjsn.supabase.co' || !secret || !anon) return null
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret + ':' + address))
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    const result = await createClient(url, secret, options).rpc('resolve_partner_login', { p_identifier: identifier, p_ip_hash: hash })
    return result.error || !result.data?.email || !result.data?.user_id ? null : result.data
  },
  async verify(account, password) {
    const client = createClient(url, anon, options)
    const result = await client.auth.signInWithPassword({ email: account.email, password })
    if (result.error || !result.data.session || result.data.user.id !== account.user_id || result.data.user.app_metadata?.account_type === 'business_employee') {
      if (result.data.session) await client.auth.signOut({ scope: 'local' })
      return null
    }
    return { access_token: result.data.session.access_token, refresh_token: result.data.session.refresh_token }
  },
}))
