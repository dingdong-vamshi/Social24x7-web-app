import { useCallback, useState } from 'react'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../../components/LiveCommerce'
import { Button, PageHeader, SectionCard, StatusPill } from '../../components/Ui'
import { requireSupabase } from '../../lib/supabase'
import { affiliateUrl, commerce, dateTime, label, money } from '../../repositories/commerce'
import { canPromoteProduct, creatorMediaUrl, loadCreatorProduct, type DetailMedia } from './product'
import './creator.css'

export function CreatorProductDetail({ productId, userId }: { productId: string; userId: string }) {
  const load = useCallback(() => loadCreatorProduct(requireSupabase(), productId, userId), [productId, userId])
  const result = useCommerce(load)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function promote() {
    setBusy(true); setError(''); setMessage('')
    try { await commerce.promote(productId); setMessage('Your promotion is ready. Your tracking code and commission snapshot are shown below.'); result.refresh() }
    catch (cause) { setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Unable to create this promotion.') }
    finally { setBusy(false) }
  }
  return <><PageHeader eyebrow="Creator marketplace" title={result.data?.product?.title ?? 'Product details'} description="Seller-owned product information and your promotion relationship." actions={<><Button variant="secondary" to="/partner/creator/discover">Back to products</Button><Button variant="secondary" onClick={result.refresh}>Refresh</Button></>} />{error && <p className="form-error" role="alert">{error}</p>}{message && <p role="status" className="commerce-success">{message}</p>}<CommerceResult result={result}>{({ product, promotions }) => {
    if (!product) return <CommerceEmpty title="Product unavailable" description="This product is no longer active and approved, or your account cannot access it. Existing promotion records remain in your Promotions page." />
    const active = promotions.find((promotion) => promotion.status === 'active')
    return <><SectionCard title={product.storefronts?.name ?? 'Seller storefront'} description={`${product.category}${product.brand ? ` · ${product.brand}` : ''}`}><div className="creator-product-gallery">{product.product_media.length ? [...product.product_media].sort((a, b) => Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) || a.position - b.position).map((media) => <Media key={media.id} media={media} title={product.title} />) : <CommerceEmpty title="No product media" description="The Seller has not supplied product media." />}</div><p>{product.short_description}</p><strong>{money(product.sale_price_minor ?? product.price_minor, product.currency)}</strong>{product.sale_price_minor != null && product.sale_price_minor < product.price_minor && <p><s>{money(product.price_minor, product.currency)}</s> original price</p>}<dl className="commerce-definition"><div><dt>Availability</dt><dd>{product.inventory > 0 ? 'In stock' : 'Out of stock'}</dd></div><div><dt>SKU</dt><dd>{product.sku || 'Not provided'}</dd></div><div><dt>Fulfillment</dt><dd>{label(product.fulfillment_type)}</dd></div><div><dt>Return window</dt><dd>{product.return_window_days} days</dd></div><div><dt>Current Creator commission</dt><dd>{product.creator_promotion_enabled ? `${product.creator_commission_bps / 100}%` : 'Promotion unavailable'}</dd></div></dl></SectionCard><SectionCard title="About this product"><p className="creator-product-description">{product.description || 'The Seller has not provided a full description.'}</p>{product.attributes && <dl className="commerce-definition">{Object.entries(product.attributes).map(([key, value]) => <div key={key}><dt>{label(key)}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>}{Boolean(product.tags?.length) && <p>Tags: {product.tags?.join(', ')}</p>}</SectionCard><SectionCard title="Your promotion" description="Promoting this product uses the existing attribution service; it does not copy or transfer ownership of the Seller's catalog.">{promotions.map((promotion) => { const url = affiliateUrl(promotion); return <div className="creator-review-feedback" key={promotion.id}><StatusPill>{label(promotion.status)}</StatusPill><p>Commission snapshot: {promotion.commission_bps_snapshot / 100}% · Created {dateTime(promotion.created_at)}</p><p>Tracking code: {promotion.tracking_code}</p>{url && promotion.status === 'active' && <><label className="commerce-copy-field"><span className="sr-only">Your affiliate URL</span><input readOnly value={url} onFocus={(event) => event.target.select()} /></label><a href={url} target="_blank" rel="noopener noreferrer">Open your tracked product link</a></>}</div> })}{!promotions.length && <p>You have not promoted this product yet.</p>}{active ? <Button variant="secondary" to="/partner/creator/links">Manage your affiliate links</Button> : canPromoteProduct(product) ? <Button disabled={busy} onClick={() => void promote()}>{busy ? 'Creating promotion…' : promotions.length ? 'Reactivate promotion' : 'Create promotion'}</Button> : <CommerceNote>This product is not currently eligible for a new promotion. Your historical records are preserved.</CommerceNote>}</SectionCard><CommerceNote>Prices, eligibility and commission shown here reflect the loaded record. The backend checks current eligibility when you create a promotion. No payment or purchase is made here.</CommerceNote></>
  }}</CommerceResult></>
}
function Media({ media, title }: { media: DetailMedia; title: string }) {
  const load = useCallback(() => creatorMediaUrl(requireSupabase(), media), [media])
  const result = useCommerce(load)
  const [failed, setFailed] = useState(false)
  if (failed || result.error) return <div><p>Media unavailable or link expired.</p><Button variant="secondary" onClick={() => { setFailed(false); result.refresh() }}>Reload media</Button></div>
  if (!result.data) return <p role="status">Loading product media…</p>
  return media.media_type === 'video' ? <video controls preload="metadata" src={result.data} aria-label={media.alt_text || title} onError={() => setFailed(true)} /> : <img src={result.data} alt={media.alt_text || title} loading="lazy" onError={() => setFailed(true)} />
}
