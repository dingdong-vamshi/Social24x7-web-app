import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '../chat/repository'

export type BusinessSharedContent =
  | { type: 'attachment'; url: string; filename: string; media: 'image' | 'video' | 'audio' | 'file' }
  | { type: 'product'; title: string; priceMinor: number; currency: string }
  | { type: 'order'; id: string; status: string; items: Array<{ title: string; quantity: number }> }
  | { type: 'post'; caption: string }
  | { type: 'detail'; title: string; lines: string[] }

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value : ''

/** Server-scoped read; legacy participant RLS is used only when the new API is absent. */
export async function readBusinessSharedContent(client: SupabaseClient, store: string, conversation: string, message: string): Promise<BusinessSharedContent> {
  if (![store, conversation, message].every(isUuid)) throw new Error('Shared content is unavailable.')
  const scoped = await client.rpc('get_business_shared_content', { target_storefront: store, target_conversation: conversation, target_message: message })
  if (!scoped.error) {
    const data = object(scoped.data)
    if (data.type === 'attachment') {
      // Never accept a path or URL supplied by the message payload. Edge rechecks the IDs.
      const signed = await client.functions.invoke('team-media-link', { body: { storefrontId: store, conversationId: conversation, messageId: message } })
      if (signed.error || typeof signed.data?.url !== 'string' || !signed.data.url.startsWith('https://')) throw new Error('Secure media delivery is unavailable. No public fallback was used.')
      const mime = text(data.mime)
      return { type: 'attachment', url: signed.data.url, filename: text(data.filename) || 'Shared file', media: /^image\/(jpeg|png|webp|gif)$/.test(mime) ? 'image' : /^video\/(mp4|webm|quicktime)$/.test(mime) ? 'video' : /^audio\//.test(mime) ? 'audio' : 'file' }
    }
    if (data.type === 'order' && isUuid(text(data.id))) return { type: 'order', id: text(data.id), status: text(data.status), items: (Array.isArray(data.items) ? data.items : []).slice(0, 100).map(item => ({ title: text(object(item).title), quantity: Number(object(item).quantity) || 0 })) }
    if (data.type === 'product') return { type: 'product', title: text(data.title), priceMinor: Number(data.priceMinor) || 0, currency: text(data.currency) }
    if (data.type === 'post') return { type: 'post', caption: text(data.caption) }
    if (data.type === 'detail') return { type: 'detail', title: text(data.title), lines: (Array.isArray(data.lines) ? data.lines : []).filter((line): line is string => typeof line === 'string').slice(0, 100) }
    throw new Error('This shared-content format is unavailable.')
  }
  if (!['PGRST202', '42883'].includes(scoped.error.code)) throw new Error('This content is no longer available under your current conversation access.')
  // Recheck current storefront visibility, not just a previously mounted screen.
  const inbox = await client.rpc('get_business_workspace_inbox', { p_status: null }).eq('storefront_id', store)
  if (inbox.error || !inbox.data?.some((row: { storefront_id: string; conversation_id: string }) => row.storefront_id === store && row.conversation_id === conversation)) throw new Error('This conversation is no longer available to your work identity.')
  const record = await client.from('messages').select('id,kind,payload').eq('conversation_id', conversation).eq('id', message).is('deleted_at', null).maybeSingle()
  if (record.error || !record.data) throw new Error('Shared content is unavailable under your current conversation access. Text history may still be available to supervisors.')
  const payload = object(record.data.payload)
  const attachmentId = text(payload.attachment_id)
  if (isUuid(attachmentId)) {
    const attachment = await client.from('chat_attachments').select('storage_path,original_filename,mime_type').eq('id', attachmentId).eq('conversation_id', conversation).maybeSingle()
    if (attachment.error || !attachment.data) throw new Error('This attachment is unavailable or access has changed.')
    const path = text(attachment.data.storage_path)
    if (!path.startsWith(`${conversation}/`) || path.split('/').some(part => !part || part === '.' || part === '..') || /[:\\?#%]/.test(path)) throw new Error('This attachment path is unavailable.')
    const signed = await client.storage.from('chat-media').createSignedUrl(path, 60)
    if (signed.error || !signed.data?.signedUrl) throw new Error('This attachment is unavailable. No public fallback was used.')
    const mime = text(attachment.data.mime_type)
    return { type: 'attachment', url: signed.data.signedUrl, filename: text(attachment.data.original_filename) || 'Shared file', media: /^image\/(jpeg|png|webp|gif)$/.test(mime) ? 'image' : /^video\/(mp4|webm|quicktime)$/.test(mime) ? 'video' : /^audio\//.test(mime) ? 'audio' : 'file' }
  }
  if (record.data.kind === 'order' && payload.storefront_id === store && isUuid(text(payload.order_id))) {
    return { type: 'order', id: text(payload.order_id), status: text(payload.order_status) || 'Recorded order', items: (Array.isArray(payload.items) ? payload.items : []).slice(0, 100).map(value => { const item = object(value); return { title: text(item.product_title_snapshot) || text(item.title) || text(item.product_title) || 'Order item', quantity: typeof item.quantity === 'number' && Number.isFinite(item.quantity) ? item.quantity : 0 } }) }
  }
  if (record.data.kind === 'product') {
    const post = object(payload.post)
    if (isUuid(text(post.id))) return { type: 'post', caption: text(post.caption).slice(0, 5000) }
    const productId = text(payload.product_id) || text(object(payload.product).id)
    if (isUuid(productId)) {
      const product = await client.from('products').select('title,price_minor,sale_price_minor,currency').eq('id', productId).eq('storefront_id', store).maybeSingle()
      if (product.error || !product.data) throw new Error('This company product is unavailable.')
      return { type: 'product', title: product.data.title, priceMinor: product.data.sale_price_minor ?? product.data.price_minor, currency: product.data.currency }
    }
  }
  throw new Error('This shared-content format is not available in Business Work yet.')
}
