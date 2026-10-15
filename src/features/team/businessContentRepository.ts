import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid } from '../chat/repository'

export type BusinessSharedContent =
  | { type: 'attachment'; url: string; filename: string; media: 'image' | 'video' | 'audio' | 'file' }
  | { type: 'product'; title: string; priceMinor: number; currency: string }
  | { type: 'order'; id: string; status: string; items: Array<{ title: string; quantity: number }> }
  | { type: 'post'; caption: string }

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown) => typeof value === 'string' ? value : ''

/** Existing authenticated RLS only. No service key, new grant or payload URL fallback. */
export async function readBusinessSharedContent(client: SupabaseClient, store: string, conversation: string, message: string): Promise<BusinessSharedContent> {
  if (![store, conversation, message].every(isUuid)) throw new Error('Shared content is unavailable.')
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
