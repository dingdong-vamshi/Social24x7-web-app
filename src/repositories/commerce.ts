import { requireSupabase } from '../lib/supabase'

// Existing public.products category constraint, verified 2026-10-13.
export const PRODUCT_CATEGORIES = ['Wellness', 'Home', 'Travel', 'Everyday'] as const

export interface Storefront {
  id: string; owner_id: string; name: string; slug: string; tagline: string | null; description: string | null
  active: boolean; verification_status: string; city: string | null; state_code: string | null
  primary_category: string | null; seo_title: string | null; seo_description: string | null; llm_summary: string | null
}
export interface Product {
  id: string; storefront_id: string; title: string; slug: string; category: string; sku: string
  price_minor: number; sale_price_minor: number | null; currency: string; inventory: number; inventory_reserved: number
  status: string; product_approval_status: string; creator_promotion_enabled: boolean; creator_commission_bps: number
  return_window_days: number; short_description: string | null; description: string | null
  storefronts: { name: string; slug: string } | null; product_media: ProductMedia[]; updated_at: string
}
export interface ProductMedia { path: string; storage_bucket: string; position: number; original_filename: string | null; mime_type: string | null; bytes: number | null; alt_text?: string | null; width?: number | null; height?: number | null; is_primary?: boolean }
export interface Order {
  id: string; storefront_id: string; status: string; currency: string; total_minor: number; payment_status: string
  payment_method: string; created_at: string
  order_items: { id: string; product_title_snapshot: string; quantity: number; subtotal_minor: number }[]
  order_fulfillments: { status: string; carrier: string | null; tracking_number: string | null; package_reference?: string | null; customer_note: string | null } | null
}
export interface ReturnRequest { id: string; order_id: string; status: string; reason: string; details: string | null; admin_note: string | null; requested_at: string }
export interface Promotion {
  id: string; product_id: string; creator_id: string; storefront_id: string; tracking_code: string; status: string; commission_bps_snapshot: number; created_at: string
  products: { title: string; slug: string; storefronts: { name: string; slug: string } | null } | null
}
export interface Commission {
  id: string; creator_id: string; order_id: string; product_id: string; commission_minor: number; eligible_item_minor: number
  status: string; created_at: string; paid_at: string | null; eligible_at: string | null; reversal_reason: string | null
}
export interface TeamDashboard {
  storefront: { name: string; verified: boolean; verificationStatus: string }
  members: { id: string; fullName: string; roleName: string; status: string; identityKind: string; permissions: string[]; jobTitle: string }[]
  permissionCatalog: { code: string; label: string; description: string }[]
}
const productFields = 'id,storefront_id,title,slug,category,sku,price_minor,sale_price_minor,currency,inventory,inventory_reserved,status,product_approval_status,creator_promotion_enabled,creator_commission_bps,return_window_days,short_description,description,updated_at,storefronts!products_storefront_id_fkey(name,slug),product_media(path,storage_bucket,position,original_filename,mime_type,bytes)'

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) {
    if (result.error.message.includes('products_category_check')) throw new Error('Choose a supported product category: Wellness, Home, Travel or Everyday.')
    throw new Error(result.error.message)
  }
  if (result.data === null) throw new Error('The server returned no result. Refresh and try again.')
  return result.data
}

// All queries use the signed-in browser session. Explicit ownership filters supplement RLS;
// the backend remains authoritative for authorization and state transitions.
export const commerce = {
  async storefronts(userId: string): Promise<Storefront[]> {
    return check(await requireSupabase().from('storefronts').select('id,owner_id,name,slug,tagline,description,active,verification_status,city,state_code,primary_category,seo_title,seo_description,llm_summary').eq('owner_id', userId).order('updated_at', { ascending: false }))
  },
  async products(storefrontId: string): Promise<Product[]> {
    return check(await requireSupabase().from('products').select(productFields).eq('storefront_id', storefrontId).order('updated_at', { ascending: false }).limit(500)) as unknown as Product[]
  },
  async orders(storefrontId: string): Promise<Order[]> {
    return check(await requireSupabase().from('orders').select('id,storefront_id,status,currency,total_minor,payment_status,payment_method,created_at,order_items(id,product_title_snapshot,quantity,subtotal_minor),order_fulfillments(status,carrier,tracking_number,package_reference,customer_note)').eq('storefront_id', storefrontId).order('created_at', { ascending: false }).limit(500)) as unknown as Order[]
  },
  async returns(storefrontId: string): Promise<ReturnRequest[]> {
    return check(await requireSupabase().from('return_requests').select('id,order_id,status,reason,details,admin_note,requested_at').eq('storefront_id', storefrontId).order('requested_at', { ascending: false }).limit(500))
  },
  async sellerPromotions(storefrontId: string): Promise<Promotion[]> {
    return check(await requireSupabase().from('creator_product_promotions').select('id,product_id,creator_id,storefront_id,tracking_code,status,commission_bps_snapshot,created_at,products(title,slug,storefronts(name,slug))').eq('storefront_id', storefrontId).order('created_at', { ascending: false }).limit(500)) as unknown as Promotion[]
  },
  async commissions(id: string, role: 'seller' | 'creator'): Promise<Commission[]> {
    return check(await requireSupabase().from('creator_commissions').select('id,creator_id,order_id,product_id,commission_minor,eligible_item_minor,status,created_at,paid_at,eligible_at,reversal_reason').eq(role === 'seller' ? 'storefront_id' : 'creator_id', id).order('created_at', { ascending: false }).limit(500))
  },
  async team(storefrontId: string): Promise<TeamDashboard> {
    return check(await requireSupabase().rpc('get_storefront_team_dashboard', { target_storefront: storefrontId })) as TeamDashboard
  },
  async discovery(): Promise<Product[]> {
    return check(await requireSupabase().from('products').select(productFields).eq('status', 'active').eq('product_approval_status', 'approved').eq('creator_promotion_enabled', true).gt('inventory', 0).order('published_at', { ascending: false }).limit(80)) as unknown as Product[]
  },
  async promotions(userId: string): Promise<Promotion[]> {
    return check(await requireSupabase().from('creator_product_promotions').select('id,product_id,creator_id,storefront_id,tracking_code,status,commission_bps_snapshot,created_at,products(title,slug,storefronts(name,slug))').eq('creator_id', userId).order('created_at', { ascending: false }).limit(500)) as unknown as Promotion[]
  },
  async promote(productId: string): Promise<Promotion> {
    return check(await requireSupabase().rpc('create_creator_product_promotion', { p_product_id: productId })) as Promotion
  },
  async clicks(promotionIds: string[]): Promise<number> {
    if (!promotionIds.length) return 0
    // Keep REST URLs below proxy limits for accounts with hundreds of promotions.
    const ids = [...new Set(promotionIds)]
    let count = 0
    for (let index = 0; index < ids.length; index += 100) {
      const result = await requireSupabase().from('creator_promotion_clicks').select('id', { count: 'exact', head: true }).in('promotion_id', ids.slice(index, index + 100))
      if (result.error) throw new Error(result.error.message)
      count += result.count ?? 0
    }
    return count
  },
  async saveProduct(draft: ProductDraft): Promise<Product> {
    validateProduct(draft)
    return check(await requireSupabase().rpc('save_creator_commerce_product', {
      p_product_id: draft.id || null, p_title: draft.title.trim(), p_slug: draft.slug.trim(), p_category: draft.category.trim(),
      p_price_minor: decimalMinor(draft.price), p_sale_price_minor: draft.salePrice ? decimalMinor(draft.salePrice) : null,
      p_inventory: Number(draft.inventory), p_sku: draft.sku.trim(), p_short_description: draft.shortDescription.trim(), p_description: draft.description.trim(),
      p_creator_promotion_enabled: draft.promotionEnabled, p_creator_commission_bps: draft.promotionEnabled ? decimalMinor(draft.commission) : 0,
      p_return_window_days: Number(draft.returnDays),
    })) as Product
  },
  async publish(productId: string): Promise<void> {
    check(await requireSupabase().rpc('publish_creator_commerce_product', { p_product_id: productId }))
  },
  async imageUrl(product: Product): Promise<string | null> {
    const media = [...(product.product_media ?? [])].sort((a, b) => a.position - b.position)[0]
    if (!media) return null
    const bucket = media.storage_bucket || 'shop-media'
    if (!['product-media', 'shop-media'].includes(bucket)) return null
    if (bucket === 'shop-media') return requireSupabase().storage.from(bucket).getPublicUrl(media.path).data.publicUrl
    const signed = await requireSupabase().storage.from(bucket).createSignedUrl(media.path, 900)
    if (signed.error) return null
    return signed.data.signedUrl
  },
  async arrangeProductImages(productId: string, paths: string[], expectedPaths: string[]): Promise<void> {
    if (paths.length < 1 || paths.length > 10) throw new Error('Keep between one and ten product images. A cover is required.')
    const client = requireSupabase()
    const current = check(await client.from('product_media').select('path,storage_bucket,position,original_filename,mime_type,bytes,alt_text,width,height').eq('product_id', productId).order('position')) as ProductMedia[]
    if (current.some(item => item.storage_bucket !== 'product-media')) throw new Error('Legacy images must be managed in the existing application.')
    if (JSON.stringify(current.map(item => item.path)) !== JSON.stringify(expectedPaths) || new Set(paths).size !== paths.length || paths.some(path => !current.some(item => item.path === path))) throw new Error('Image list changed. Reload before saving.')
    const media = paths.map((path, position) => {
      const item = current.find(item => item.path === path)!
      return { path, media_type: 'image', alt_text: item.alt_text || '', position, is_primary: position === 0, original_filename: item.original_filename, mime_type: item.mime_type || 'image/jpeg', bytes: item.bytes || 1, width: item.width ?? null, height: item.height ?? null }
    })
    const result = await client.rpc('replace_creator_commerce_product_media', { p_product_id: productId, p_media: media })
    if (result.error) throw new Error(result.error.message)
    // Detach records only. Never delete stored objects after an uncertain response.
  },
  async addProductImages(productId: string, files: File[]): Promise<void> {
    const client = requireSupabase()
    const auth = await client.auth.getUser()
    if (auth.error) throw new Error(auth.error.message)
    const user = auth.data.user
    if (!user) throw new Error('Sign in to upload product images.')
    const old = check(await client.from('product_media').select('path,storage_bucket,position,original_filename,mime_type,bytes,alt_text,width,height,is_primary').eq('product_id', productId).order('position')) as ProductMedia[]
    // The existing replacement RPC supports private product-media only. Do not rewrite legacy media.
    if (old.some((media) => media.storage_bucket !== 'product-media')) throw new Error('This product uses legacy media. Manage its images in the existing application.')
    validateProductImages(files, old.length)
    const added: ProductMedia[] = []
    let attachmentAttempted = false
    try {
      for (const file of files) {
        const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
        const path = `${user.id}/products/${productId}/${crypto.randomUUID()}.${extension}`
        const result = await client.storage.from('product-media').upload(path, file, { contentType: file.type, upsert: false })
        if (result.error) throw new Error(result.error.message)
        added.push({ path, storage_bucket: 'product-media', position: old.length + added.length, original_filename: file.name, mime_type: file.type, bytes: file.size })
      }
      attachmentAttempted = true
      const result = await client.rpc('replace_creator_commerce_product_media', { p_product_id: productId, p_media: [...old, ...added].map((media, index) => ({ path: media.path, media_type: 'image', alt_text: media.alt_text ?? '', position: index, is_primary: media.is_primary ?? index === 0, original_filename: media.original_filename, mime_type: media.mime_type, bytes: media.bytes ?? 1, width: media.width ?? null, height: media.height ?? null })) })
      if (result.error) throw new Error(result.error.message)
    } catch (error) {
      // A transport failure after RPC dispatch has an unknown outcome. Preserve uploaded
      // objects in that case: deleting them could break a committed product-media record.
      if (!attachmentAttempted && added.length) await client.storage.from('product-media').remove(added.map((item) => item.path))
      throw error
    }
  },
}

export interface ProductDraft {
  id?: string; title: string; slug: string; category: string; sku: string; price: string; salePrice: string
  inventory: string; shortDescription: string; description: string; promotionEnabled: boolean; commission: string; returnDays: string
}
export function decimalMinor(value: string): number {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Use a number with no more than two decimal places.')
  const [whole, fraction = ''] = value.split('.')
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  if (!Number.isSafeInteger(minor) || minor > 2147483647) throw new Error('The amount is too large.')
  return minor
}
export function validateProductImages(files: File[], existingCount = 0) {
  if (existingCount + files.length > 10) throw new Error('A product supports at most 10 images. Existing images are preserved.')
  for (const file of files) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('Choose JPEG, PNG or WebP images up to 10 MiB each.')
  }
}
export function validateProduct(draft: ProductDraft) {
  if (!draft.title.trim() || !draft.sku.trim() || !draft.category.trim()) throw new Error('Add a product title, category and SKU.')
  if (!PRODUCT_CATEGORIES.some((category) => category === draft.category.trim())) throw new Error('Choose a supported product category: Wellness, Home, Travel or Everyday.')
  if (draft.title.trim().length < 2 || draft.title.trim().length > 180) throw new Error('Use a product title between 2 and 180 characters.')
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(draft.slug.trim())) throw new Error('Use 2–63 lowercase letters, numbers or hyphens for the product URL, starting with a letter or number.')
  if (draft.sku.trim().length > 80) throw new Error('Use a SKU of at most 80 characters.')
  if (draft.shortDescription.trim().length > 180 || draft.description.trim().length > 8000) throw new Error('Keep the short description within 180 characters and description within 8,000 characters.')
  const price = decimalMinor(draft.price)
  if (price <= 0) throw new Error('Enter a valid price greater than zero.')
  if (draft.salePrice && (decimalMinor(draft.salePrice) <= 0 || decimalMinor(draft.salePrice) > price)) throw new Error('The sale price must be greater than zero and no higher than the regular price.')
  if (!/^\d+$/.test(draft.inventory) || Number(draft.inventory) > 2147483647) throw new Error('Inventory must be a whole number of zero or more.')
  if (!/^\d+$/.test(draft.returnDays) || Number(draft.returnDays) > 30) throw new Error('The return window must be a whole number from 0 to 30 days.')
  if (draft.promotionEnabled && (decimalMinor(draft.commission) < 500 || decimalMinor(draft.commission) > 7000)) throw new Error('Creator commission must be between 5% and 70%.')
}

export function affiliateUrl(promotion: Promotion): string | null {
  const product = promotion.products
  if (!product?.slug || !product.storefronts?.slug || !promotion.tracking_code) return null
  return `https://vamshi-superapp-drchirag-social24x7.vercel.app/store/${encodeURIComponent(product.storefronts.slug)}/product/${encodeURIComponent(product.slug)}?ref=${encodeURIComponent(promotion.tracking_code)}`
}

export function money(minor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(minor / 100)
}
export function dateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export const label = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase())
export function commissionTotals(rows: Commission[]) {
  return rows.reduce((totals, row) => { totals[row.status] = (totals[row.status] ?? 0) + row.commission_minor; return totals }, {} as Record<string, number>)
}
