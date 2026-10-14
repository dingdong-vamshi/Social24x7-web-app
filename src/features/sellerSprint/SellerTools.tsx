import { useCallback, useRef, useState, type FormEvent } from 'react'
import { CommerceNote, CommerceResult, useCommerce } from '../../components/LiveCommerce'
import { Button, MetricCard, SectionCard } from '../../components/Ui'
import { requireSupabase } from '../../lib/supabase'
import { dateTime, money } from '../../repositories/commerce'
import { emptyOrderFilters, EvidenceOutcomeUnknown, sellerSprintRepository, validateOrderFilters, type OrderFilters, type ProductSeo } from './repository'
import { TrafficCharts } from './TrafficCharts'

export function OrderRangeFilters({ onApply }: { onApply: (filters: OrderFilters) => void }) {
  const [draft, setDraft] = useState(emptyOrderFilters), [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    try { validateOrderFilters(draft); setError(''); onApply({ ...draft }) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check the filters.') }
  }
  return <form className="commerce-form" onSubmit={submit}><details><summary>Order date and value filters</summary><div className="commerce-form-grid">
    <label>Order date from<input type="date" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })}/></label>
    <label>Order date through<input type="date" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })}/></label>
    <label>Dispatch date from<input type="date" value={draft.dispatchStart ?? ''} onChange={e => setDraft({ ...draft, dispatchStart: e.target.value })}/></label>
    <label>Dispatch date through<input type="date" value={draft.dispatchEnd ?? ''} onChange={e => setDraft({ ...draft, dispatchEnd: e.target.value })}/><small>First recorded shipped event; applied within the 500 loaded orders.</small></label>
    <label>Order currency<input placeholder="All currencies" maxLength={3} value={draft.currency} onChange={e => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}/><small>Use INR for Indian rupees. Required for value comparisons.</small></label>
    <label>Minimum order value<input type="number" min="0" step="0.01" value={draft.minimum} onChange={e => setDraft({ ...draft, minimum: e.target.value })}/></label>
    <label>Maximum order value<input type="number" min="0" step="0.01" value={draft.maximum} onChange={e => setDraft({ ...draft, maximum: e.target.value })}/></label>
    <label>Order sorting<select aria-label="Order sorting" value={draft.sort} onChange={e => setDraft({ ...draft, sort: e.target.value as OrderFilters['sort'] })}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="value_high">Highest value first</option><option value="value_low">Lowest value first</option></select></label>
  </div><p>Dates include both selected calendar days in your browser’s local time zone. Filters run on the server before the 500-order display limit.</p><div className="commerce-row-actions"><Button type="submit">Apply date and value filters</Button><Button variant="secondary" onClick={() => { setDraft(emptyOrderFilters); setError(''); onApply({ ...emptyOrderFilters }) }}>Reset date and value filters</Button></div></details>{error && <p role="alert">{error}</p>}</form>
}

export function ProductSeoEditor({ productId, storeId }: { productId: string; storeId: string }) {
  const load = useCallback(() => sellerSprintRepository(requireSupabase()).productSeo(productId, storeId), [productId, storeId])
  const result = useCommerce(load)
  return <SectionCard title="Product search and discovery" description="Metadata for this product, shared with the existing app. This does not generate AI content or guarantee search ranking."><CommerceResult result={result}>{data => <SeoForm key={`${productId}:${data.updated_at}`} data={data} productId={productId} storeId={storeId}/>}</CommerceResult></SectionCard>
}
function SeoForm({ data, productId, storeId }: { data: ProductSeo; productId: string; storeId: string }) {
  const [draft, setDraft] = useState(data), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false)
  const [tags, setTags] = useState((data.tags ?? []).join(', ')), [keywords, setKeywords] = useState((data.search_keywords ?? []).join(', '))
  const pending = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending.current) return
    pending.current = true; setBusy(true); setError(''); setDone(false)
    const list = (input: string) => [...new Set(input.split(',').map(v => v.trim()).filter(Boolean))]
    try {
      const saved = await sellerSprintRepository(requireSupabase()).saveProductSeo(productId, storeId, { ...draft, tags: list(tags), search_keywords: list(keywords) })
      setDraft(current => ({ ...current, updated_at: saved.updated_at })); setDone(true)
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : 'Save could not be confirmed.'} Your entries are retained. If another editor changed the product, reopen it before retrying.`) }
    finally { pending.current = false; setBusy(false) }
  }
  return <form className="commerce-form" onSubmit={submit}><fieldset disabled={busy}><div className="commerce-form-grid">
    <label>Product brand<input maxLength={120} value={draft.brand ?? ''} onChange={e => { setDone(false); setDraft({ ...draft, brand: e.target.value }) }}/></label>
    <label>Product search title<input value={draft.seo_title ?? ''} onChange={e => { setDone(false); setDraft({ ...draft, seo_title: e.target.value }) }}/></label>
    <label>Product search description<textarea value={draft.seo_description ?? ''} onChange={e => { setDone(false); setDraft({ ...draft, seo_description: e.target.value }) }}/></label>
    <label>Product AI-discovery summary<textarea value={draft.llm_summary ?? ''} onChange={e => { setDone(false); setDraft({ ...draft, llm_summary: e.target.value }) }}/></label>
    <label>Product tags<input value={tags} onChange={e => { setDone(false); setTags(e.target.value) }}/><small>Separate tags with commas.</small></label>
    <label>Product search keywords<input value={keywords} onChange={e => { setDone(false); setKeywords(e.target.value) }}/><small>Separate keywords with commas.</small></label>
  </div></fieldset>{error && <p role="alert">{error}</p>}{done && <p role="status">Product search metadata saved.</p>}<Button type="submit" disabled={busy}>{busy ? 'Saving metadata…' : 'Save product search metadata'}</Button></form>
}

export function TrafficAnalytics({ storeId }: { storeId: string }) {
  const [days, setDays] = useState<7 | 14 | 30>(14)
  const load = useCallback(() => sellerSprintRepository(requireSupabase()).traffic(storeId, days), [storeId, days])
  const result = useCommerce(load)
  return <SectionCard title="Storefront traffic and conversion" description="Recorded storefront events and orders in the same reporting window."><label>Traffic reporting period<select aria-label="Traffic reporting period" value={days} onChange={e => setDays(Number(e.target.value) as 7 | 14 | 30)}><option value={7}>Last 7 calendar days</option><option value={14}>Last 14 calendar days</option><option value={30}>Last 30 calendar days</option></select></label><Button variant="secondary" onClick={result.refresh}>Refresh traffic</Button><CommerceResult result={result}>{data => <><p>{dateTime(data.from)} – {dateTime(data.until)}</p><div className="metric-grid compact-metrics"><MetricCard label="Storefront views" value={String(data.views)} detail="Recorded storefront_view events"/><MetricCard label="Unique visitors" value={String(data.visitors)} detail="Known user ID, otherwise session key"/><MetricCard label="Today's visitors" value={String(data.dailyVisitors)} detail="Unique visitors in today's local calendar bucket"/><MetricCard label="Product views" value={String(data.productViews)} detail="Recorded product_view events"/><MetricCard label="Qualifying orders" value={String(data.orders)} detail="Excludes draft, cancelled and refunded"/><MetricCard label="Orders per storefront view" value={data.conversion === null ? 'Not available' : `${data.conversion.toFixed(1)}%`} detail="Qualifying orders ÷ storefront views"/>{Object.entries(data.values).map(([currency, amount]) => <MetricCard key={currency} label={`Gross order value · ${currency}`} value={money(amount, currency)} detail="Qualifying orders; not settlement or profit"/>)}</div><TrafficCharts rows={data.dailySeries} paymentMix={data.paymentMix}/></>}</CommerceResult><CommerceNote>Conversion uses the existing app’s order/view definition, not unique-visitor attribution or payment success. Orders may originate outside tracked storefront views, so the ratio can exceed 100%. Missing view data shows “Not available”, never an invented zero rate. This period starts at local midnight; it is not a monthly-active-user metric.</CommerceNote></SectionCard>
}

export function PackingUpload({ orderId, onSaved }: { orderId: string; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [done, setDone] = useState(false), [uncertain, setUncertain] = useState(false)
  const pending = useRef(false), input = useRef<HTMLInputElement>(null)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file || pending.current || uncertain) return
    pending.current = true; setBusy(true); setError(''); setDone(false)
    try { await sellerSprintRepository(requireSupabase()).uploadPacking(orderId, file); setDone(true); setFile(null); if (input.current) input.current.value = ''; onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed. Your selected file is retained.'); if (cause instanceof EvidenceOutcomeUnknown) setUncertain(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <details><summary>Add packing evidence</summary><form className="commerce-form" onSubmit={submit}><p>Ordinary uploaded evidence only—not verified camera capture. This adds a private evidence record without changing fulfillment, inventory or payment state.</p><label>Packing evidence file<input ref={input} disabled={busy || uncertain} required type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" onChange={e => { setFile(e.target.files?.[0] ?? null); setDone(false); setError('') }}/><small>JPEG, PNG, WebP, MP4, MOV or WebM; at most 15 MiB.</small></label>{error && <p role="alert">{error}</p>}{done && <p role="status">Packing evidence saved. Open Private evidence to review it.</p>}<Button type="submit" disabled={!file || busy || uncertain}>{busy ? 'Uploading evidence…' : 'Upload packing evidence'}</Button>{uncertain && <p>Reload this order and check its private evidence before retrying.</p>}</form></details>
}
