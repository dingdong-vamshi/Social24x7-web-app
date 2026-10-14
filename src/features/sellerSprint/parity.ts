import type { ProductDraft } from '../../repositories/commerce'
import { dateBounds, type SellerReturn } from './repository'

// Original seller-studio-navigation.ts explicitly marks these actions Coming Soon.
export const originalSellerPlaceholders: Record<string, string> = {
  'products/ratings': 'Product Ratings', 'products/bundle': 'Product Bundle',
  'products/accelerator': 'Sales Accelerator', 'products/opportunities': 'Product Opportunities',
  'logistics/warehouses': 'Warehouses', 'logistics/social24': 'Fulfilled by Social24',
  'marketing/promotions': 'Promotions', 'marketing/campaigns': 'Campaigns',
  'marketing/programs': 'Programs', 'marketing/ads': 'Shop Ads', 'marketing/shop-page': 'Shop Page',
  'affiliate/automations': 'Affiliate Automations', 'live-video': 'LIVE & Video',
  growth: 'Growth', 'apps-partners': 'Apps & Partners',
}

export type ReturnFilters = { query: string; status: string; reason: string; category?: string; currency?: string; valueSort?: 'high' | 'low' | ''; start: string; end: string; oldest: boolean }
export const emptyReturnFilters: ReturnFilters = { query: '', status: 'all', reason: 'all', category: 'all', currency: '', valueSort: '', start: '', end: '', oldest: false }
export function filterReturns(rows: SellerReturn[], filters: ReturnFilters) {
  const { from, until } = dateBounds(filters.start, filters.end)
  if (filters.valueSort && !filters.currency) throw new Error('Choose a currency before sorting return value.')
  const query = filters.query.trim().toLowerCase()
  return rows.filter(row => (filters.status === 'all' || row.status === filters.status)
    && (filters.reason === 'all' || row.reason === filters.reason)
    && (!filters.category || filters.category === 'all' || row.product_category === filters.category)
    && (!filters.currency || row.currency === filters.currency)
    && (!from || new Date(row.requested_at).getTime() >= new Date(from).getTime())
    && (!until || new Date(row.requested_at).getTime() < new Date(until).getTime())
    && (!query || `${row.id} ${row.order_id} ${row.reason} ${row.details ?? ''} ${row.product_title ?? ''} ${row.buyer_name ?? ''} ${row.buyer_username ?? ''}`.toLowerCase().includes(query)))
    .sort((a, b) => filters.valueSort ? (a.item_subtotal == null ? 1 : b.item_subtotal == null ? -1 : (a.item_subtotal - b.item_subtotal) * (filters.valueSort === 'low' ? 1 : -1)) : (new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime()) * (filters.oldest ? 1 : -1))
}

export function groupReturnPerformance(rows: SellerReturn[], ascending = false) {
  const groups = new Map<string, { title: string; category: string; currency: string | null; count: number; value: number; incomplete: boolean }>()
  for (const row of rows) {
    const title = row.product_title || 'Product unavailable', category = row.product_category || 'Unspecified', currency = row.currency || null
    const key = JSON.stringify([title, category, currency]), group = groups.get(key) ?? { title, category, currency, count: 0, value: 0, incomplete: false }
    group.count++; group.value += row.item_subtotal ?? 0; group.incomplete ||= row.item_subtotal == null || !currency
    groups.set(key, group)
  }
  return [...groups.values()].sort((a, b) => (a.count - b.count) * (ascending ? 1 : -1) || a.title.localeCompare(b.title))
}

export function productDraftKey(userId: string, storeId: string) { return `social24:seller-product-draft:v1:${userId}:${storeId}` }
export type SellerProductDraft = ProductDraft & { brand?: string; tags?: string; keywords?: string; seoTitle?: string; seoDescription?: string; discoverySummary?: string }
// Only a new, unsaved product's text fields may resume. Never resume an ID or server-owned state.
export function restoreProductDraft(raw: string | null, fallback: SellerProductDraft): SellerProductDraft {
  if (!raw) return fallback
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback
    const data = parsed as Record<string, unknown>, restored = { ...fallback }
    for (const key of ['title', 'slug', 'category', 'sku', 'price', 'salePrice', 'inventory', 'shortDescription', 'description', 'commission', 'returnDays', 'brand', 'tags', 'keywords', 'seoTitle', 'seoDescription', 'discoverySummary'] as const) {
      if (typeof data[key] === 'string' && data[key].length <= 8000) restored[key] = data[key]
    }
    if (typeof data.promotionEnabled === 'boolean') restored.promotionEnabled = data.promotionEnabled
    return restored
  } catch { return fallback }
}
