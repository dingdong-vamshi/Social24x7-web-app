import type { SupabaseClient } from '@supabase/supabase-js'
import type { CompanyFeed } from '../businessWorkspace/businessWorkspaceRepository'

export type CompanyMediaBucket = 'social-posts' | 'shop-media' | 'product-media'
export type CompanyMediaReference = { bucket: CompanyMediaBucket; path: string }

/** Only Storage object paths from the authorized company feed are accepted. */
export function isCompanyStoragePath(path: unknown): path is string {
  return typeof path === 'string' && path.length > 0 && path.length <= 1024 &&
    !path.startsWith('/') && !/[:\\%?#]/.test(path) && !Array.from(path).some(character => character.charCodeAt(0) < 32) &&
    !path.split('/').some(segment => segment === '.' || segment === '..' || !segment)
}

export async function companyMediaUrl(client: SupabaseClient, reference: CompanyMediaReference) {
  if (!isCompanyStoragePath(reference.path)) throw new Error('This media path is unavailable.')
  if (!['social-posts', 'shop-media', 'product-media'].includes(reference.bucket)) throw new Error('Unsupported media source.')
  if (reference.bucket === 'product-media') {
    const { data, error } = await client.storage.from('product-media').createSignedUrl(reference.path, 300)
    if (error || !data?.signedUrl) throw new Error('This image is unavailable or access has changed.')
    return data.signedUrl
  }
  // Both are existing public buckets. Never retry a denied private object as public.
  return client.storage.from(reference.bucket).getPublicUrl(reference.path).data.publicUrl
}

export async function companyProductMedia(client: SupabaseClient, products: CompanyFeed['products']) {
  const result: Record<string, CompanyMediaReference | null> = {}
  for (const product of products) result[product.id] = null
  const ids = [...new Set(products.map(product => product.id))]
  for (let index = 0; index < ids.length; index += 100) {
    const { data, error } = await client.from('product_media').select('product_id,path,storage_bucket,position')
      .in('product_id', ids.slice(index, index + 100)).order('position')
    if (error) throw new Error('Product images could not be loaded. You can still read the company feed.')
    for (const product of products.filter(product => ids.slice(index, index + 100).includes(product.id))) {
      const media = (data ?? []).filter(row => row.product_id === product.id)
      const cover = media.find(row => row.path === product.coverPath) ?? media[0]
      if (!cover || !isCompanyStoragePath(cover.path)) continue
      const bucket = cover.storage_bucket || 'shop-media'
      if (bucket !== 'shop-media' && bucket !== 'product-media') continue
      result[product.id] = { bucket, path: cover.path }
    }
  }
  return result
}
