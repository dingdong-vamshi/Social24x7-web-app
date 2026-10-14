import type { SupabaseClient } from '@supabase/supabase-js'

// Deduplicate React StrictMode's effects without retaining credentials. A page
// reload starts a new exchange, so used links cannot authorize another reset.
const exchanges = new WeakMap<SupabaseClient, Map<string, Promise<string>>>()
export function validateRecoveryLink(client: SupabaseClient, href: string): Promise<string> {
  const url = new URL(href)
  const code = url.searchParams.get('code')
  if (!code || url.searchParams.has('error') || url.hash) return Promise.reject(new Error('Invalid recovery link'))
  let pending = exchanges.get(client)
  if (!pending) { pending = new Map(); exchanges.set(client, pending) }
  const existing = pending.get(code)
  if (existing) return existing
  const exchange = (async () => {
    // URL auto-detection is disabled on this route. An existing normal session
    // is never evidence that a recovery link was successfully verified.
    const result = await client.auth.exchangeCodeForSession(code)
    const data = result.data as typeof result.data & { redirectType?: string | null }
    if (result.error || !data.session || data.redirectType !== 'recovery') throw new Error('Invalid recovery link')
    const verified = await client.auth.getUser()
    if (verified.error || !verified.data.user || verified.data.user.id !== data.session.user.id || verified.data.user.app_metadata?.account_type === 'business_employee') throw new Error('Invalid recovery account')
    return verified.data.user.id
  })()
  pending.set(code, exchange)
  return exchange
}
