import { useCallback, useState } from 'react'
import { ArrowRight, Copy, ExternalLink, Plus, RefreshCw, ShoppingBag } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { WorkspaceShell } from '../components/WorkspaceShell'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, FilterBar, LoadingState, MetricCard, PageHeader, SectionCard, StatusPill } from '../components/Ui'
import { affiliateUrl, commerce, commissionTotals, dateTime, label, money, type Product, type Promotion } from '../repositories/commerce'

const base = '/partner/creator'
export function CreatorCenter() {
  const { user, loading, access } = useAuth()
  const path = useLocation().pathname
  const section = path.split('/').filter(Boolean).slice(path.startsWith('/partner/') ? 2 : 1).join('/') || 'overview'
  if (loading) return <LoadingState />
  if (!user || access?.creator_status !== 'approved') return <section className="commerce-access"><h1>Creator approval required</h1><p>Sign in with an approved Creator account to access your promotions and earnings.</p><Button to={user ? '/partner/onboarding/creator' : '/partner/login'}>{user ? 'View Creator application' : 'Sign in'}</Button></section>
  return <WorkspaceShell role="creator"><CreatorView key={`${user.id}:${section}`} section={section} userId={user.id} /></WorkspaceShell>
}
function CreatorView({ section, userId }: { section: string; userId: string }) {
  if (section === 'overview' || section === 'analytics') return <Overview userId={userId} analytics={section === 'analytics'} />
  if (section === 'discover') return <Discover userId={userId} />
  if (section === 'promotions' || section === 'links') return <Promotions userId={userId} links={section === 'links'} />
  if (section === 'earnings') return <Earnings userId={userId} />
  if (section === 'profile') return <Profile />
  return <><PageHeader title="Page not found" description="This Creator page is not available." /><Button to={base}>Back to Creator Center</Button></>
}

function Overview({ userId, analytics }: { userId: string; analytics: boolean }) {
  const { profile } = useAuth()
  const load = useCallback(async () => {
    const [promotions, commissions] = await Promise.all([commerce.promotions(userId), commerce.commissions(userId, 'creator')])
    const clicks = await commerce.clicks(promotions.map((p) => p.id))
    return { promotions, commissions, clicks }
  }, [userId])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Creator commerce" title={analytics ? 'Creator analytics' : `Welcome, ${profile?.display_name || profile?.username || 'Creator'}`} description={analytics ? 'Activity recorded against your promotions and commissions.' : 'Your products, promotions and recorded earnings in one place.'} actions={<Button variant="secondary" onClick={result.refresh}><RefreshCw size={16} />Refresh</Button>} />
    <CommerceResult result={result}>{({ promotions, commissions, clicks }) => <>
      <div className="metric-grid compact-metrics"><MetricCard label="Active promotions" value={String(promotions.filter((p) => p.status === 'active').length)} detail="Your current active links" tone="green" /><MetricCard label="Recorded clicks" value={clicks.toLocaleString('en-IN')} detail="Exact click count for loaded promotions" /><MetricCard label="Attributed orders" value={String(new Set(commissions.map((c) => c.order_id)).size)} detail="Orders represented in commission records" /><MetricCard label="Paid commission" value={money(commissionTotals(commissions).paid ?? 0)} detail="Ledger rows marked paid" tone="dark" /></div>
      <div className="commerce-two-column"><SectionCard title={analytics ? 'Commission by recorded status' : 'Your creator workspace'} description={analytics ? 'Each status is separate; these are not an available balance.' : 'Promote Seller-owned products and follow your own results.'}>{analytics ? <dl className="commerce-definition">{Object.entries(commissionTotals(commissions)).map(([status, amount]) => <div key={status}><dt>{label(status)}</dt><dd>{money(amount)}</dd></div>)}{!commissions.length && <CommerceEmpty title="No commission activity yet" />}</dl> : <div className="commerce-quick-links"><Link to={`${base}/discover`}>Discover eligible products <ArrowRight size={17} /></Link><Link to={`${base}/links`}>Share your affiliate links <ArrowRight size={17} /></Link><Link to={`${base}/earnings`}>Review your earnings <ArrowRight size={17} /></Link><Link to={`${base}/chat`}>Open Seller conversations <ArrowRight size={17} /></Link></div>}</SectionCard><SectionCard title="Recent promotions" description="Latest links created from your account">{promotions.length ? promotions.slice(0, 4).map((p) => <div key={p.id} className="commerce-summary-row"><div><strong>{p.products?.title || 'Product unavailable'}</strong><small>{dateTime(p.created_at)}</small></div><StatusPill>{label(p.status)}</StatusPill></div>) : <CommerceEmpty title="No promotions yet" description="Choose an eligible product to create your first promotion." />}</SectionCard></div>
    </>}</CommerceResult><CommerceNote>Promotions and commission summaries cover up to 500 latest records. All figures come from your authorized account records.</CommerceNote>
  </>
}

function Discover({ userId }: { userId: string }) {
  const load = useCallback(async () => { const [products, promotions] = await Promise.all([commerce.discovery(), commerce.promotions(userId)]); return { products, promotions } }, [userId])
  const result = useCommerce(load)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [creating, setCreating] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function promote(product: Product) {
    setCreating(product.id); setError(''); setMessage('')
    try { await commerce.promote(product.id); setMessage(`Your promotion for ${product.title} is ready. Open Affiliate links to share it.`); result.refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to create this promotion.') }
    finally { setCreating('') }
  }
  return <><PageHeader eyebrow="Creator marketplace" title="Discover products" description="Find approved Seller products available for Creator promotion." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><FilterBar value={query} onChange={setQuery} placeholder="Search products or sellers"><select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{[...new Set(result.data?.products.map((p) => p.category))].map((c) => <option value={c} key={c}>{c}</option>)}</select></FilterBar>{error && <p className="form-error" role="alert">{error}</p>}{message && <div className="commerce-success" role="status">{message} <Link to={`${base}/links`}>View links</Link></div>}<CommerceResult result={result}>{({ products, promotions }) => { const visible = products.filter((p) => (category === 'all' || p.category === category) && `${p.title} ${p.storefronts?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())); return visible.length ? <div className="commerce-discovery-grid">{visible.map((product) => { const active = promotions.some((p) => p.product_id === product.id && p.status === 'active'); return <article key={product.id} className="commerce-product-card"><ProductImage product={product} /><div className="commerce-product-copy"><small>{product.storefronts?.name || 'Seller storefront'}</small><h2>{product.title}</h2><p>{product.short_description || product.category}</p><div className="commerce-product-facts"><span><small>Product price</small><strong>{money(product.sale_price_minor ?? product.price_minor, product.currency)}</strong></span><span><small>Commission</small><strong>{product.creator_commission_bps / 100}%</strong></span></div>{active ? <Button variant="secondary" to={`${base}/links`}>View your promotion <ArrowRight size={16} /></Button> : <Button disabled={Boolean(creating)} onClick={() => void promote(product)}>{creating === product.id ? 'Creating promotion…' : 'Create promotion'} <Plus size={16} /></Button>}</div></article> })}</div> : <CommerceEmpty title={products.length ? 'No matching products' : 'No eligible products available'} description="Only active, approved, in-stock products with Creator promotion enabled appear here. Try clearing your filters or check again later." /> }}</CommerceResult><CommerceNote>Showing up to 80 eligible products. The existing approval and attribution service validates every promotion. Products remain owned by their Sellers.</CommerceNote></>
}

function ProductImage({ product }: { product: Product }) {
  const load = useCallback(() => commerce.imageUrl(product), [product])
  const result = useCommerce(load)
  const [failed, setFailed] = useState(false)
  return <div className="commerce-product-image">{result.data && !failed ? <img src={result.data} alt={product.title} loading="lazy" onError={() => setFailed(true)} /> : <div><ShoppingBag size={36} /><span>{result.data === undefined && !result.error ? 'Loading image…' : 'Image unavailable'}</span></div>}<span className="commerce-product-category">{product.category}</span></div>
}

function Promotions({ userId, links }: { userId: string; links: boolean }) {
  const load = useCallback(() => commerce.promotions(userId), [userId])
  const result = useCommerce(load)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [copied, setCopied] = useState('')
  const [error, setError] = useState('')
  async function copy(promotion: Promotion) {
    const url = affiliateUrl(promotion)
    if (!url) { setError('The product destination is unavailable. Refresh or contact the Seller.'); return }
    setCopied(''); setError('')
    try { await navigator.clipboard.writeText(url); setCopied(promotion.id) }
    catch { setError('Clipboard access was unavailable. Select and copy the displayed link manually.') }
  }
  return <><PageHeader eyebrow={links ? 'Share and attribute' : 'Creator commerce'} title={links ? 'Affiliate links' : 'Promotions'} description="Your canonical tracking links open the existing SOCIAL 24-7 product experience." actions={<><Button variant="secondary" onClick={result.refresh}>Refresh</Button><Button to={`${base}/discover`}><Plus size={17} />New promotion</Button></>} /><FilterBar value={query} onChange={setQuery} placeholder="Search product, seller or tracking code"><select aria-label="Promotion status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{[...new Set(result.data?.map((p) => p.status))].map((s) => <option value={s} key={s}>{label(s)}</option>)}</select></FilterBar>{error && <p className="form-error" role="alert">{error}</p>}{copied && <p className="commerce-success" role="status">Affiliate link copied.</p>}<CommerceResult result={result}>{(rows) => { const visible = rows.filter((p) => (status === 'all' || p.status === status) && `${p.products?.title ?? ''} ${p.products?.storefronts?.name ?? ''} ${p.tracking_code}`.toLowerCase().includes(query.trim().toLowerCase())); return visible.length ? <div className="commerce-record-list">{visible.map((promotion) => { const url = affiliateUrl(promotion); return <article className="commerce-promotion" key={promotion.id}><div className="commerce-promotion-heading"><div><h2>{promotion.products?.title || 'Product unavailable'}</h2><p>{promotion.products?.storefronts?.name || 'Seller unavailable'} · {promotion.commission_bps_snapshot / 100}% commission</p></div><StatusPill>{label(promotion.status)}</StatusPill></div><p className="commerce-muted">Created {dateTime(promotion.created_at)}</p>{url ? <><label className="commerce-copy-field"><span className="sr-only">Affiliate link for {promotion.products?.title}</span><input readOnly value={url} onFocus={(event) => event.target.select()} /></label><div className="commerce-row-actions"><Button variant="secondary" disabled={promotion.status !== 'active'} onClick={() => void copy(promotion)}><Copy size={16} />{copied === promotion.id ? 'Copied' : 'Copy link'}</Button>{promotion.status === 'active' && <a className="button ghost" href={url} target="_blank" rel="noopener noreferrer">Open product <ExternalLink size={16} /></a>}</div>{promotion.status !== 'active' && <CommerceNote>This promotion is not active. Open Discover products to create or reactivate an eligible promotion.</CommerceNote>}</> : <CommerceNote>The product destination is unavailable. This link cannot be shared.</CommerceNote>}</article> })}</div> : <CommerceEmpty title="No matching promotions" description="Create a promotion from Discover products, or clear your filters." /> }}</CommerceResult><CommerceNote>Up to 500 latest promotions. Links use the existing product route and tracking code, preserving the same attribution service used by the mobile application.</CommerceNote></>
}

function Earnings({ userId }: { userId: string }) {
  const load = useCallback(() => commerce.commissions(userId, 'creator'), [userId])
  const result = useCommerce(load)
  const [status, setStatus] = useState('all')
  return <><PageHeader eyebrow="Commission ledger" title="Earnings" description="Your recorded commissions and their current settlement status." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{(rows) => <><div className="metric-grid compact-metrics">{Object.entries(commissionTotals(rows)).map(([state, amount]) => <MetricCard key={state} label={label(state)} value={money(amount)} detail={`${rows.filter((r) => r.status === state).length} ledger records`} tone={state === 'paid' ? 'green' : 'plain'} />)}</div><label className="commerce-filter-label">Commission status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{Object.keys(commissionTotals(rows)).map((s) => <option value={s} key={s}>{label(s)}</option>)}</select></label>{rows.filter((r) => status === 'all' || status === r.status).length ? <div className="table-card commerce-table"><table><thead><tr><th>Order</th><th>Eligible item value</th><th>Commission</th><th>Status</th><th>Recorded</th></tr></thead><tbody>{rows.filter((r) => status === 'all' || status === r.status).map((row) => <tr key={row.id}><td data-label="Order"><strong>{row.order_id.slice(0, 8)}</strong><small>{row.id.slice(0, 8)}</small></td><td data-label="Eligible item value">{money(row.eligible_item_minor)}</td><td data-label="Commission"><strong>{money(row.commission_minor)}</strong></td><td data-label="Status"><StatusPill>{label(row.status)}</StatusPill>{row.reversal_reason && <small>{row.reversal_reason}</small>}{row.paid_at && <small>Paid {dateTime(row.paid_at)}</small>}</td><td data-label="Recorded">{dateTime(row.created_at)}</td></tr>)}</tbody></table></div> : <CommerceEmpty title="No commission records" description="Commission records appear when the existing attribution service records an eligible order." />}</>}</CommerceResult><CommerceNote>Showing up to 500 latest ledger records in INR. Statuses come from the backend; totals are not a withdrawable balance. Payout requests and money movement are unavailable on web.</CommerceNote></>
}

function Profile() {
  const { profile, access } = useAuth()
  return <><PageHeader eyebrow="Creator identity" title="Profile" description="Your existing SOCIAL 24-7 identity and commerce approval status." /><SectionCard title={profile?.display_name || profile?.username || 'Your profile'}><dl className="commerce-definition"><div><dt>Username</dt><dd>{profile?.username ? `@${profile.username}` : 'Not provided'}</dd></div><div><dt>Creator approval</dt><dd><StatusPill>{label(access?.creator_status || 'unknown')}</StatusPill></dd></div><div><dt>Professional verification</dt><dd>{label(access?.professional_status || 'unknown')}</dd></div><div><dt>Seller approval</dt><dd>{label(access?.seller_status || 'unknown')}</dd></div></dl></SectionCard><CommerceNote>Profile edits and professional evidence updates remain in the existing application. Verification is shown only from the shared backend; ordinary Creator approval does not imply professional verification.</CommerceNote></>
}
