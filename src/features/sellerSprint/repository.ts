import type { SupabaseClient } from '@supabase/supabase-js'
import { decimalMinor, type Order } from '../../repositories/commerce'

export type OrderFilters = { start: string; end: string; minimum: string; maximum: string; currency: string; status: string; sort: 'newest' | 'oldest' | 'value_high' | 'value_low' }
export const emptyOrderFilters: OrderFilters = { start: '', end: '', minimum: '', maximum: '', currency: '', status: '', sort: 'newest' }
export function dateBounds(start: string, end: string) {
  function parse(value: string, next: boolean) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Choose a valid calendar date.')
    const date = new Date(`${value}T00:00:00`)
    if (!Number.isFinite(date.getTime()) || date.getFullYear() !== Number(value.slice(0, 4)) || date.getMonth() + 1 !== Number(value.slice(5, 7)) || date.getDate() !== Number(value.slice(8))) throw new Error('Choose a valid calendar date.')
    if (next) date.setDate(date.getDate() + 1)
    return date.toISOString()
  }
  const from = start ? parse(start, false) : null, until = end ? parse(end, true) : null
  if (start && end && start > end) throw new Error('The end date must be on or after the start date.')
  return { from, until }
}
export function validateOrderFilters(filters: OrderFilters) {
  const bounds = dateBounds(filters.start, filters.end)
  const minimum = filters.minimum ? decimalMinor(filters.minimum) : null
  const maximum = filters.maximum ? decimalMinor(filters.maximum) : null
  if (minimum !== null && maximum !== null && minimum > maximum) throw new Error('Maximum order value must be at least the minimum.')
  const currency = filters.currency.trim().toUpperCase()
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new Error('Enter a three-letter currency code, such as INR.')
  if ((minimum !== null || maximum !== null || filters.sort.startsWith('value')) && !currency) throw new Error('Choose a currency before filtering or sorting by value. Different currencies cannot be compared.')
  return { ...bounds, minimum, maximum, currency }
}
function value<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('No record returned. Refresh and check your access.')
  return result.data
}
export interface ProductSeo { brand: string | null; tags: string[] | null; search_keywords: string[] | null; seo_title: string | null; seo_description: string | null; llm_summary: string | null; updated_at: string }
export type TrafficEvent = { id: number; event_type: string; visitor_id: string | null; session_key: string; occurred_at: string }
export type TrafficOrder = { id: string; status: string; currency: string; total_minor: number; created_at: string }
export function summarizeTraffic(events: TrafficEvent[], orders: TrafficOrder[]) {
  const visitors = new Set(events.map(e => e.visitor_id ? `user:${e.visitor_id}` : e.session_key ? `session:${e.session_key}` : null).filter(Boolean))
  const views = events.filter(e => e.event_type === 'storefront_view').length
  const placed = orders.filter(o => !['draft', 'cancelled', 'refunded'].includes(o.status))
  return { visitors: visitors.size, views, productViews: events.filter(e => e.event_type === 'product_view').length, orders: placed.length, conversion: views ? placed.length / views * 100 : null, values: placed.reduce((totals, o) => { totals[o.currency] = (totals[o.currency] ?? 0) + o.total_minor; return totals }, {} as Record<string, number>) }
}
const evidenceTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm' }
export function validatePackingFile(file: File) {
  if (!evidenceTypes[file.type] || file.size < 1 || file.size > 15728640) throw new Error('Choose a JPEG, PNG, WebP, MP4, MOV or WebM file of 1 byte to 15 MiB. PDF evidence is not accepted by the finalization service.')
}
export class EvidenceOutcomeUnknown extends Error {}

export function sellerSprintRepository(client: SupabaseClient) {
  async function owner(storeId: string) {
    const auth = await client.auth.getUser()
    if (auth.error) throw new Error(auth.error.message)
    if (!auth.data.user) throw new Error('Sign in to manage your storefront.')
    value(await client.from('storefronts').select('id').eq('id', storeId).eq('owner_id', auth.data.user.id).single())
    return auth.data.user.id
  }
  return {
    async orders(storeId: string, filters: OrderFilters) {
      const f = validateOrderFilters(filters)
      let query = client.from('orders').select('id,storefront_id,status,currency,total_minor,payment_status,payment_method,created_at,order_items(id,product_title_snapshot,quantity,subtotal_minor),order_fulfillments(status,carrier,tracking_number,package_reference,customer_note)', { count: 'exact' }).eq('storefront_id', storeId)
      if (f.from) query = query.gte('created_at', f.from)
      if (f.until) query = query.lt('created_at', f.until)
      if (f.minimum !== null) query = query.gte('total_minor', f.minimum)
      if (f.maximum !== null) query = query.lte('total_minor', f.maximum)
      if (f.currency) query = query.eq('currency', f.currency)
      if (filters.status) query = query.eq('status', filters.status)
      const response = await query.order(filters.sort.startsWith('value') ? 'total_minor' : 'created_at', { ascending: filters.sort === 'oldest' || filters.sort === 'value_low' }).order('id').limit(500)
      return { rows: value(response) as unknown as Order[], count: response.count }
    },
    async productSeo(productId: string, storeId: string): Promise<ProductSeo> {
      await owner(storeId)
      return value(await client.from('products').select('brand,tags,search_keywords,seo_title,seo_description,llm_summary,updated_at').eq('id', productId).eq('storefront_id', storeId).single())
    },
    async saveProductSeo(productId: string, storeId: string, draft: ProductSeo) {
      if ((draft.brand?.trim().length ?? 0) > 120) throw new Error('Brand must be at most 120 characters.')
      await owner(storeId)
      // Whitelist metadata only. Publication, approval, stock, pricing and ownership cannot be supplied.
      return value<{ updated_at: string }>(await client.from('products').update({ brand: draft.brand?.trim() || '', tags: draft.tags ?? [], search_keywords: draft.search_keywords ?? [], seo_title: draft.seo_title?.trim() || null, seo_description: draft.seo_description?.trim() || null, llm_summary: draft.llm_summary?.trim() || null }).eq('id', productId).eq('storefront_id', storeId).eq('updated_at', draft.updated_at).select('updated_at').single())
    },
    async traffic(storeId: string, days: 7 | 14 | 30, now = new Date()) {
      await owner(storeId)
      const since = new Date(now); since.setHours(0, 0, 0, 0); since.setDate(since.getDate() - days + 1)
      const from = since.toISOString(), until = now.toISOString()
      async function read<T>(table: string, fields: string, time: string): Promise<T[]> {
        const rows: T[] = []
        for (let offset = 0; offset < 10000; offset += 500) {
          const result = await client.from(table).select(fields, { count: 'exact' }).eq('storefront_id', storeId).gte(time, from).lte(time, until).order(time).order('id').range(offset, offset + 499)
          const batch = value(result) as unknown as T[]
          if (result.count !== null && result.count > 10000) throw new Error('This period contains more than 10,000 records. Choose a shorter period; partial conversion metrics are not shown.')
          rows.push(...batch)
          if (batch.length < 500 || (result.count !== null && rows.length >= result.count)) return rows
        }
        throw new Error('The analytics result is incomplete. Choose a shorter period.')
      }
      const [events, orders] = await Promise.all([read<TrafficEvent>('storefront_events', 'id,event_type,visitor_id,session_key,occurred_at', 'occurred_at'), read<TrafficOrder>('orders', 'id,status,currency,total_minor,created_at', 'created_at')])
      return { ...summarizeTraffic(events, orders), from, until }
    },
    async uploadPacking(orderId: string, file: File) {
      validatePackingFile(file)
      const auth = await client.auth.getUser()
      if (auth.error) throw new Error(auth.error.message)
      if (!auth.data.user) throw new Error('Sign in before uploading evidence.')
      const payload = value(await client.rpc('begin_uploaded_commerce_evidence_capture', { p_order_id: orderId, p_order_item_id: null, p_evidence_kind: 'packing', p_return_request_id: null }))
      const intent = (Array.isArray(payload) ? payload[0] : payload) as { intent_id: string; path_prefix: string }
      if (!intent?.intent_id || !intent.path_prefix?.startsWith(`${auth.data.user.id}/orders/${orderId}/packing/`) || intent.path_prefix.includes('..')) throw new Error('The server did not return a valid packing upload intent.')
      const path = `${intent.path_prefix}.${evidenceTypes[file.type]}`
      const uploaded = await client.storage.from('creator-commerce-private').upload(path, file, { contentType: file.type, upsert: false })
      if (uploaded.error) throw new Error(uploaded.error.message)
      try {
        value(await client.rpc('finalize_commerce_evidence_capture', { p_intent_id: intent.intent_id, p_storage_path: path, p_file_name: file.name, p_mime_type: file.type, p_file_size: file.size }))
      } catch (cause) {
        // A transport error can follow a committed finalization. Never delete an object that may now be referenced.
        throw new EvidenceOutcomeUnknown('Upload completed, but evidence finalization could not be confirmed. Refresh the evidence list before starting another upload. The uploaded file has been preserved.', { cause })
      }
    },
  }
}
