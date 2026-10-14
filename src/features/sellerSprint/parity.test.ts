import { describe, expect, it } from 'vitest'
import { emptyReturnFilters, filterReturns, groupReturnPerformance, originalSellerPlaceholders, productDraftKey, restoreProductDraft } from './parity'
import { summarizeFinance } from './finance'
import { dailyTraffic } from './analytics'
import { matchesOrderQueue } from './orderQueues'
import type { ProductDraft, ReturnRequest } from '../../repositories/commerce'

const draft: ProductDraft = { title: '', slug: '', category: '', sku: '', price: '', salePrice: '', inventory: '0', shortDescription: '', description: '', promotionEnabled: false, commission: '5', returnDays: '0' }
const returns: ReturnRequest[] = [
  { id: 'a', order_id: 'order-1', status: 'submitted', reason: 'damaged', details: 'Broken lamp', admin_note: null, requested_at: new Date('2026-10-14T23:59:59').toISOString() },
  { id: 'b', order_id: 'order-2', status: 'approved', reason: 'wrong_item', details: '', admin_note: null, requested_at: new Date('2026-10-15T00:00:00').toISOString() },
]
describe('Seller original parity helpers', () => {
  it('preserves original payment-aware on-hold/pending and shipping groups', () => {
    expect(matchesOrderQueue({ status: 'placed', payment_status: 'pending' }, 'on_hold')).toBe(true)
    expect(matchesOrderQueue({ status: 'placed', payment_status: 'cod_pending' }, 'on_hold')).toBe(false)
    expect(matchesOrderQueue({ status: 'placed', payment_status: 'captured_test' }, 'pending')).toBe(true)
    expect(matchesOrderQueue({ status: 'processing', payment_status: '' }, 'ready_to_ship')).toBe(true)
    expect(matchesOrderQueue({ status: 'out_for_delivery', payment_status: '' }, 'in_transit')).toBe(true)
  })
  it('keeps original Soon actions separate from implemented actions', () => {
    expect(Object.keys(originalSellerPlaceholders)).toHaveLength(15)
    expect(originalSellerPlaceholders['marketing/campaigns']).toBe('Campaigns')
    expect(originalSellerPlaceholders['orders/return-settings']).toBeUndefined()
    expect(originalSellerPlaceholders['account-health']).toBeUndefined()
  })
  it('filters a complete local calendar end date, without modifying source records', () => {
    expect(filterReturns(returns, { ...emptyReturnFilters, start: '2026-10-14', end: '2026-10-14' }).map(r => r.id)).toEqual(['a'])
    expect(returns.map(r => r.id)).toEqual(['a', 'b'])
  })
  it('combines status/reason/search and supports newest/oldest sorting', () => {
    expect(filterReturns(returns, emptyReturnFilters).map(r => r.id)).toEqual(['b', 'a'])
    expect(filterReturns(returns, { ...emptyReturnFilters, oldest: true }).map(r => r.id)).toEqual(['a', 'b'])
    expect(filterReturns(returns, { ...emptyReturnFilters, status: 'submitted', reason: 'damaged', query: 'LAMP' }).map(r => r.id)).toEqual(['a'])
    expect(filterReturns(returns, { ...emptyReturnFilters, reason: 'damaged', query: 'order-2' })).toEqual([])
  })
  it('rejects reversed or impossible return date filters', () => {
    expect(() => filterReturns([], { ...emptyReturnFilters, start: '2026-02-30' })).toThrow('calendar')
    expect(() => filterReturns([], { ...emptyReturnFilters, start: '2026-10-15', end: '2026-10-14' })).toThrow('end date')
  })
  it('filters original product categories and only sorts values within a chosen currency', () => {
    const detailed = returns.map((row, i) => ({ ...row, product_title: 'Lamp', product_category: i ? 'Wellness' : 'Home', currency: 'INR', item_subtotal: i ? 500 : 1000 }))
    expect(filterReturns(detailed, { ...emptyReturnFilters, category: 'Home' }).map(row => row.id)).toEqual(['a'])
    expect(filterReturns(detailed, { ...emptyReturnFilters, currency: 'INR', valueSort: 'high' }).map(row => row.id)).toEqual(['a', 'b'])
    expect(() => filterReturns(detailed, { ...emptyReturnFilters, valueSort: 'high' })).toThrow('Choose a currency')
  })
  it('groups return counts without adding currencies or inventing missing item values', () => {
    const rows = [{ ...returns[0], product_title: 'Lamp', product_category: 'Home', currency: 'INR', item_subtotal: 1000 }, { ...returns[1], product_title: 'Lamp', product_category: 'Home', currency: 'USD', item_subtotal: 500 }, { ...returns[1], product_title: 'Lamp', product_category: 'Home', currency: 'INR', item_subtotal: null }]
    expect(groupReturnPerformance(rows)).toEqual([
      { title: 'Lamp', category: 'Home', currency: 'INR', count: 2, value: 1000, incomplete: true },
      { title: 'Lamp', category: 'Home', currency: 'USD', count: 1, value: 500, incomplete: false },
    ])
    expect(groupReturnPerformance(rows, true)[0].count).toBe(1)
  })
  it('scopes unsaved product drafts to both account and storefront', () => {
    expect(productDraftKey('a', 'store')).not.toBe(productDraftKey('b', 'store'))
    expect(productDraftKey('a', 'store')).not.toBe(productDraftKey('a', 'other'))
  })
  it('resumes only typed product fields, never injected IDs, ownership or publication', () => {
    const restored = restoreProductDraft(JSON.stringify({ title: 'Saved lamp', id: 'other-product', owner_id: 'other', status: 'active', promotionEnabled: true, price: 15 }), draft)
    expect(restored).toEqual({ ...draft, title: 'Saved lamp', promotionEnabled: true })
  })
  it('ignores corrupt, oversized and nonobject browser drafts', () => {
    for (const raw of ['{broken', '[]', 'false', 'null', JSON.stringify({ title: 'x'.repeat(8001) })]) expect(restoreProductDraft(raw, draft)).toEqual(draft)
  })
})

describe('Original analytics chart contracts', () => {
  it('fills exact local day buckets from actual events and deduplicates visitors per day', () => {
    const at = new Date('2026-10-14T23:00:00').toISOString()
    const events = [{ id: 1, event_type: 'storefront_view', visitor_id: 'u', session_key: 's', occurred_at: at }, { id: 2, event_type: 'product_view', visitor_id: 'u', session_key: 's2', occurred_at: at }, { id: 3, event_type: 'product_view', visitor_id: null, session_key: 'guest', occurred_at: at }]
    const order = (id: string, status: string, payment_method: string | null) => ({ id, status, payment_method, currency: 'INR', total_minor: 10, created_at: at })
    const result = dailyTraffic(events, [order('a', 'placed', 'cod'), order('b', 'delivered', 'external'), order('c', 'draft', 'cod'), order('d', 'confirmed', null)], new Date('2026-10-13T00:00:00').toISOString(), at)
    expect(result.dailySeries).toEqual([{ date: '2026-10-13', views: 0, visitors: 0, orders: 0 }, { date: '2026-10-14', views: 1, visitors: 2, orders: 4 }])
    expect(result.dailyVisitors).toBe(2)
    expect(result.paymentMix).toEqual([{ label: 'Cash on delivery', value: 1 }, { label: 'Other payment methods', value: 1 }, { label: 'Not recorded', value: 1 }])
  })
})

describe('Original Seller finance calculation', () => {
  const orders = [
    { id: 'a', currency: 'INR', status: 'delivered', total_minor: 10000 },
    { id: 'b', currency: 'USD', status: 'placed', total_minor: 5000 },
    { id: 'c', currency: 'INR', status: 'cancelled', total_minor: 99999 },
  ]
  it('keeps currencies separate, excludes reversals, deduplicates approved items and does not count pending returns', () => {
    const result = summarizeFinance(orders, [{ order_id: 'a', commission_minor: 1000, status: 'pending' }, { order_id: 'a', commission_minor: 999, status: 'reversed' }], [
      { id: 'r1', order_item_id: 'i1', status: 'approved' }, { id: 'r2', order_item_id: 'i1', status: 'received' }, { id: 'r3', order_item_id: 'i2', status: 'submitted' },
    ], [{ id: 'i1', order_id: 'a', subtotal_minor: 2000 }])
    expect(result).toEqual([
      { currency: 'INR', gross: 10000, delivered: 10000, commission: 1000, returns: 2000, estimate: 7000, orders: 1 },
      { currency: 'USD', gross: 5000, delivered: 0, commission: 0, returns: 0, estimate: 5000, orders: 1 },
    ])
  })
  it('never invents a currency or hides missing financial records', () => {
    expect(() => summarizeFinance(orders, [{ order_id: 'missing', commission_minor: 10, status: 'pending' }], [], [])).toThrow('currency')
    expect(() => summarizeFinance(orders, [], [{ id: 'r', order_item_id: 'missing', status: 'approved' }], [])).toThrow('order item')
  })
  it('matches the original zero floor for estimates, without implying a payout balance', () => {
    expect(summarizeFinance(orders, [{ order_id: 'a', commission_minor: 11000, status: 'paid' }], [], [])[0].estimate).toBe(0)
  })
})
