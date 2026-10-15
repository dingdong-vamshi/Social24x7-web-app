export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const object = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
export function teamHandler(action: (token: string, body: Record<string, unknown>) => Promise<unknown>) {
  return async (request: Request) => {
    const origin = request.headers.get('origin') || ''
    const allowed = ['https://partner.social24-7.com', 'https://social24x7-web-app.vercel.app'].includes(origin)
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Access-Control-Allow-Origin': allowed ? origin : 'null', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
    const reply = (data: unknown, status: number) => new Response(JSON.stringify(data), { status, headers })
    if (!allowed) return reply({ error: 'Origin not permitted.' }, 403)
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
    if (request.method !== 'POST') return reply({ error: 'POST required.' }, 405)
    const token = request.headers.get('authorization') || ''
    if (!/^Bearer \S+$/.test(token)) return reply({ error: 'Authentication required.' }, 401)
    try {
      const reader = request.body?.getReader(); if (!reader) throw Error('Body required')
      const chunks: Uint8Array[] = []; let size = 0
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 16384) { await reader.cancel(); return reply({ error: 'Request too large.' }, 413) } chunks.push(part.value) }
      const bytes = new Uint8Array(size); let offset = 0
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
      return reply(await action(token, object(JSON.parse(new TextDecoder().decode(bytes)))), 200)
    } catch { return reply({ error: 'Action was not confirmed. Refresh the current records before retrying.' }, 400) }
  }
}
