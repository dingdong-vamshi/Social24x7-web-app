import type { SupabaseClient } from '@supabase/supabase-js'
import type { Product, ProductMedia, Promotion } from '../../repositories/commerce'
export interface DetailMedia extends ProductMedia { id: string; media_type: string }
export interface CreatorProduct extends Omit<Product, 'product_media'> { brand: string | null; tags: string[] | null; attributes: Record<string, unknown> | null; fulfillment_type: string; product_media: DetailMedia[] }
export const canPromoteProduct = (product: Pick<Product, 'status' | 'product_approval_status' | 'creator_promotion_enabled' | 'inventory'>) => product.status === 'active' && product.product_approval_status === 'approved' && product.creator_promotion_enabled && product.inventory > 0
export async function loadCreatorProduct(client: SupabaseClient, productId: string, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)) throw new Error('This product link is invalid.')
  const [product, promotions] = await Promise.all([
    client.from('products').select('id,storefront_id,title,slug,category,sku,brand,tags,attributes,fulfillment_type,price_minor,sale_price_minor,currency,inventory,inventory_reserved,status,product_approval_status,creator_promotion_enabled,creator_commission_bps,return_window_days,short_description,description,updated_at,storefronts!products_storefront_id_fkey(name,slug),product_media(id,path,media_type,alt_text,position,is_primary,storage_bucket,original_filename,mime_type,bytes)').eq('id', productId).eq('status', 'active').eq('product_approval_status', 'approved').maybeSingle(),
    client.from('creator_product_promotions').select('id,product_id,creator_id,storefront_id,tracking_code,status,commission_bps_snapshot,created_at,products(title,slug,storefronts(name,slug))').eq('creator_id', userId).eq('product_id', productId).order('created_at', { ascending: false }),
  ])
  if (product.error) throw product.error
  if (promotions.error) throw promotions.error
  return { product: product.data as unknown as CreatorProduct | null, promotions: promotions.data as unknown as Promotion[] }
}
export async function creatorMediaUrl(client: SupabaseClient, media: DetailMedia) {
  if (!media.path || !['product-media', 'shop-media'].includes(media.storage_bucket)) throw new Error('This media source is unavailable.')
  if (media.storage_bucket === 'shop-media') return client.storage.from('shop-media').getPublicUrl(media.path).data.publicUrl
  const { data, error } = await client.storage.from('product-media').createSignedUrl(media.path, 900)
  if (error) throw error
  return data.signedUrl
}
