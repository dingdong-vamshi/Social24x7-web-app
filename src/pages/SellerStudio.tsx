import { useCallback, useState, type FormEvent } from 'react'
import { ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { WorkspaceShell } from '../components/WorkspaceShell'
import { TeamChatMonitor } from '../features/chat/TeamChatMonitor'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, FilterBar, LoadingState, MetricCard, PageHeader, SectionCard, StatusPill } from '../components/Ui'
import { commerce, dateTime, label, money, PRODUCT_CATEGORIES, validateProductImages, type Product, type ProductDraft, type Storefront, type Order } from '../repositories/commerce'

const base = '/partner/seller'
export function SellerStudio() {
  const { user, loading, access } = useAuth()
  if (loading) return <LoadingState />
  if (!user || access?.seller_status !== 'approved') return <section className="commerce-access"><h1>Seller approval required</h1><p>Sign in with an approved Seller account to access your business records.</p><Button to={user ? '/partner/onboarding/seller' : '/partner/login'}>{user ? 'View Seller application' : 'Sign in'}</Button></section>
  return <WorkspaceShell role="seller"><SellerWorkspace key={user.id} userId={user.id} /></WorkspaceShell>
}

function SellerWorkspace({ userId }: { userId: string }) {
  const pathname = useLocation().pathname
  const section = pathname.split('/').filter(Boolean).slice(pathname.startsWith('/partner/') ? 2 : 1).join('/') || 'overview'
  const [selected, setSelected] = useState('')
  const load = useCallback(() => commerce.storefronts(userId), [userId])
  const result = useCommerce(load)
  return <CommerceResult result={result}>{(stores) => {
    const store = stores.find((item) => item.id === selected) ?? stores[0]
    if (!store) return <CommerceEmpty title="No storefront available" description="Your account has Seller approval, but no owned storefront was returned. Check your application in the existing app or contact support." />
    return <><div className="commerce-store-selector"><label>Storefront<select value={store.id} onChange={(event) => setSelected(event.target.value)}>{stores.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><StatusPill>{label(store.verification_status)}</StatusPill></div><SellerView key={`${store.id}:${section}`} section={section} store={store} singleStore={stores.length === 1} /></>
  }}</CommerceResult>
}

function SellerView({ section, store, singleStore }: { section: string; store: Storefront; singleStore: boolean }) {
  if (section === 'overview') return <Overview store={store} />
  if (section === 'products') return <Products store={store} singleStore={singleStore} />
  if (section === 'orders' || section === 'logistics') return <Orders store={store} logistics={section === 'logistics'} />
  if (section === 'returns') return <Returns store={store} />
  if (section === 'finance') return <Finance store={store} />
  if (section === 'team') return <Team store={store} />
  if (section === 'affiliate') return <Affiliate store={store} />
  if (section === 'analytics') return <Analytics store={store} />
  if (section === 'storefront' || section === 'discoverability' || section === 'account-health') return <StoreDetails store={store} section={section} />
  return <><PageHeader title="Page not found" description="This Seller page is not available." /><Button to={base}>Back to Seller Studio</Button></>
}

function Overview({ store }: { store: Storefront }) {
  const load = useCallback(async () => { const [products, orders, returns] = await Promise.all([commerce.products(store.id), commerce.orders(store.id), commerce.returns(store.id)]); return { products, orders, returns } }, [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Your business" title={store.name} description="A current view of your catalog and customer orders." actions={<Button variant="secondary" onClick={result.refresh}><RefreshCw size={16} />Refresh</Button>} /><CommerceResult result={result}>{(data) => <>
    <div className="metric-grid compact-metrics"><MetricCard label="Products" value={String(data.products.length)} detail={`${data.products.filter((p) => p.status === 'active').length} active products`} tone="green" /><MetricCard label="Orders" value={String(data.orders.length)} detail="Latest 500 orders" /><MetricCard label="Returns" value={String(data.returns.filter((r) => ['submitted', 'under_review'].includes(r.status)).length)} detail="Submitted or under review" /><MetricCard label="Store status" value={label(store.active ? store.verification_status : 'inactive')} detail="Current storefront record" tone="dark" /></div>
    <div className="commerce-two-column"><SectionCard title="Keep your business moving" description="Choose a workspace to work with your current records."><div className="commerce-quick-links"><Link to={`${base}/products`}>Manage your catalog <ArrowRight size={17} /></Link><Link to={`${base}/orders`}>Review customer orders <ArrowRight size={17} /></Link><Link to={`${base}/chat`}>Open Business Chat <ArrowRight size={17} /></Link><Link to={`${base}/affiliate`}>View creator promotions <ArrowRight size={17} /></Link></div></SectionCard><SectionCard title="Recent orders" description="Latest activity across this storefront">{data.orders.length ? data.orders.slice(0, 4).map((order) => <div className="commerce-summary-row" key={order.id}><div><strong>Order {order.id.slice(0, 8)}</strong><small>{dateTime(order.created_at)}</small></div><div><strong>{money(order.total_minor, order.currency)}</strong><StatusPill>{label(order.status)}</StatusPill></div></div>) : <CommerceEmpty title="No orders yet" description="Customer orders will appear here when placed." />}</SectionCard></div>
  </>}</CommerceResult></>
}

function Products({ store, singleStore }: { store: Storefront; singleStore: boolean }) {
  const load = useCallback(() => commerce.products(store.id), [store.id])
  const result = useCommerce(load)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState('')
  async function publish(product: Product) {
    if (!window.confirm(`Publish “${product.title}” to your live storefront?`)) return
    setBusy(product.id); setActionError(''); setMessage('')
    try { await commerce.publish(product.id); setMessage(`${product.title} is now published.`); result.refresh() }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Unable to publish this product.') }
    finally { setBusy('') }
  }
  return <><PageHeader eyebrow="Catalog" title="Products" description="Your Seller-owned catalog, inventory and publication status." actions={<><Button variant="secondary" onClick={result.refresh}><RefreshCw size={16} />Refresh</Button>{singleStore && <Button onClick={() => { setEditing('new'); setMessage('') }}><Plus size={17} />Add product</Button>}</>} />
    {!singleStore && <CommerceNote>Catalog editing is available in the existing application for accounts with multiple storefronts. The current save service selects the account’s default storefront.</CommerceNote>}
    {message && <p className="commerce-success" role="status">{message}</p>}{actionError && <p className="form-error" role="alert">{actionError}</p>}
    {editing ? <ProductEditor key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage('Product saved to your catalog.'); result.refresh() }} /> : <>
      <FilterBar value={query} onChange={setQuery} placeholder="Search product title or SKU"><select aria-label="Product status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{[...new Set(result.data?.map((p) => p.status))].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></FilterBar>
      <CommerceResult result={result}>{(products) => { const visible = products.filter((p) => `${p.title} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || p.status === status)); return visible.length ? <div className="table-card commerce-table"><table><thead><tr><th>Product</th><th>Price</th><th>Inventory</th><th>Status</th><th>Creator commission</th><th>Actions</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td data-label="Product"><strong>{product.title}</strong><small>{product.sku} · {product.category}</small></td><td data-label="Price">{money(product.sale_price_minor ?? product.price_minor, product.currency)}</td><td data-label="Inventory">{product.inventory}<small>{product.inventory_reserved} reserved</small></td><td data-label="Status"><StatusPill>{label(product.status)}</StatusPill><small>Approval: {label(product.product_approval_status)}</small></td><td data-label="Creator commission">{product.creator_promotion_enabled ? `${product.creator_commission_bps / 100}%` : 'Off'}</td><td data-label="Actions"><div className="commerce-row-actions">{singleStore && <button className="row-action" onClick={() => setEditing(product)}>Edit</button>}{singleStore && product.status === 'draft' && <button className="row-action" disabled={busy === product.id} onClick={() => void publish(product)}>{busy === product.id ? 'Publishing…' : 'Publish'}</button>}</div></td></tr>)}</tbody></table></div> : <CommerceEmpty title={products.length ? 'No matching products' : 'Your catalog is empty'} description={products.length ? 'Try a different search or status filter.' : 'Add your first product draft to get started.'} /> }}</CommerceResult>
      <CommerceNote>Showing up to 500 latest products. Publishing uses the existing product checks, including at least one image and available inventory.</CommerceNote>
    </>}</>
}

function ProductEditor({ product, onSaved, onCancel }: { product?: Product; onSaved: () => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ProductDraft>({ id: product?.id, title: product?.title ?? '', slug: product?.slug ?? '', category: product?.category ?? '', sku: product?.sku ?? '', price: product ? String(product.price_minor / 100) : '', salePrice: product?.sale_price_minor ? String(product.sale_price_minor / 100) : '', inventory: String(product?.inventory ?? 0), shortDescription: product?.short_description ?? '', description: product?.description ?? '', promotionEnabled: product?.creator_promotion_enabled ?? false, commission: String((product?.creator_commission_bps ?? 500) / 100), returnDays: String(product?.return_window_days ?? 0) })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | undefined>(product?.id)
  const field = (key: keyof ProductDraft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }))
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      validateProductImages(files, product?.product_media.length ?? 0)
      const saved = await commerce.saveProduct({ ...draft, id: savedId })
      setSavedId(saved.id)
      if (files.length) {
        try { await commerce.addProductImages(saved.id, files) }
        catch (cause) { throw new Error(`Product details were saved, but image attachment could not be confirmed. Review the saved product before retrying. ${cause instanceof Error ? cause.message : ''}`, { cause }) }
      }
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the product.') }
    finally { setBusy(false) }
  }
  return <SectionCard title={product ? 'Edit product' : 'Create product draft'} description="Your changes save to the shared catalog. New products remain drafts until published."><form className="commerce-form" onSubmit={(event) => void submit(event)}>
    <div className="commerce-form-grid"><label>Product title<input required minLength={2} maxLength={180} value={draft.title} onChange={(e) => field('title', e.target.value)} /></label><label>Product URL slug<input required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9\-]{1,62}" placeholder="linen-shirt" value={draft.slug} onChange={(e) => field('slug', e.target.value)} /></label><label>SKU<input required maxLength={80} value={draft.sku} onChange={(e) => field('sku', e.target.value)} /></label><label>Category<select aria-label="Category" required value={draft.category} onChange={(e) => field('category', e.target.value)}><option value="">Choose a category</option>{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Price ({product?.currency ?? 'INR'})<input required inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.price} onChange={(e) => field('price', e.target.value)} /></label><label>Sale price (optional)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.salePrice} onChange={(e) => field('salePrice', e.target.value)} /></label><label>Inventory<input required inputMode="numeric" type="number" min="0" step="1" value={draft.inventory} onChange={(e) => field('inventory', e.target.value)} /></label><label>Return window (days)<input required type="number" min="0" max="30" step="1" value={draft.returnDays} onChange={(e) => field('returnDays', e.target.value)} /></label></div>
    <label>Short description<textarea maxLength={180} value={draft.shortDescription} onChange={(e) => field('shortDescription', e.target.value)} /></label><label>Description<textarea rows={4} maxLength={8000} value={draft.description} onChange={(e) => field('description', e.target.value)} /></label>
    <label className="commerce-checkbox"><input type="checkbox" checked={draft.promotionEnabled} onChange={(e) => field('promotionEnabled', e.target.checked)} />Allow Creator promotion</label>{draft.promotionEnabled && <label>Creator commission (%)<input required type="number" min="5" max="70" step="0.01" value={draft.commission} onChange={(e) => field('commission', e.target.value)} /><small>Existing platform range: 5–70%.</small></label>}
    <label>Add product images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /><small>JPEG, PNG or WebP, up to 10 MiB each and 10 images per product. Uploaded when you save; existing images remain.</small></label>{files.length > 0 && <p>{files.length} image{files.length === 1 ? '' : 's'} selected, not yet uploaded.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="commerce-form-actions"><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</Button></div>
  </form></SectionCard>
}

function Orders({ store, logistics }: { store: Storefront; logistics: boolean }) {
  const load = useCallback(() => commerce.orders(store.id), [store.id])
  const result = useCommerce(load)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  return <><PageHeader eyebrow="Operations" title={logistics ? 'Logistics' : 'Orders'} description={logistics ? 'Carrier and tracking details recorded against your orders.' : 'Customer orders and their current fulfillment and payment status.'} actions={<Button variant="secondary" onClick={result.refresh}><RefreshCw size={16} />Refresh</Button>} /><FilterBar value={query} onChange={setQuery} placeholder="Search order ID or product"><select aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{[...new Set(result.data?.map((o) => o.status))].map((s) => <option value={s} key={s}>{label(s)}</option>)}</select></FilterBar><CommerceResult result={result}>{(orders) => { const visible = orders.filter((o) => (status === 'all' || o.status === status) && `${o.id} ${o.order_items.map((i) => i.product_title_snapshot).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())); return visible.length ? <div className="commerce-record-list">{visible.map((order) => <OrderRecord key={order.id} order={order} />)}</div> : <CommerceEmpty title="No matching orders" description="Orders for this storefront will appear here. Try clearing any filters." /> }}</CommerceResult><CommerceNote>Showing up to 500 latest orders. Fulfillment changes are available in the existing Seller application. Carrier booking and payment capture are not available here.</CommerceNote></>
}

function OrderRecord({ order }: { order: Order }) {
  return <details className="commerce-record"><summary><span><strong>Order {order.id.slice(0, 8)}</strong><small>{dateTime(order.created_at)}</small></span><StatusPill>{label(order.status)}</StatusPill><strong>{money(order.total_minor, order.currency)}</strong><span className="commerce-details-hint">View details</span></summary><div className="commerce-record-body"><p className="commerce-identifier">Order ID: {order.id}</p><dl className="commerce-definition"><div><dt>Payment status</dt><dd>{label(order.payment_status || 'unknown')}</dd></div><div><dt>Payment method</dt><dd>{label(order.payment_method || 'unknown')}</dd></div><div><dt>Carrier</dt><dd>{order.order_fulfillments?.carrier || 'Not recorded'}</dd></div><div><dt>Tracking number</dt><dd>{order.order_fulfillments?.tracking_number || 'Not recorded'}</dd></div></dl>{order.order_items.map((item) => <div key={item.id} className="commerce-summary-row"><span>{item.product_title_snapshot} × {item.quantity}</span><strong>{money(item.subtotal_minor, order.currency)}</strong></div>)}{order.order_fulfillments?.customer_note && <p>{order.order_fulfillments.customer_note}</p>}</div></details>
}

function Returns({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.returns(store.id), [store.id])
  const result = useCommerce(load)
  const [status, setStatus] = useState('all')
  return <><PageHeader eyebrow="Customer care" title="Returns" description="Return requests and review notes for your storefront." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><label className="commerce-filter-label">Return status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{[...new Set(result.data?.map((r) => r.status))].map((s) => <option value={s} key={s}>{label(s)}</option>)}</select></label><CommerceResult result={result}>{(rows) => { const visible = rows.filter((r) => status === 'all' || status === r.status); return visible.length ? <div className="commerce-record-list">{visible.map((row) => <details className="commerce-record" key={row.id}><summary><span><strong>Return {row.id.slice(0, 8)}</strong><small>{dateTime(row.requested_at)}</small></span><span>{label(row.reason)}</span><StatusPill>{label(row.status)}</StatusPill><span className="commerce-details-hint">View details</span></summary><div className="commerce-record-body"><p className="commerce-identifier">Order ID: {row.order_id}</p><p>{row.details || 'No additional customer details.'}</p><p><strong>Review note:</strong> {row.admin_note || 'No review note yet.'}</p></div></details>)}</div> : <CommerceEmpty title="No matching returns" /> }}</CommerceResult><CommerceNote>Latest 500 return requests. Use the existing Seller application to review evidence and make return decisions. Refund execution is unavailable on this web surface.</CommerceNote></>
}

function Finance({ store }: { store: Storefront }) {
  const load = useCallback(async () => { const [orders, commissions] = await Promise.all([commerce.orders(store.id), commerce.commissions(store.id, 'seller')]); return { orders, commissions } }, [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Financial records" title="Finance" description="Order values and creator commissions from the existing ledger." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{({ orders, commissions }) => <><OrderTotals orders={orders} /><SectionCard title="Creator commission ledger" description="Recorded commissions for this storefront; INR minor units.">{commissions.length ? <div className="table-card commerce-table"><table><thead><tr><th>Order</th><th>Commission</th><th>Status</th><th>Recorded</th></tr></thead><tbody>{commissions.map((row) => <tr key={row.id}><td data-label="Order">{row.order_id.slice(0, 8)}</td><td data-label="Commission">{money(row.commission_minor)}</td><td data-label="Status"><StatusPill>{label(row.status)}</StatusPill></td><td data-label="Recorded">{dateTime(row.created_at)}</td></tr>)}</tbody></table></div> : <CommerceEmpty title="No commission records" />}</SectionCard></>}</CommerceResult><CommerceNote>Totals cover the latest 500 orders and commission rows. Order value is not your available balance. Payout timing, settlement balances, fees and refunds are not calculated or executed here.</CommerceNote></>
}

function OrderTotals({ orders }: { orders: Order[] }) {
  const currencies = [...new Set(orders.map((o) => o.currency))]
  return <div className="metric-grid compact-metrics">{currencies.length ? currencies.map((currency) => <MetricCard key={currency} label={`Delivered order value · ${currency}`} value={money(orders.filter((o) => o.currency === currency && o.status === 'delivered').reduce((sum, o) => sum + o.total_minor, 0), currency)} detail="Delivered orders only; before adjustments" tone="green" />) : <MetricCard label="Orders" value="0" detail="No order values recorded" />}<MetricCard label="Recorded orders" value={String(orders.length)} detail="Latest 500, all statuses" /><MetricCard label="Delivered orders" value={String(orders.filter((o) => o.status === 'delivered').length)} detail="Current recorded status" /></div>
}

function Team({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.team(store.id), [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Business access" title="Team & verification" description="Team permissions and assigned customer-chat monitoring." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{(data) => <><CommerceNote>Store verification: {label(data.storefront.verificationStatus)}. Work identities use separate business credentials. Invitations, activation, approvals and permission changes remain in the existing application.</CommerceNote><TeamChatMonitor storefrontId={store.id} members={data.members}/><h2>Team members & permissions</h2>{data.members.length ? <div className="commerce-record-list">{data.members.map((member) => <details className="commerce-record" key={member.id}><summary><span><strong>{member.fullName}</strong><small>{member.jobTitle || member.roleName}</small></span><StatusPill>{label(member.status)}</StatusPill><span>{member.roleName}</span><span className="commerce-details-hint">Permissions</span></summary><div className="commerce-record-body"><p>Identity: {label(member.identityKind)}</p><ul>{member.permissions.map((permission) => <li key={permission}>{data.permissionCatalog.find((p) => p.code === permission)?.label || label(permission)}</li>)}</ul>{member.status !== 'verified' && <p>This identity does not have verified business access.</p>}</div></details>)}</div> : <CommerceEmpty title="No team members" />}</>}</CommerceResult></>
}

function Affiliate({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.sellerPromotions(store.id), [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Creator commerce" title="Affiliate & creators" description="Creator promotions attached to your own products." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{(rows) => rows.length ? <div className="table-card commerce-table"><table><thead><tr><th>Product</th><th>Promotion</th><th>Commission</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="Product">{row.products?.title || 'Product unavailable'}</td><td data-label="Promotion"><code>{row.tracking_code}</code></td><td data-label="Commission">{row.commission_bps_snapshot / 100}%</td><td data-label="Status"><StatusPill>{label(row.status)}</StatusPill></td><td data-label="Created">{dateTime(row.created_at)}</td></tr>)}</tbody></table></div> : <CommerceEmpty title="No creator promotions yet" description="Eligible Creator promotions will appear when creators choose your products." />}</CommerceResult><CommerceNote>Showing up to 500 promotions. Enable creator promotion and commission on a product in your catalog.</CommerceNote></>
}

function Analytics({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.orders(store.id), [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Recorded activity" title="Analytics" description="Order status counts derived from this storefront’s records." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{(orders) => <><OrderTotals orders={orders} /><SectionCard title="Orders by current status" description="Latest 500 orders; no estimated growth or conversion metrics.">{orders.length ? <div className="commerce-status-bars">{[...new Set(orders.map((o) => o.status))].map((status) => { const count = orders.filter((o) => o.status === status).length; return <div key={status}><span>{label(status)} <strong>{count}</strong></span><meter min={0} max={orders.length} value={count} aria-label={`${label(status)} orders: ${count}`} /></div> })}</div> : <CommerceEmpty title="No order activity yet" />}</SectionCard></>}</CommerceResult><CommerceNote>Visitor attribution, advertising ROI and account health scores are not calculated in this release.</CommerceNote></>
}

function StoreDetails({ store, section }: { store: Storefront; section: string }) {
  const seo = section === 'discoverability'
  const health = section === 'account-health'
  const pairs = seo ? [['Search title', store.seo_title], ['Search description', store.seo_description], ['AI discovery summary', store.llm_summary]] : health ? [['Seller storefront verification', label(store.verification_status)], ['Store availability', store.active ? 'Active' : 'Inactive']] : [['Name', store.name], ['Store URL', store.slug], ['Tagline', store.tagline], ['Description', store.description], ['Category', store.primary_category], ['City', store.city], ['State', store.state_code]]
  return <><PageHeader eyebrow="Store settings" title={seo ? 'SEO & AI' : health ? 'Account health' : 'Storefront'} description={seo ? 'Your saved search and AI discovery information.' : health ? 'Current verification and availability from the backend.' : 'Your business presence shared with the existing application.'} /><SectionCard title={store.name}><dl className="commerce-definition">{pairs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl></SectionCard><CommerceNote>{seo ? 'These are saved profile fields. AI generation and search performance reporting are not available on web yet.' : health ? 'No synthetic health score is calculated. Application review and approval remain controlled by the existing admin workflow.' : 'Update storefront details in the existing application. This view reflects the same storefront record.'}</CommerceNote></>
}
