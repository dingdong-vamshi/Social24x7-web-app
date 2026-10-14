export interface LoginDependencies {
  resolve: (identifier: string, address: string) => Promise<{ user_id: string; email: string } | null>
  verify: (account: { user_id: string; email: string }, password: string) => Promise<{ access_token: string; refresh_token: string } | null>
  delay?: (milliseconds: number) => Promise<void>
}
const allowed = new Set(['https://partner.social24-7.com', 'https://social24x7-web-app.vercel.app'])
const failure = { error: 'Unable to sign in with those details. Try your email and password, or use Work login for employee accounts.' }
export function createPartnerLoginHandler(deps: LoginDependencies) {
  return async (request: Request) => {
    const origin = request.headers.get('origin') ?? ''
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': allowed.has(origin) ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers })
    if (!allowed.has(origin)) return json(failure, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return json(failure, 405)
    const started = Date.now()
    const deny = async () => { await (deps.delay || (ms => new Promise(resolve => setTimeout(resolve, ms))))(Math.max(0, 800 - (Date.now() - started))); return json(failure, 400) }
    try {
      const reader = request.body?.getReader()
      if (!reader) return await deny()
      const chunks: Uint8Array[] = []; let bytes = 0
      while (true) { const item = await reader.read(); if (item.done) break; bytes += item.value.length; if (bytes > 4096) { await reader.cancel(); return await deny() } chunks.push(item.value) }
      const buffer = new Uint8Array(bytes); let offset = 0
      for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length }
      const body = JSON.parse(new TextDecoder().decode(buffer))
      if (!body || typeof body.identifier !== 'string' || typeof body.password !== 'string' || body.identifier.length > 254 || !body.password || body.password.length > 128) return await deny()
      const address = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      const account = await deps.resolve(body.identifier, address)
      if (!account) return await deny()
      const session = await deps.verify(account, body.password)
      if (!session) return await deny()
      return json(session, 200)
    } catch { return await deny() }
  }
}
