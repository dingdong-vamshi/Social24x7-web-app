import type { SupabaseClient } from '@supabase/supabase-js'

export interface BuyerReturn { id: string; order_item_id: string; status: string; reason: string; details: string | null; requested_at: string }
export interface BuyerReturnItem { id: string; product_title_snapshot: string; quantity: number; return_window_ends_at: string | null; orders: { status: string } | { status: string }[] | null }
export interface BuyerReturnEvidence { id: string; return_request_id: string; file_name: string; evidence_source: string; created_at: string }
export interface BuyerReturnData { items: BuyerReturnItem[]; returns: BuyerReturn[]; evidence: BuyerReturnEvidence[] }
const deliveredStates = ['delivered', 'return_requested', 'return_approved', 'return_rejected']
export function returnEligibility(item: BuyerReturnItem, existing: BuyerReturn | undefined, now = Date.now()): string | null {
  if (existing) return 'A return request already exists for this item.'
  const order = Array.isArray(item.orders) ? item.orders[0] : item.orders
  if (!order || !deliveredStates.includes(order.status)) return 'Returns are available after delivery.'
  if (item.return_window_ends_at) {
    const end = Date.parse(item.return_window_ends_at)
    if (!Number.isFinite(end)) return 'The return deadline could not be verified. Contact support.'
    if (end < now) return 'The return window has ended.'
  }
  return null
}
const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }
export function validateReturnFile(file: Pick<File, 'size' | 'type'>) {
  if (!extensions[file.type] || !Number.isSafeInteger(file.size) || file.size < 1 || file.size > 15728640) throw new Error('Choose a JPEG, PNG, WebP, MP4, MOV or WebM file of 1 byte to 15 MiB.')
}
export class ReturnOutcomeUnknown extends Error {}
function value<T>(response: { data: T | null; error: { message: string } | null }): T {
  if (response.error) throw new Error(response.error.message)
  if (response.data === null) throw new Error('The server returned no records. Refresh and check your access.')
  return response.data
}

export function buyerReturnsRepository(client: SupabaseClient, expectedUserId: string) {
  async function owner() {
    const { data, error } = await client.auth.getUser()
    if (error || !data.user) throw new Error('Sign in again to manage your returns.')
    if (data.user.id !== expectedUserId) throw new Error('Your signed-in account changed. Reload the order before continuing.')
    return data.user.id
  }
  async function load(orderId: string): Promise<BuyerReturnData> {
    const id = await owner()
    const [items, requests] = await Promise.all([
      client.from('order_items').select('id,product_title_snapshot,quantity,return_window_ends_at,orders!inner(status)', { count: 'exact' }).eq('order_id', orderId).eq('buyer_id', id).order('id').limit(500),
      client.from('return_requests').select('id,order_item_id,status,reason,details,requested_at', { count: 'exact' }).eq('order_id', orderId).eq('buyer_id', id).order('requested_at', { ascending: false }).limit(500),
    ])
    const itemRows = value(items) as unknown as BuyerReturnItem[], returnRows = value(requests) as BuyerReturn[]
    if ((items.count ?? itemRows.length) > itemRows.length || (requests.count ?? returnRows.length) > returnRows.length) throw new Error('This order is too large to display completely. Contact support before requesting a return.')
    // Read only the buyer's return evidence, not other buyers' or sellers' private files.
    const evidence = returnRows.length ? value(await client.from('commerce_order_evidence').select('id,return_request_id,file_name,evidence_source,created_at').eq('order_id', orderId).eq('owner_id', id).eq('evidence_kind', 'return').in('return_request_id', returnRows.map(r => r.id)).order('created_at', { ascending: false }).limit(500)) as BuyerReturnEvidence[] : []
    return { items: itemRows, returns: returnRows, evidence }
  }
  return {
    load,
    async submit(orderId: string, itemId: string, reason: string, details: string) {
      if (!reason.trim()) throw new Error('Describe why you are requesting a return.')
      const data = await load(orderId)
      const item = data.items.find(i => i.id === itemId)
      if (!item) throw new Error('This order item is not available to your buyer account.')
      const blocked = returnEligibility(item, data.returns.find(r => r.order_item_id === itemId))
      if (blocked) throw new Error(blocked)
      await owner()
      let result
      try { result = await client.rpc('submit_creator_commerce_return', { p_order_item_id: itemId, p_reason: reason.trim(), p_details: details.trim() || null }) }
      catch (cause) { throw new ReturnOutcomeUnknown('Submission could not be confirmed. Refresh the return list before trying again; the request may already exist.', { cause }) }
      if (result.error && !result.error.code) throw new ReturnOutcomeUnknown('Submission could not be confirmed. Refresh the return list before trying again.')
      if (!result.error && (!result.data || typeof result.data.id !== 'string')) throw new ReturnOutcomeUnknown('The server did not return a confirmed request. Refresh the return list before trying again.')
      return value(result) as BuyerReturn
    },
    async upload(orderId: string, itemId: string, requestId: string, file: File) {
      validateReturnFile(file)
      const data = await load(orderId)
      if (!data.returns.some(r => r.id === requestId && r.order_item_id === itemId && ['submitted', 'under_review'].includes(r.status))) throw new Error('Evidence can only be added to your open return request.')
      const id = await owner()
      const payload = value(await client.rpc('begin_uploaded_commerce_evidence_capture', { p_order_id: orderId, p_order_item_id: itemId, p_evidence_kind: 'return', p_return_request_id: requestId }))
      const intent = (Array.isArray(payload) ? payload[0] : payload) as { intent_id: string; path_prefix: string }
      if (!intent?.intent_id || !intent.path_prefix?.startsWith(`${id}/orders/${orderId}/return/${requestId}/`) || intent.path_prefix.split('/').some(s => s === '..' || s === '.')) throw new Error('The server did not return a valid return-evidence upload intent.')
      const path = `${intent.path_prefix}.${extensions[file.type]}`
      await owner()
      const uploaded = await client.storage.from('creator-commerce-private').upload(path, file, { contentType: file.type, upsert: false })
      if (uploaded.error) throw new Error(uploaded.error.message)
      try {
        await owner()
        value(await client.rpc('finalize_commerce_evidence_capture', { p_intent_id: intent.intent_id, p_storage_path: path, p_file_name: file.name, p_mime_type: file.type, p_file_size: file.size }))
      } catch (cause) {
        // Never delete a file after an uncertain finalization; a committed evidence row may reference it.
        throw new ReturnOutcomeUnknown('The file was uploaded, but evidence finalization could not be confirmed. It has been preserved. Refresh the return list and check the evidence before retrying.', { cause })
      }
    },
  }
}
