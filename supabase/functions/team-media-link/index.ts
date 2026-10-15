import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createTeamMediaHandler } from './handler.ts'
const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!, secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const options = { auth: { persistSession: false, autoRefreshToken: false } }
Deno.serve(createTeamMediaHandler({
  async authorize(token, store, conversation, message) {
    if (url !== 'https://kcuxyxqtfkxrbtmugjsn.supabase.co') return null
    const client = createClient(url, anon, { ...options, global: { headers: { Authorization: token } } })
    const user = await client.auth.getUser(token.slice(7)); if (user.error || !user.data.user) return null
    const result = await client.rpc('get_business_shared_content', { target_storefront: store, target_conversation: conversation, target_message: message })
    return result.error ? null : result.data
  },
  async sign(path, seconds) {
    // Only an exact path returned by the caller-authorized RPC reaches this service client.
    const result = await createClient(url, secret, options).storage.from('chat-media').createSignedUrl(path, seconds)
    return result.error ? null : result.data.signedUrl
  },
}))
