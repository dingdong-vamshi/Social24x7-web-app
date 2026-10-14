const unavailable = () => { throw new Error('Production access is disabled in this isolated preview.') }
export function requireSupabase() { return { rpc: unavailable, from: unavailable, storage: { from: unavailable }, auth: { getUser: unavailable } } }
export const supabase = null
export const configured = false
