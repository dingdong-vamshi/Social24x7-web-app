import { useCallback, useRef, useState, type FormEvent } from 'react'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../../components/LiveCommerce'
import { Button, MetricCard, PageHeader, SectionCard } from '../../components/Ui'
import { requireSupabase } from '../../lib/supabase'
import { commerce, money, type Product } from '../../repositories/commerce'
import { createOperationsRepository } from '../../repositories/operations'
import { StoreEditor } from '../../pages/CommerceOperations'
import { sellerSprintRepository, type SellerReturn } from './repository'
import { groupReturnPerformance } from './parity'

export function ReturnSettings({ storeId }: { storeId: string }) {
  const load = useCallback(async () => {
    const [products, store] = await Promise.all([commerce.products(storeId), createOperationsRepository(requireSupabase()).store(storeId)])
    return { products, store }
  }, [storeId])
  const result = useCommerce(load)
  return <><PageHeader title="Return Settings" description="Existing product-level eligibility and Seller support details." actions={<Button variant="secondary" onClick={result.refresh}>Refresh return settings</Button>}/><CommerceResult result={result}>{({ products, store }) => <div className="commerce-two-column"><SectionCard title="Product return windows" description="These are the saved product rules, not a new store-wide policy.">{products.length ? products.map(product => <div className="commerce-summary-row" key={product.id}><strong>{product.title}</strong><span>{product.return_window_days} days</span></div>) : <CommerceEmpty title="No product return windows" description="Add a product to configure its return window."/>}<Button to="/partner/seller/products">Edit product return windows</Button></SectionCard><SectionCard title="Return support"><dl className="commerce-definition"><div><dt>Support email</dt><dd>{store.support_email || 'Not configured'}</dd></div><div><dt>Support phone</dt><dd>{store.support_phone || 'Not configured'}</dd></div></dl><Button to="/partner/seller/operations">Edit support details</Button></SectionCard></div>}</CommerceResult><CommerceNote>Eligibility remains enforced by the existing return service. No automatic refund or new store-wide policy is enabled.</CommerceNote></>
}

export function AffiliateProducts({ storeId, singleStore }: { storeId: string; singleStore: boolean }) {
  const load = useCallback(() => commerce.products(storeId), [storeId])
  const result = useCommerce(load)
  return <SectionCard title="Affiliate products" description="Choose which products approved Creators may discover and promote."><Button variant="secondary" onClick={result.refresh}>Refresh affiliate products</Button><CommerceNote>Turning promotion off affects new Creator discovery, not Buyer Shop availability or historical attribution and commission records.</CommerceNote>{!singleStore && <CommerceNote>Product changes are unavailable for multi-store accounts because the existing save RPC selects the account storefront. Contact support to avoid ambiguous updates.</CommerceNote>}<CommerceResult result={result}>{products => products.length ? <div className="commerce-record-list">{products.map(product => <AffiliateProduct key={`${product.id}:${product.updated_at}`} product={product} disabled={!singleStore} onSaved={result.refresh}/>)}</div> : <CommerceEmpty title="No affiliate products" description="Add a product before enabling Creator promotion."/>}</CommerceResult></SectionCard>
}

export function AffiliateProduct({ product, disabled, onSaved }: { product: Product; disabled: boolean; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(product.creator_promotion_enabled)
  const [rate, setRate] = useState(String(Math.max(product.creator_commission_bps, 500) / 100))
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false)
  const pending = useRef(false)
  async function save(event: FormEvent) {
    event.preventDefault(); if (disabled || pending.current) return
    pending.current = true; setBusy(true); setError(''); setDone(false)
    try { await sellerSprintRepository(requireSupabase()).setAffiliate(product.id, product.storefront_id, enabled, rate); setDone(true); onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The affiliate change could not be confirmed. Refresh before retrying.') }
    finally { pending.current = false; setBusy(false) }
  }
  return <form className="commerce-record commerce-form" onSubmit={save}><strong>{product.title}</strong><p>{money(product.sale_price_minor ?? product.price_minor, product.currency)} · Stock {product.inventory}</p><fieldset disabled={disabled || busy}><label className="commerce-checkbox"><input type="checkbox" checked={enabled} onChange={e => { setEnabled(e.target.checked); setDone(false) }}/>Allow Creator promotion for {product.title}</label><label>Commission for {product.title} (%)<input type="number" min="5" max="70" step="0.01" required={enabled} disabled={!enabled} value={rate} onChange={e => { setRate(e.target.value); setDone(false) }}/></label><Button type="submit" disabled={disabled || busy}>{busy ? 'Saving affiliate settings…' : 'Save affiliate settings'}</Button></fieldset>{error && <p role="alert">{error}</p>}{done && <p role="status">Affiliate settings saved.</p>}</form>
}

export function SellerOperations({ storeId }: { storeId: string }) {
  const load = useCallback(() => commerce.products(storeId), [storeId])
  const result = useCommerce(load)
  return <><PageHeader title="Operations" description="Manage support contacts and review the current catalog's operational readiness."/><CommerceResult result={result}>{products => <div className="metric-grid compact-metrics"><MetricCard label="Products" value={String(products.length)} detail="Latest 500 catalog records"/><MetricCard label="Available inventory" value={String(products.reduce((sum, p) => sum + p.inventory, 0))} detail="Recorded product inventory"/><MetricCard label="Published products" value={String(products.filter(p => p.status === 'active').length)} detail="Current product status"/></div>}</CommerceResult><StoreEditor storeId={storeId}/><CommerceNote>Support email, phone, city and state update the existing storefront. Seller approval and payout settings cannot be changed here.</CommerceNote></>
}

export function LogisticsSummary({ storeId }: { storeId: string }) {
  const load = useCallback(() => commerce.orders(storeId), [storeId])
  const result = useCommerce(load)
  return <CommerceResult result={result}>{orders => <div className="metric-grid compact-metrics">{[
    ['Awaiting processing', ['placed', 'confirmed']], ['Processing', ['processing']], ['In transit', ['shipped', 'out_for_delivery']], ['Delivered', ['delivered']],
  ].map(([name, statuses]) => <MetricCard key={String(name)} label={String(name)} value={String(orders.filter(order => (statuses as string[]).includes(order.status)).length)} detail="Latest 500 orders · recorded status"/>)}</div>}</CommerceResult>
}

export function FinanceSummary({ storeId }: { storeId: string }) {
  const load = useCallback(() => sellerSprintRepository(requireSupabase()).finance(storeId), [storeId])
  const result = useCommerce(load)
  return <SectionCard title="Seller financial summary" description="Original order/commission/approved-return calculation, separated by order currency."><Button variant="secondary" onClick={result.refresh}>Refresh financial summary</Button><CommerceResult result={result}>{data => <><p>{data.returnCount} return requests recorded.</p>{data.currencies.length ? data.currencies.map(row => <section key={row.currency} aria-label={`${row.currency} financial summary`}><h3>{row.currency}</h3><div className="metric-grid compact-metrics"><MetricCard label="Gross order value" value={money(row.gross, row.currency)} detail={`${row.orders} qualifying orders; excludes draft, cancelled, refunded`}/><MetricCard label="Delivered sales" value={money(row.delivered, row.currency)} detail="Orders currently delivered"/><MetricCard label="Creator commission" value={money(row.commission, row.currency)} detail="Excludes reversed and cancelled"/><MetricCard label="Approved returns" value={money(row.returns, row.currency)} detail="Approved, received or refunded item value"/><MetricCard label="Estimated Seller amount" value={money(row.estimate, row.currency)} detail="Gross less active commission and approved return value, minimum zero"/></div></section>) : <CommerceEmpty title="No financial records"/>}</>}</CommerceResult><CommerceNote>This estimate is not profit, settlement, tax, payout, cash availability or bank-transfer status. No financial action is performed. Missing or oversized records produce an error instead of a partial estimate.</CommerceNote></SectionCard>
}

export function ReturnPerformance({ rows }: { rows: SellerReturn[] }) {
  const [ascending, setAscending] = useState(false)
  const groups = groupReturnPerformance(rows, ascending)
  return <><div className="metric-grid compact-metrics"><MetricCard label="Filtered returns" value={String(rows.length)} detail="Loaded requests matching your filters"/><MetricCard label="Approved" value={String(rows.filter(row => row.status === 'approved').length)} detail="Current approved requests"/><MetricCard label="Rejected" value={String(rows.filter(row => row.status === 'rejected').length)} detail="Current rejected requests"/></div>{groups.length > 0 && <SectionCard title="Returned products" description="Grouped from the filtered return queue; separate currencies are never added together."><Button variant="secondary" onClick={() => setAscending(!ascending)}>{ascending ? 'Show most returns first' : 'Show fewest returns first'}</Button><div className="table-card commerce-table"><table><thead><tr><th>Product</th><th>Category</th><th>Requests</th><th>Item value</th></tr></thead><tbody>{groups.map(row => <tr key={JSON.stringify([row.title, row.category, row.currency])}><td data-label="Product">{row.title}</td><td data-label="Category">{row.category}</td><td data-label="Requests">{row.count}</td><td data-label="Item value">{row.incomplete || !row.currency ? 'Incomplete source data' : money(row.value, row.currency)}</td></tr>)}</tbody></table></div><CommerceNote>Requested item value is not an approved refund or refunded amount.</CommerceNote></SectionCard>}</>
}
