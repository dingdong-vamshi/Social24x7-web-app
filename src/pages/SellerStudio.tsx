import { ProductMediaEditor } from './ProductMediaEditor'
import { useCallback, useRef, useState, type FormEvent } from 'react'
import { requireSupabase } from '../lib/supabase'
import { OrderRangeFilters, ProductSeoEditor, TrafficAnalytics } from '../features/sellerSprint/SellerTools'
import { emptyOrderFilters, sellerSprintRepository, type SellerOrder } from '../features/sellerSprint/repository'
import { AffiliateProducts, FinanceSummary, LogisticsSummary, ReturnPerformance, ReturnSettings, SellerOperations } from '../features/sellerSprint/ParityTools'
import { emptyReturnFilters, filterReturns, originalSellerPlaceholders, productDraftKey, restoreProductDraft, type SellerProductDraft } from '../features/sellerSprint/parity'
import { operationalOrderQueues } from '../features/sellerSprint/orderQueues'
import { ArrowRight, Plus, RefreshCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { WorkspaceShell } from '../components/WorkspaceShell'
import { FulfillmentEditor, ReturnReview, StoreEditor, CounterpartyDirectory } from './CommerceOperations'
import { TeamManagement } from '../features/team/TeamManagement'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, FilterBar, LoadingState, MetricCard, PageHeader, SectionCard, StatusPill } from '../components/Ui'
import { commerce, dateTime, label, money, PRODUCT_CATEGORIES, validateProductImages, type Product, type Storefront, type Order } from '../repositories/commerce'

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
    return <><div className="commerce-store-selector"><label>Storefront<select value={store.id} onChange={(event) => setSelected(event.target.value)}>{stores.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><StatusPill>{label(store.verification_status)}</StatusPill></div><SellerView key={`${store.id}:${section}`} section={section} store={store} singleStore={stores.length === 1} onStoreSaved={result.refresh} /></>
  }}</CommerceResult>
}

function SellerView({ section, store, singleStore, onStoreSaved }: { section: string; store: Storefront; singleStore: boolean; onStoreSaved: () => void }) {
  if (originalSellerPlaceholders[section]) return <><PageHeader title={originalSellerPlaceholders[section]} description="Coming Soon — this module is also a placeholder in the original application."/><SectionCard title="Not yet available"><p>No campaign, shipping, automation or financial action is performed by this page. Existing supported business tools remain available in the navigation.</p><Button to={base}>Back to overview</Button></SectionCard></>
  if (section === 'overview') return <Overview store={store} />
  if (section === 'products' || section === 'products/add') return <Products store={store} singleStore={singleStore} startNew={section === 'products/add'} />
  if (section === 'orders' || ['logistics', 'logistics/fulfillment', 'logistics/shipping'].includes(section)) return <Orders store={store} logistics={section !== 'orders'} />
  if (section === 'returns') return <Returns store={store} />
  if (section === 'orders/return-settings') return <ReturnSettings storeId={store.id}/>
  if (section === 'operations') return <SellerOperations storeId={store.id}/>
  if (section === 'finance') return <><FinanceSummary storeId={store.id}/><Finance store={store} /></>
  if (section === 'team') return <Team store={store} />
  if (section === 'affiliate') return <><AffiliateProducts storeId={store.id} singleStore={singleStore}/><Affiliate store={store} /></>
  if (section === 'analytics') return <Analytics store={store} />
  if (section === 'storefront' || section === 'discoverability' || section === 'account-health') return <StoreDetails store={store} section={section} onSaved={onStoreSaved} />
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

function Products({ store, singleStore, startNew = false }: { store: Storefront; singleStore: boolean; startNew?: boolean }) {
  const load = useCallback(() => commerce.products(store.id), [store.id])
  const result = useCommerce(load)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState<Product | 'new' | null>(startNew && singleStore ? 'new' : null)
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
    {editing ? <ProductEditor key={editing === 'new' ? 'new' : editing.id} storeId={store.id} product={editing === 'new' ? undefined : editing} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); setMessage('Product saved to your catalog.'); result.refresh() }} /> : <>
      <FilterBar value={query} onChange={setQuery} placeholder="Search product title or SKU"><select aria-label="Product status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option>{[...new Set(result.data?.map((p) => p.status))].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></FilterBar>
      <CommerceResult result={result}>{(products) => { const visible = products.filter((p) => `${p.title} ${p.sku}`.toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || p.status === status)); return visible.length ? <div className="table-card commerce-table"><table><thead><tr><th>Product</th><th>Price</th><th>Inventory</th><th>Status</th><th>Creator commission</th><th>Actions</th></tr></thead><tbody>{visible.map((product) => <tr key={product.id}><td data-label="Product"><strong>{product.title}</strong><small>{product.sku} · {product.category}</small></td><td data-label="Price">{money(product.sale_price_minor ?? product.price_minor, product.currency)}</td><td data-label="Inventory">{product.inventory}<small>{product.inventory_reserved} reserved</small></td><td data-label="Status"><StatusPill>{label(product.status)}</StatusPill><small>Approval: {label(product.product_approval_status)}</small></td><td data-label="Creator commission">{product.creator_promotion_enabled ? `${product.creator_commission_bps / 100}%` : 'Off'}</td><td data-label="Actions"><div className="commerce-row-actions">{singleStore && <button className="row-action" onClick={() => { setEditing(product); setMessage(''); setActionError('') }}>Edit</button>}{singleStore && product.status === 'draft' && <button className="row-action" disabled={busy === product.id} onClick={() => void publish(product)}>{busy === product.id ? 'Publishing…' : 'Publish'}</button>}</div></td></tr>)}</tbody></table></div> : <CommerceEmpty title={products.length ? 'No matching products' : 'Your catalog is empty'} description={products.length ? 'Try a different search or status filter.' : 'Add your first product draft to get started.'} /> }}</CommerceResult>
      <CommerceNote>Showing up to 500 latest products. Publishing uses the existing product checks, including at least one image and available inventory.</CommerceNote>
    </>}</>
}

function ProductEditor({ product, storeId, onSaved, onCancel }: { product?: Product; storeId: string; onSaved: () => void; onCancel: () => void }) {
  const { user } = useAuth()
  const storageKey = productDraftKey(user!.id, storeId)
  const [draft, setDraft] = useState<SellerProductDraft>(() => {
    const initial = { id: product?.id, title: product?.title ?? '', slug: product?.slug ?? '', category: product?.category ?? '', sku: product?.sku ?? '', price: product ? String(product.price_minor / 100) : '', salePrice: product?.sale_price_minor ? String(product.sale_price_minor / 100) : '', inventory: String(product?.inventory ?? 0), shortDescription: product?.short_description ?? '', description: product?.description ?? '', promotionEnabled: product?.creator_promotion_enabled ?? false, commission: String((product?.creator_commission_bps ?? 500) / 100), returnDays: String(product?.return_window_days ?? 0), brand: '', tags: '', keywords: '', seoTitle: '', seoDescription: '', discoverySummary: '' }
    if (product) return initial
    try { return restoreProductDraft(localStorage.getItem(storageKey), initial) } catch { return initial }
  })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [savedId, setSavedId] = useState<string | undefined>(product?.id)
  const pending = useRef(false)
  const [draftStorageFailed, setDraftStorageFailed] = useState(false)
  const field = (key: keyof SellerProductDraft, value: string | boolean) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (!product && !savedId) { try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { setDraftStorageFailed(true) } }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return
    pending.current = true; setBusy(true); setError('')
    try {
      if ((draft.brand?.trim().length ?? 0) > 120) throw new Error('Brand must be at most 120 characters.')
      validateProductImages(files, product?.product_media.length ?? 0)
      const saved = await commerce.saveProduct({ ...draft, id: savedId })
      setSavedId(saved.id)
      if (!product) { try { localStorage.removeItem(storageKey) } catch { /* A storage failure must not conceal a successful backend save. */ } }
      if (!product) {
        try {
          const repository = sellerSprintRepository(requireSupabase()), current = await repository.productSeo(saved.id, storeId)
          const list = (text: string | undefined) => [...new Set((text ?? '').split(',').map(value => value.trim()).filter(Boolean))]
          await repository.saveProductSeo(saved.id, storeId, { ...current, brand: draft.brand || '', tags: list(draft.tags), search_keywords: list(draft.keywords), seo_title: draft.seoTitle || null, seo_description: draft.seoDescription || null, llm_summary: draft.discoverySummary || null })
        } catch (cause) { throw new Error(`Product details were saved, but search metadata could not be confirmed. Your fields are retained; retry here or edit the saved product from the catalog. ${cause instanceof Error ? cause.message : ''}`, { cause }) }
      }
      if (files.length) {
        try { await commerce.addProductImages(saved.id, files) }
        catch (cause) { throw new Error(`Product details were saved, but image attachment could not be confirmed. Review the saved product before retrying. ${cause instanceof Error ? cause.message : ''}`, { cause }) }
      }
      onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the product.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <><SectionCard title={product ? 'Edit product' : 'Create product draft'} description="Your changes save to the shared catalog. New products remain drafts until published."><form className="commerce-form" onSubmit={(event) => void submit(event)}>
    <div className="commerce-form-grid"><label>Product title<input required minLength={2} maxLength={180} value={draft.title} onChange={(e) => field('title', e.target.value)} /></label><label>Product URL slug<input required minLength={2} maxLength={63} pattern="[a-z0-9][a-z0-9\-]{1,62}" placeholder="linen-shirt" value={draft.slug} onChange={(e) => field('slug', e.target.value)} /></label><label>SKU<input required maxLength={80} value={draft.sku} onChange={(e) => field('sku', e.target.value)} /></label><label>Category<select aria-label="Category" required value={draft.category} onChange={(e) => field('category', e.target.value)}><option value="">Choose a category</option>{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label>Price ({product?.currency ?? 'INR'})<input required inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.price} onChange={(e) => field('price', e.target.value)} /></label><label>Sale price (optional)<input inputMode="decimal" type="number" min="0.01" step="0.01" value={draft.salePrice} onChange={(e) => field('salePrice', e.target.value)} /></label><label>Inventory<input required inputMode="numeric" type="number" min="0" step="1" value={draft.inventory} onChange={(e) => field('inventory', e.target.value)} /></label><label>Return window (days)<input required type="number" min="0" max="30" step="1" value={draft.returnDays} onChange={(e) => field('returnDays', e.target.value)} /></label></div>
    {!product && <p role="status">{draftStorageFailed ? 'Browser draft storage is unavailable. Save this product before leaving.' : savedId ? 'Product details are saved in your catalog. Review that record before starting another product.' : 'Unsaved text resumes in this browser for this account and storefront. Images must be reselected after leaving. Save product to persist the draft to your shared catalog.'}</p>}
    <label>Short description<textarea aria-label="Short description" maxLength={180} value={draft.shortDescription} onChange={(e) => field('shortDescription', e.target.value)} /></label><label>Description<textarea aria-label="Description" rows={4} maxLength={8000} value={draft.description} onChange={(e) => field('description', e.target.value)} /></label>
    {!product && <div className="commerce-form-grid"><label>Brand<input maxLength={120} value={draft.brand || ''} onChange={e => field('brand', e.target.value)}/></label><label>Tags<input value={draft.tags || ''} onChange={e => field('tags', e.target.value)}/><small>Separate tags with commas.</small></label><label>Search keywords<input value={draft.keywords || ''} onChange={e => field('keywords', e.target.value)}/><small>Separate keywords with commas.</small></label><label>Product search title<input value={draft.seoTitle || ''} onChange={e => field('seoTitle', e.target.value)}/></label><label>Product search description<textarea value={draft.seoDescription || ''} onChange={e => field('seoDescription', e.target.value)}/></label><label>Product AI-discovery summary<textarea value={draft.discoverySummary || ''} onChange={e => field('discoverySummary', e.target.value)}/></label></div>}
    <label className="commerce-checkbox"><input type="checkbox" checked={draft.promotionEnabled} onChange={(e) => field('promotionEnabled', e.target.checked)} />Allow Creator promotion</label>{draft.promotionEnabled && <label>Creator commission (%)<input required type="number" min="5" max="70" step="0.01" value={draft.commission} onChange={(e) => field('commission', e.target.value)} /><small>Existing platform range: 5–70%.</small></label>}
    <label>Add product images<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /><small>JPEG, PNG or WebP, up to 10 MiB each and 10 images per product. Uploaded when you save; existing images remain.</small></label>{files.length > 0 && <p>{files.length} image{files.length === 1 ? '' : 's'} selected, not yet uploaded.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}<div className="commerce-form-actions"><Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</Button></div>
  </form></SectionCard>{product && <><ProductMediaEditor product={product} onSaved={onSaved}/><ProductSeoEditor productId={product.id} storeId={product.storefront_id}/></>}</>
}

function Orders({ store, logistics }: { store: Storefront; logistics: boolean }) {
  const [filters, setFilters] = useState(emptyOrderFilters)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const load = useCallback(() => sellerSprintRepository(requireSupabase()).orders(store.id, { ...filters, status: status === 'all' ? '' : status }), [store.id, filters, status])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Operations" title={logistics ? 'Logistics' : 'Orders'} description={logistics ? 'Carrier and tracking details recorded against your orders.' : 'Customer orders and their current fulfillment and payment status.'} actions={<Button variant="secondary" onClick={result.refresh}><RefreshCw size={16} />Refresh</Button>} />
    {logistics && <LogisticsSummary storeId={store.id}/>}
    <OrderRangeFilters onApply={setFilters}/>
    <FilterBar value={query} onChange={setQuery} placeholder="Search loaded order, customer or product"><select aria-label="Order status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{[...new Set([...operationalOrderQueues, ...result.data?.rows.map(o => o.status) ?? [], ...(status === 'all' ? [] : [status])])].map(s => <option value={s} key={s}>{label(s)}</option>)}</select></FilterBar>
    <CommerceResult result={result}>{({ rows, count }) => { const visible = rows.filter(o => `${o.id} ${o.customer_name ?? ''} ${o.customer_username ?? ''} ${o.order_items.map(i => i.product_title_snapshot).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())); return <><p role="status">{visible.length} displayed · {count ?? rows.length} orders match server filters. Text search, dispatch range and operational queues apply within the loaded results.</p>{visible.length ? <div className="commerce-record-list">{visible.map(order => <OrderRecord key={`${order.id}:${order.status}`} order={order} onSaved={result.refresh}/>)}</div> : <CommerceEmpty title="No matching orders" description="Try clearing search, status, date or value filters."/>}</> }}</CommerceResult>
    <CommerceNote>Up to 500 matching orders, sorted as selected. Order date, value and exact status filters run before this limit; dispatch dates and operational queues run after loading. On hold means a placed order without a settled/COD-pending payment state. Open details for supported fulfillment actions; carrier booking and payment capture are not available here.</CommerceNote></>
}

function OrderRecord({ order, onSaved }: { order: SellerOrder; onSaved: () => void }) {
  const [expanded,setExpanded]=useState(false)
  return <details className="commerce-record" onToggle={e=>setExpanded(e.currentTarget.open)}><summary><span><strong>Order {order.id.slice(0, 8)}</strong><small>{dateTime(order.created_at)}</small></span><StatusPill>{label(order.status)}</StatusPill><strong>{money(order.total_minor, order.currency)}</strong><span className="commerce-details-hint">View details</span></summary><div className="commerce-record-body"><p className="commerce-identifier">Order ID: {order.id}</p><dl className="commerce-definition"><div><dt>Customer</dt><dd>{order.customer_name || 'Customer'}{order.customer_username ? ` · @${order.customer_username}` : ''}</dd></div><div><dt>Dispatched</dt><dd>{order.dispatch_at ? dateTime(order.dispatch_at) : 'No shipped event recorded'}</dd></div><div><dt>Payment status</dt><dd>{label(order.payment_status || 'unknown')}</dd></div><div><dt>Payment method</dt><dd>{label(order.payment_method || 'unknown')}</dd></div><div><dt>Carrier</dt><dd>{order.order_fulfillments?.carrier || 'Not recorded'}</dd></div><div><dt>Tracking number</dt><dd>{order.order_fulfillments?.tracking_number || 'Not recorded'}</dd></div></dl>{order.order_items.map((item) => <div key={item.id} className="commerce-summary-row"><span>{item.product_title_snapshot} × {item.quantity}</span><strong>{money(item.subtotal_minor, order.currency)}</strong></div>)}{order.order_fulfillments?.customer_note && <p>{order.order_fulfillments.customer_note}</p>}{expanded && <FulfillmentEditor order={order} onSaved={onSaved}/>}</div></details>
}

function Returns({ store }: { store: Storefront }) {
  const load = useCallback(() => sellerSprintRepository(requireSupabase()).returns(store.id), [store.id])
  const result = useCommerce(load)
  const [filters, setFilters] = useState(emptyReturnFilters), [draftFilters, setDraftFilters] = useState(emptyReturnFilters), [error, setError] = useState('')
  function apply(event: FormEvent) {
    event.preventDefault()
    try { filterReturns([], draftFilters); setFilters({ ...draftFilters }); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the return filters.') }
  }
  return <><PageHeader eyebrow="Customer care" title="Returns" description="Return requests and review notes for your storefront." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} />
    <form className="commerce-form" onSubmit={apply}><div className="commerce-form-grid">
      <label>Search returns<input value={draftFilters.query} placeholder="Return ID, order ID, reason or details" onChange={e => setDraftFilters({ ...draftFilters, query: e.target.value })}/></label>
      <label>Return status<select value={draftFilters.status} onChange={e => setDraftFilters({ ...draftFilters, status: e.target.value })}><option value="all">All statuses</option>{[...new Set(result.data?.map(row => row.status))].map(status => <option key={status} value={status}>{label(status)}</option>)}</select></label>
      <label>Return reason<select value={draftFilters.reason} onChange={e => setDraftFilters({ ...draftFilters, reason: e.target.value })}><option value="all">All reasons</option>{[...new Set(result.data?.map(row => row.reason))].map(reason => <option key={reason} value={reason}>{label(reason)}</option>)}</select></label>
      <label>Return product category<select value={draftFilters.category} onChange={e => setDraftFilters({ ...draftFilters, category: e.target.value })}><option value="all">All categories</option>{[...new Set(result.data?.map(row => row.product_category))].filter(Boolean).map(category => <option key={category} value={category}>{category}</option>)}</select></label>
      <label>Return currency<select value={draftFilters.currency} onChange={e => setDraftFilters({ ...draftFilters, currency: e.target.value })}><option value="">All currencies</option>{[...new Set(result.data?.map(row => row.currency))].filter(Boolean).map(currency => <option key={currency} value={currency!}>{currency}</option>)}</select></label>
      <label>Requested from<input type="date" value={draftFilters.start} onChange={e => setDraftFilters({ ...draftFilters, start: e.target.value })}/></label>
      <label>Requested through<input type="date" value={draftFilters.end} onChange={e => setDraftFilters({ ...draftFilters, end: e.target.value })}/></label>
      <label>Return sorting<select value={draftFilters.valueSort || (draftFilters.oldest ? 'oldest' : 'newest')} onChange={e => setDraftFilters({ ...draftFilters, oldest: e.target.value === 'oldest', valueSort: e.target.value === 'high' || e.target.value === 'low' ? e.target.value : '' })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="high">Highest item value first</option><option value="low">Lowest item value first</option></select></label>
    </div><div className="commerce-row-actions"><Button type="submit">Apply return filters</Button><Button variant="secondary" onClick={() => { setFilters(emptyReturnFilters); setDraftFilters(emptyReturnFilters); setError('') }}>Reset return filters</Button></div>{error && <p role="alert">{error}</p>}</form>
    <CommerceResult result={result}>{rows => { const visible = filterReturns(rows, filters); return <><p role="status">{visible.length} of {rows.length} loaded return requests match. Filters apply to the latest 500 requests.</p><ReturnPerformance rows={visible}/>{visible.length ? <div className="commerce-record-list">{visible.map(row => <details className="commerce-record" key={row.id}><summary><span><strong>Return {row.id.slice(0, 8)}</strong><small>{dateTime(row.requested_at)}</small></span><span>{label(row.reason)}</span><StatusPill>{label(row.status)}</StatusPill><span className="commerce-details-hint">View details</span></summary><div className="commerce-record-body"><p className="commerce-identifier">Order ID: {row.order_id}</p><dl className="commerce-definition"><div><dt>Buyer</dt><dd>{row.buyer_name}{row.buyer_username ? ` · @${row.buyer_username}` : ''}</dd></div><div><dt>Product</dt><dd>{row.product_title} · {row.product_category}</dd></div><div><dt>Requested item value</dt><dd>{row.item_subtotal != null && row.currency ? money(row.item_subtotal, row.currency) : 'Unavailable'}</dd></div></dl><p>{row.details || 'No additional customer details.'}</p><p><strong>Review note:</strong> {row.admin_note || 'No review note yet.'}</p><ReturnReview id={row.id} status={row.status} onSaved={result.refresh}/></div></details>)}</div> : <CommerceEmpty title="No matching returns"/>}</> }}</CommerceResult><CommerceNote>Review evidence before deciding. Approval affects commission and refund-request records through the existing service. Refund execution is unavailable on this web surface.</CommerceNote></>
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
  return <TeamManagement key={store.id} storefrontId={store.id}/>
}

function Affiliate({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.sellerPromotions(store.id), [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Creator commerce" title="Affiliate & creators" description="Creator promotions attached to your own products." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><CommerceResult result={result}>{(rows) => rows.length ? <div className="table-card commerce-table"><table><thead><tr><th>Product</th><th>Promotion</th><th>Commission</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td data-label="Product">{row.products?.title || 'Product unavailable'}</td><td data-label="Promotion"><code>{row.tracking_code}</code></td><td data-label="Commission">{row.commission_bps_snapshot / 100}%</td><td data-label="Status"><StatusPill>{label(row.status)}</StatusPill></td><td data-label="Created">{dateTime(row.created_at)}</td></tr>)}</tbody></table></div> : <CommerceEmpty title="No creator promotions yet" description="Eligible Creator promotions will appear when creators choose your products." />}</CommerceResult><CounterpartyDirectory role="creator"/><CommerceNote>Showing up to 500 promotions. Enable creator promotion and commission on a product in your catalog.</CommerceNote></>
}

function Analytics({ store }: { store: Storefront }) {
  const load = useCallback(() => commerce.orders(store.id), [store.id])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Recorded activity" title="Analytics" description="Order status counts derived from this storefront’s records." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>} /><TrafficAnalytics storeId={store.id}/><CommerceResult result={result}>{(orders) => <><OrderTotals orders={orders} /><SectionCard title="Orders by current status" description="Latest 500 orders; no estimated growth or conversion metrics.">{orders.length ? <div className="commerce-status-bars">{[...new Set(orders.map((o) => o.status))].map((status) => { const count = orders.filter((o) => o.status === status).length; return <div key={status}><span>{label(status)} <strong>{count}</strong></span><meter min={0} max={orders.length} value={count} aria-label={`${label(status)} orders: ${count}`} /></div> })}</div> : <CommerceEmpty title="No order activity yet" />}</SectionCard></>}</CommerceResult><CommerceNote>Order status summaries below cover the latest 500 orders, independently of the traffic period selected above. Advertising ROI and account health scores are not calculated.</CommerceNote></>
}

function StoreDetails({ store, section, onSaved }: { store: Storefront; section: string; onSaved: () => void }) {
  const seo = section === 'discoverability'
  const health = section === 'account-health'
  const pairs = seo ? [['Search title', store.seo_title], ['Search description', store.seo_description], ['AI discovery summary', store.llm_summary]] : health ? [['Seller storefront verification', label(store.verification_status)], ['Store availability', store.active ? 'Active' : 'Inactive']] : [['Name', store.name], ['Store URL', store.slug], ['Tagline', store.tagline], ['Description', store.description], ['Category', store.primary_category], ['City', store.city], ['State', store.state_code]]
  return <><PageHeader eyebrow="Store settings" title={seo ? 'SEO & AI' : health ? 'Account health' : 'Storefront'} description={seo ? 'Your saved search and AI discovery information.' : health ? 'Current verification and availability from the backend.' : 'Your business presence shared with the existing application.'} /><SectionCard title={store.name}><dl className="commerce-definition">{pairs.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl></SectionCard><CommerceNote>{seo ? 'Edit saved search and AI-discovery metadata below. This is metadata editing, not AI content generation.' : health ? 'No synthetic health score is calculated. Application review and approval remain controlled by the existing admin workflow.' : 'Store profile and SEO edits use the same storefront record. Business approval and payout details cannot be changed here.'}</CommerceNote>{!health && <StoreEditor storeId={store.id} onSaved={onSaved}/>}</>
}
