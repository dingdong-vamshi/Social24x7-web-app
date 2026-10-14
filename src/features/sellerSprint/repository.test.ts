import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { dateBounds, emptyOrderFilters, EvidenceOutcomeUnknown, sellerSprintRepository, summarizeTraffic, validateOrderFilters, validatePackingFile, type ProductSeo, type TrafficEvent, type TrafficOrder } from './repository'

function setup(responses: Array<{ data: unknown; error: { message: string } | null; count?: number }> = []) {
  const calls: Array<{ name: string; args: unknown[] }> = []
  const builder: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'in', 'gte', 'lte', 'lt', 'order', 'range', 'limit', 'single', 'update']) builder[name] = (...args: unknown[]) => { calls.push({ name, args }); return builder }
  builder.then = (resolve: (data: unknown) => void) => Promise.resolve(responses.shift() ?? { data: [], error: null }).then(resolve)
  const storage = { upload: vi.fn().mockResolvedValue({ data: {}, error: null }), remove: vi.fn() }
  const client = { from: vi.fn(() => builder), auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'owner' } }, error: null }) }, rpc: vi.fn(), storage: { from: vi.fn(() => storage) } }
  return { client, storage, calls, repository: sellerSprintRepository(client as unknown as SupabaseClient) }
}
const seo: ProductSeo = { brand: 'Brand', tags: ['home'], search_keywords: ['lamp'], seo_title: 'Search title', seo_description: 'Description', llm_summary: 'Summary', updated_at: '2026-10-14T10:00:00Z' }

describe('Seller affiliate parity authorization', () => {
  const product = { id: 'p', title: 'Lamp', slug: 'lamp', category: 'Home', price_minor: 10000, sale_price_minor: null, inventory: 4, sku: 'SKU', short_description: '', description: '', return_window_days: 7 }
  it('reads current owner-scoped data and calls the exact original product RPC', async () => {
    const { repository, client, calls } = setup([{ data: { id: 'store' }, error: null }, { data: product, error: null }])
    client.rpc.mockResolvedValue({ data: product, error: null })
    await repository.setAffiliate('p', 'store', true, '5.25')
    expect(calls).toContainEqual({ name: 'eq', args: ['owner_id', 'owner'] })
    expect(calls).toContainEqual({ name: 'eq', args: ['storefront_id', 'store'] })
    expect(client.rpc).toHaveBeenCalledWith('save_creator_commerce_product', {
      p_product_id: 'p', p_title: 'Lamp', p_slug: 'lamp', p_category: 'Home', p_price_minor: 10000, p_sale_price_minor: null, p_inventory: 4,
      p_sku: 'SKU', p_short_description: '', p_description: '', p_creator_promotion_enabled: true, p_creator_commission_bps: 525, p_return_window_days: 7,
    })
    expect(calls.some(c => c.name === 'update')).toBe(false)
  })
  it('disables new discovery with zero commission, not product publication or historic record deletion', async () => {
    const { repository, client } = setup([{ data: { id: 'store' }, error: null }, { data: product, error: null }])
    client.rpc.mockResolvedValue({ data: product, error: null })
    await repository.setAffiliate('p', 'store', false, 'invalid-unused')
    expect(client.rpc).toHaveBeenCalledWith('save_creator_commerce_product', expect.objectContaining({ p_creator_promotion_enabled: false, p_creator_commission_bps: 0 }))
    expect(client.rpc).toHaveBeenCalledTimes(1)
  })
  it('rejects invalid commissions before network access and stops after owner denial', async () => {
    const invalid = setup()
    await expect(invalid.repository.setAffiliate('p', 'store', true, '4.99')).rejects.toThrow('5%')
    await expect(invalid.repository.setAffiliate('p', 'store', true, '70.01')).rejects.toThrow('70%')
    expect(invalid.client.auth.getUser).not.toHaveBeenCalled()
    const denied = setup([{ data: null, error: { message: 'Denied' } }])
    await expect(denied.repository.setAffiliate('p', 'store', true, '5')).rejects.toThrow('Denied')
    expect(denied.client.rpc).not.toHaveBeenCalled()
  })
})

describe('Seller finance query completeness', () => {
  it('scopes all financial table reads and propagates incomplete-data failures', async () => {
    const { repository, calls } = setup([{ data: { id: 'store' }, error: null }, { data: [], error: null, count: 10001 }, { data: [], error: null, count: 0 }, { data: [], error: null, count: 0 }])
    await expect(repository.finance('store')).rejects.toThrow('incomplete estimate')
    expect(calls.filter(c => c.name === 'eq' && c.args[0] === 'storefront_id')).toHaveLength(3)
  })
  it('does not access financial tables after owner denial', async () => {
    const { repository, client } = setup([{ data: null, error: { message: 'Denied' } }])
    await expect(repository.finance('store')).rejects.toThrow('Denied')
    expect(client.from).toHaveBeenCalledTimes(1)
    expect(client.from).toHaveBeenCalledWith('storefronts')
  })
})

describe('Seller sprint filter validation', () => {
  it('maps only authorized customer identity and earliest shipped event, with local dispatch range', async () => {
    const before = new Date('2026-10-13T12:00:00').toISOString(), inside = new Date('2026-10-14T15:00:00').toISOString()
    const { repository, calls } = setup([{ data: [
      { id: 'a', profiles: { display_name: 'QA Customer', username: 'qa' }, order_events: [{ status: 'delivered', created_at: inside }, { status: 'shipped', created_at: inside }] },
      { id: 'b', profiles: [], order_events: [{ status: 'shipped', created_at: inside }, { status: 'shipped', created_at: before }] },
      { id: 'c', profiles: null, order_events: [] },
    ], error: null, count: 3 }])
    const result = await repository.orders('store', { ...emptyOrderFilters, dispatchStart: '2026-10-14', dispatchEnd: '2026-10-14' })
    expect(result.rows.map(row => row.id)).toEqual(['a'])
    expect(result.rows[0]).toMatchObject({ customer_name: 'QA Customer', customer_username: 'qa', dispatch_at: inside })
    expect(calls).toContainEqual({ name: 'eq', args: ['storefront_id', 'store'] })
    expect(result.count).toBe(3) // server count deliberately distinct from loaded dispatch matches
  })
  it('includes the entire end date using next local midnight as an exclusive boundary', () => {
    const bounds = dateBounds('2026-10-01', '2026-10-14')
    expect(bounds.from).toBe(new Date('2026-10-01T00:00:00').toISOString())
    expect(bounds.until).toBe(new Date('2026-10-15T00:00:00').toISOString())
  })
  it('rejects reversed or impossible dates', () => {
    expect(() => dateBounds('2026-10-15', '2026-10-14')).toThrow('end date')
    expect(() => dateBounds('2026-02-30', '')).toThrow('valid calendar date')
  })
  it('does not compare values in different currencies', () => {
    expect(() => validateOrderFilters({ ...emptyOrderFilters, minimum: '1' })).toThrow('Choose a currency')
    expect(() => validateOrderFilters({ ...emptyOrderFilters, sort: 'value_high' })).toThrow('Choose a currency')
    expect(validateOrderFilters({ ...emptyOrderFilters, currency: 'inr', minimum: '1.01' }).minimum).toBe(101)
    expect(() => validateOrderFilters({ ...emptyOrderFilters, currency: 'INR', minimum: '10', maximum: '1' })).toThrow('Maximum')
  })
  it('applies date/value/store/status filters on the server before sorting and limiting', async () => {
    const { repository, calls } = setup([{ data: [], error: null, count: 0 }])
    await repository.orders('store-a', { ...emptyOrderFilters, start: '2026-10-01', end: '2026-10-14', currency: 'INR', minimum: '1.01', maximum: '20', sort: 'value_high', status: 'placed' })
    expect(calls).toContainEqual({ name: 'eq', args: ['storefront_id', 'store-a'] })
    expect(calls).toContainEqual({ name: 'eq', args: ['status', 'placed'] })
    expect(calls).toContainEqual({ name: 'gte', args: ['total_minor', 101] })
    expect(calls).toContainEqual({ name: 'lte', args: ['total_minor', 2000] })
    expect(calls).toContainEqual({ name: 'order', args: ['total_minor', { ascending: false }] })
    expect(calls.at(-1)).toEqual({ name: 'limit', args: [500] })
  })
})

describe('Seller return details ownership and original relationships', () => {
  it('reads customer/product/category/value only through owned request IDs and signed-in RLS', async () => {
    const { repository, calls, client } = setup([
      { data: { id: 'store' }, error: null },
      { data: [{ id: 'r', order_id: 'o', order_item_id: 'i', buyer_id: 'b', status: 'submitted', requested_at: '2026-10-14', reason: 'damaged' }], error: null },
      { data: [{ id: 'b', display_name: 'QA Buyer', username: 'qa' }], error: null },
      { data: [{ id: 'i', product_title_snapshot: 'Lamp', subtotal_minor: 1200, products: { category: 'Home' } }], error: null },
      { data: [{ id: 'o', currency: 'INR' }], error: null },
    ])
    expect(await repository.returns('store')).toEqual([expect.objectContaining({ buyer_name: 'QA Buyer', buyer_username: 'qa', product_title: 'Lamp', product_category: 'Home', item_subtotal: 1200, currency: 'INR' })])
    expect(calls).toContainEqual({ name: 'eq', args: ['owner_id', 'owner'] })
    expect(calls).toContainEqual({ name: 'eq', args: ['storefront_id', 'store'] })
    expect(calls).toContainEqual({ name: 'in', args: ['id', ['b']] })
    expect(client.storage.from).not.toHaveBeenCalled() // private evidence is requested only when opened
  })
  it('does not read related identities without owned requests', async () => {
    const empty = setup([{ data: { id: 'store' }, error: null }, { data: [], error: null }])
    expect(await empty.repository.returns('store')).toEqual([])
    expect(empty.client.from).toHaveBeenCalledTimes(2)
    const denied = setup([{ data: null, error: { message: 'Owner required' } }])
    await expect(denied.repository.returns('store')).rejects.toThrow('Owner required')
    expect(denied.client.from).toHaveBeenCalledTimes(1)
  })
})

describe('Seller product metadata authorization', () => {
  it('verifies owner and writes only metadata with product/store/version filters', async () => {
    const { repository, calls } = setup([{ data: { id: 'store-a' }, error: null }, { data: { updated_at: 'new-version' }, error: null }])
    await repository.saveProductSeo('product-a', 'store-a', { ...seo, status: 'active', owner_id: 'attacker' } as ProductSeo)
    expect(calls).toContainEqual({ name: 'eq', args: ['owner_id', 'owner'] })
    expect(calls).toContainEqual({ name: 'eq', args: ['storefront_id', 'store-a'] })
    expect(calls).toContainEqual({ name: 'eq', args: ['updated_at', seo.updated_at] })
    expect(calls.find(c => c.name === 'update')?.args[0]).toEqual({ brand: 'Brand', tags: ['home'], search_keywords: ['lamp'], seo_title: 'Search title', seo_description: 'Description', llm_summary: 'Summary' })
  })
  it('does not write after ownership denial', async () => {
    const { repository, calls } = setup([{ data: null, error: { message: 'Denied' } }])
    await expect(repository.saveProductSeo('product', 'other-store', seo)).rejects.toThrow('Denied')
    expect(calls.some(c => c.name === 'update')).toBe(false)
  })
  it('preserves the NOT NULL brand contract when clearing the optional brand field', async () => {
    const { repository, calls } = setup([{ data: { id: 'store' }, error: null }, { data: { updated_at: 'new' }, error: null }])
    await repository.saveProductSeo('product', 'store', { ...seo, brand: null })
    expect(calls.find(c => c.name === 'update')?.args[0]).toMatchObject({ brand: '' })
  })
  it('does not report a stale or zero-row update as success', async () => {
    const { repository } = setup([{ data: { id: 'store' }, error: null }, { data: null, error: { message: 'No row returned' } }])
    await expect(repository.saveProductSeo('product', 'store', seo)).rejects.toThrow('No row')
  })
  it('rejects brand values outside the actual constraint before network calls', async () => {
    const { repository, client } = setup()
    await expect(repository.saveProductSeo('product', 'store', { ...seo, brand: 'x'.repeat(121) })).rejects.toThrow('120')
    expect(client.auth.getUser).not.toHaveBeenCalled()
  })
})

describe('Actual traffic definitions', () => {
  const event = (id: number, event_type: string, visitor_id: string | null, session_key: string): TrafficEvent => ({ id, event_type, visitor_id, session_key, occurred_at: '2026-10-14T10:00:00Z' })
  const order = (status: string, currency: string, total_minor: number): TrafficOrder => ({ id: status, status, currency, total_minor, created_at: '2026-10-14T10:00:00Z' })
  it('deduplicates visitors, keeps currencies separate and uses the explicit existing order/view denominator', () => {
    const result = summarizeTraffic([event(1, 'storefront_view', 'user', 's1'), event(2, 'product_view', 'user', 's2'), event(3, 'storefront_view', null, 's3')], [order('placed', 'INR', 100), order('delivered', 'USD', 200), order('draft', 'INR', 999), order('refunded', 'INR', 999), order('cancelled', 'INR', 999)])
    expect(result).toEqual({ visitors: 2, views: 2, productViews: 1, orders: 2, conversion: 100, values: { INR: 100, USD: 200 } })
  })
  it('does not fabricate conversion when no storefront view was recorded', () => {
    expect(summarizeTraffic([], [order('delivered', 'INR', 100)]).conversion).toBeNull()
    expect(summarizeTraffic([event(1, 'product_view', null, '')], []).visitors).toBe(0)
  })
  it('rejects incomplete analytics instead of presenting a misleading ratio', async () => {
    const { repository } = setup([{ data: { id: 'store' }, error: null }, { data: [], error: null, count: 10001 }, { data: [], error: null, count: 0 }])
    await expect(repository.traffic('store', 14)).rejects.toThrow('10,000')
  })
})

describe('Packing evidence security', () => {
  const file = new File(['photo'], 'packing.png', { type: 'image/png' })
  it('validates actual finalize MIME limits, not the broader bucket PDF allowance', () => {
    expect(() => validatePackingFile(file)).not.toThrow()
    expect(() => validatePackingFile(new File(['pdf'], 'document.pdf', { type: 'application/pdf' }))).toThrow('PDF')
    expect(() => validatePackingFile(new File([], 'empty.png', { type: 'image/png' }))).toThrow('1 byte')
  })
  it('uses uploaded intent and private storage, never trusted capture or fulfillment mutations', async () => {
    const { repository, client, storage } = setup()
    client.rpc.mockResolvedValueOnce({ data: [{ intent_id: 'intent', path_prefix: 'owner/orders/order/packing/random/asset' }], error: null }).mockResolvedValueOnce({ data: { id: 'evidence' }, error: null })
    await repository.uploadPacking('order', file)
    expect(client.rpc.mock.calls.map(c => c[0])).toEqual(['begin_uploaded_commerce_evidence_capture', 'finalize_commerce_evidence_capture'])
    expect(client.rpc.mock.calls[0][1]).toEqual({ p_order_id: 'order', p_order_item_id: null, p_evidence_kind: 'packing', p_return_request_id: null })
    expect(client.storage.from).toHaveBeenCalledWith('creator-commerce-private')
    expect(storage.upload).toHaveBeenCalledWith('owner/orders/order/packing/random/asset.png', file, { contentType: 'image/png', upsert: false })
  })
  it('never uploads after server authorization fails', async () => {
    const { repository, client, storage } = setup()
    client.rpc.mockResolvedValue({ data: null, error: { message: 'Seller access required' } })
    await expect(repository.uploadPacking('other-order', file)).rejects.toThrow('Seller access required')
    expect(storage.upload).not.toHaveBeenCalled()
  })
  it('preserves the file when finalization outcome is unknown', async () => {
    const { repository, client, storage } = setup()
    client.rpc.mockResolvedValueOnce({ data: { intent_id: 'intent', path_prefix: 'owner/orders/order/packing/a/b' }, error: null }).mockRejectedValueOnce(new Error('Network disconnected'))
    await expect(repository.uploadPacking('order', file)).rejects.toBeInstanceOf(EvidenceOutcomeUnknown)
    expect(storage.remove).not.toHaveBeenCalled()
  })
  it('refuses an unexpected path instead of uploading into another account', async () => {
    const { repository, client, storage } = setup()
    client.rpc.mockResolvedValue({ data: { intent_id: 'intent', path_prefix: 'someone-else/orders/order/packing/a/b' }, error: null })
    await expect(repository.uploadPacking('order', file)).rejects.toThrow('valid packing upload intent')
    expect(storage.upload).not.toHaveBeenCalled()
  })
})
