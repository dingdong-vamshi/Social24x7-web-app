import { beforeEach, describe, expect, it, vi } from 'vitest'
import { affiliateUrl, commerce, commissionTotals, decimalMinor, money, PRODUCT_CATEGORIES, validateProduct, validateProductImages, type ProductDraft, type Promotion, type Commission } from './commerce'

const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('../lib/supabase', () => ({ requireSupabase: () => mocks }))

function query(data: unknown = [], error: { message: string } | null = null) {
  const result = { data, error }
  const builder = {
    select: vi.fn(), eq: vi.fn(), gt: vi.fn(), order: vi.fn(), limit: vi.fn(),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  }
  for (const method of [builder.select, builder.eq, builder.gt, builder.order, builder.limit]) method.mockReturnValue(builder)
  return builder
}
const draft: ProductDraft = { title: 'QA product', slug: 'qa-product', category: 'Everyday', sku: 'QA-001', price: '123.45', salePrice: '110.20', inventory: '3', shortDescription: '', description: '', promotionEnabled: true, commission: '8.25', returnDays: '7' }

describe('live commerce repository', () => {
  beforeEach(() => vi.resetAllMocks())
  it('reorders private images through the existing service without deleting objects', async () => {
    mocks.from.mockReturnValue(query([{path:'a',storage_bucket:'product-media',position:0},{path:'b',storage_bucket:'product-media',position:1}]))
    mocks.rpc.mockResolvedValue({data:null,error:null})
    await commerce.arrangeProductImages('product',['b','a'],['a','b'])
    expect(mocks.rpc).toHaveBeenCalledWith('replace_creator_commerce_product_media',{p_product_id:'product',p_media:[expect.objectContaining({path:'b',position:0,is_primary:true}),expect.objectContaining({path:'a',position:1,is_primary:false})]})
  })
  it('refuses legacy or stale image replacement', async () => {
    mocks.from.mockReturnValue(query([{path:'a',storage_bucket:'shop-media'}]))
    await expect(commerce.arrangeProductImages('product',['a'],['a'])).rejects.toThrow('Legacy')
    mocks.from.mockReturnValue(query([{path:'a',storage_bucket:'product-media'},{path:'new',storage_bucket:'product-media'}]))
    await expect(commerce.arrangeProductImages('product',['a'],['a'])).rejects.toThrow('Image list changed')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('filters store discovery by the authenticated owner instead of trusting a local role flag', async () => {
    const builder = query()
    mocks.from.mockReturnValue(builder)
    await commerce.storefronts('qa-user')
    expect(mocks.from).toHaveBeenCalledWith('storefronts')
    expect(builder.eq).toHaveBeenCalledWith('owner_id', 'qa-user')
  })
  it('restricts Seller catalog reads to the selected authorized storefront', async () => {
    const builder = query()
    mocks.from.mockReturnValue(builder)
    await commerce.products('qa-store')
    expect(builder.eq).toHaveBeenCalledWith('storefront_id', 'qa-store')
    expect(builder.limit).toHaveBeenCalledWith(500)
  })
  it('restricts Creator discovery to the existing eligibility conditions', async () => {
    const builder = query()
    mocks.from.mockReturnValue(builder)
    await commerce.discovery()
    expect(builder.eq.mock.calls).toEqual([['status', 'active'], ['product_approval_status', 'approved'], ['creator_promotion_enabled', true]])
    expect(builder.gt).toHaveBeenCalledWith('inventory', 0)
  })
  it('scopes commission reads by Creator identity or Seller storefront', async () => {
    const builder = query()
    mocks.from.mockReturnValue(builder)
    await commerce.commissions('qa-creator', 'creator')
    await commerce.commissions('qa-store', 'seller')
    expect(builder.eq.mock.calls).toEqual([['creator_id', 'qa-creator'], ['storefront_id', 'qa-store']])
  })
  it('fails visibly on backend errors instead of substituting records', async () => {
    mocks.from.mockReturnValue(query(null, { message: 'Permission denied' }))
    await expect(commerce.orders('qa-store')).rejects.toThrow('Permission denied')
  })
  it('uses the existing product RPC and preserves exact minor currency units', async () => {
    mocks.rpc.mockResolvedValue({ data: { id: 'qa-product' }, error: null })
    await commerce.saveProduct(draft)
    expect(mocks.rpc).toHaveBeenCalledWith('save_creator_commerce_product', expect.objectContaining({ p_product_id: null, p_price_minor: 12345, p_sale_price_minor: 11020, p_creator_commission_bps: 825, p_inventory: 3, p_return_window_days: 7 }))
    expect(mocks.from).not.toHaveBeenCalled()
  })
  it('refuses invalid product rules before any mutation', async () => {
    await expect(commerce.saveProduct({ ...draft, commission: '4.99' })).rejects.toThrow('between 5% and 70%')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(() => validateProduct({ ...draft, inventory: '1.5' })).toThrow('whole number')
    expect(() => validateProduct({ ...draft, salePrice: '130' })).toThrow('no higher')
    expect(() => validateProduct({ ...draft, returnDays: '31' })).toThrow('0 to 30')
  })
  it('accepts exactly the existing database categories and rejects free-text categories before saving', async () => {
    expect(PRODUCT_CATEGORIES).toEqual(['Wellness', 'Home', 'Travel', 'Everyday'])
    for (const category of PRODUCT_CATEGORIES) expect(() => validateProduct({ ...draft, category })).not.toThrow()
    await expect(commerce.saveProduct({ ...draft, category: 'QA test only' })).rejects.toThrow('supported product category')
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('explains the category constraint without leaking raw database error text', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'new row violates check constraint products_category_check' } })
    await expect(commerce.saveProduct(draft)).rejects.toThrow('Choose a supported product category')
  })
  it('enforces existing title, slug, SKU and description lengths before saving', () => {
    expect(() => validateProduct({ ...draft, title: 'x' })).toThrow('between 2 and 180')
    expect(() => validateProduct({ ...draft, slug: 'x' })).toThrow('2–63')
    expect(() => validateProduct({ ...draft, slug: 'x'.repeat(64) })).toThrow('2–63')
    expect(() => validateProduct({ ...draft, sku: 'x'.repeat(81) })).toThrow('80 characters')
    expect(() => validateProduct({ ...draft, description: 'x'.repeat(8001) })).toThrow('8,000')
  })
  it('delegates promotion authorization and tracking-code creation to the canonical RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Creator approval is required before promotion.' } })
    await expect(commerce.promote('qa-product')).rejects.toThrow('Creator approval')
    expect(mocks.rpc).toHaveBeenCalledWith('create_creator_product_promotion', { p_product_id: 'qa-product' })
  })
  it('requires the backend team management permission through its checked RPC', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Team management permission required.' } })
    await expect(commerce.team('qa-store')).rejects.toThrow('Team management permission')
    expect(mocks.rpc).toHaveBeenCalledWith('get_storefront_team_dashboard', { target_storefront: 'qa-store' })
  })
  it('batches exact click counts and does not double-count duplicate promotion IDs', async () => {
    const filter = vi.fn().mockResolvedValue({ count: 7, error: null })
    mocks.from.mockReturnValue({ select: vi.fn().mockReturnValue({ in: filter }) })
    const ids = Array.from({ length: 201 }, (_, index) => `promotion-${index}`)
    expect(await commerce.clicks([...ids, ids[0]])).toBe(21)
    expect(filter.mock.calls.map((call) => call[1].length)).toEqual([100, 100, 1])
  })
})

describe('commerce presentation and links', () => {
  it('uses the actual mobile product route with escaped path and attribution', () => {
    const promotion = { products: { slug: 'qa-shirt', storefronts: { slug: 'qa-store' } }, tracking_code: 'qa+link' } as Promotion
    expect(affiliateUrl(promotion)).toBe('https://vamshi-superapp-drchirag-social24x7.vercel.app/store/qa-store/product/qa-shirt?ref=qa%2Blink')
    expect(affiliateUrl({ ...promotion, products: null })).toBeNull()
  })
  it('does not round away minor currency units', () => {
    expect(money(12345)).toBe('₹123.45')
    expect(money(0)).toBe('₹0.00')
  })
  it('converts accepted decimal amounts exactly and rejects sub-minor amounts', () => {
    expect(decimalMinor('1.01')).toBe(101)
    expect(decimalMinor('123.4')).toBe(12340)
    expect(decimalMinor('21474836.47')).toBe(2147483647)
    expect(() => decimalMinor('1.005')).toThrow('two decimal places')
    expect(() => decimalMinor('21474836.48')).toThrow('too large')
    expect(() => validateProduct({ ...draft, price: '0.001' })).toThrow('two decimal places')
  })
  it('rejects invalid uploads before product details can be saved', () => {
    expect(() => validateProductImages([new File(['x'], 'evidence.svg', { type: 'image/svg+xml' })])).toThrow('JPEG, PNG or WebP')
    expect(() => validateProductImages([new File(['x'], 'photo.png', { type: 'image/png' })], 10)).toThrow('at most 10')
  })
  it('keeps reversed, pending and paid commission amounts separate', () => {
    expect(commissionTotals([{ status: 'paid', commission_minor: 500 }, { status: 'pending', commission_minor: 120 }, { status: 'reversed', commission_minor: 90 }] as Commission[])).toEqual({ paid: 500, pending: 120, reversed: 90 })
  })
})
