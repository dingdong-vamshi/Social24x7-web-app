import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { CommerceResult, useCommerce } from '../../components/LiveCommerce'
import { Button } from '../../components/Ui'
import { requireSupabase } from '../../lib/supabase'
import { dateTime } from '../../repositories/commerce'
import { buyerReturnsRepository, returnEligibility, ReturnOutcomeUnknown, type BuyerReturn, type BuyerReturnEvidence, type BuyerReturnItem } from './repository'
import './buyerReturns.css'

/** Buyer-only order detail extension. No seller permissions or refund execution. */
export function BuyerReturns({ orderId, onChanged }: { orderId: string; onChanged?: () => void }) {
  const { user, loading, workContext } = useAuth()
  if (loading || !user || workContext) return null
  return <LazyBuyerReturns key={`${user.id}:${orderId}`} orderId={orderId} userId={user.id} onChanged={onChanged}/>
}
function LazyBuyerReturns(props: { orderId: string; userId: string; onChanged?: () => void }) {
  const [opened, setOpened] = useState(false)
  // Keep an opened editor mounted if collapsed so unsaved reason/file selections survive.
  return <details className="buyer-returns" onToggle={event => { if (event.currentTarget.open) setOpened(true) }}><summary>Returns and supporting evidence</summary>{opened && <BuyerOrderReturns {...props}/>}</details>
}
function BuyerOrderReturns({ orderId, userId, onChanged }: { orderId: string; userId: string; onChanged?: () => void }) {
  const load = useCallback(() => buyerReturnsRepository(requireSupabase(), userId).load(orderId), [userId, orderId])
  const result = useCommerce(load)
  function changed() { result.refresh(); onChanged?.() }
  return <><p>Request a return for an eligible delivered item. Submission starts seller review; it does not issue a refund or move money. Related pending creator commissions may be put on hold by the existing order lifecycle.</p><Button variant="secondary" onClick={result.refresh}>Refresh returns</Button><CommerceResult result={result}>{data => data.items.length ? <>{data.items.map(item => <ReturnItem key={item.id} item={item} request={data.returns.find(r => r.order_item_id === item.id)} evidence={data.evidence} orderId={orderId} userId={userId} onChanged={changed}/>)}</> : <p>No buyer-owned items are available for returns on this order.</p>}</CommerceResult></>
}
function ReturnItem({ item, request, evidence, orderId, userId, onChanged }: { item: BuyerReturnItem; request?: BuyerReturn; evidence: BuyerReturnEvidence[]; orderId: string; userId: string; onChanged: () => void }) {
  const [reason, setReason] = useState(''), [details, setDetails] = useState(''), [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [uncertain, setUncertain] = useState(false)
  const pending = useRef(false)
  const blocked = returnEligibility(item, request)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (pending.current || !confirmed || blocked || uncertain) return
    pending.current = true; setBusy(true); setError('')
    try { await buyerReturnsRepository(requireSupabase(), userId).submit(orderId, item.id, reason, details); onChanged() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Return request failed. Your entries are retained.'); if (cause instanceof ReturnOutcomeUnknown) setUncertain(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <section aria-label={`Return for ${item.product_title_snapshot}`}><h4>{item.product_title_snapshot} · quantity {item.quantity}</h4>{item.return_window_ends_at && <p>Return deadline: {dateTime(item.return_window_ends_at)}</p>}{request ? <><p>Return status: <strong>{request.status.replaceAll('_', ' ')}</strong> · requested {dateTime(request.requested_at)}</p><p>Reason: {request.reason}</p>{request.details && <p>Details: {request.details}</p>}<p>Supporting evidence (up to 500 most recent files):</p>{evidence.filter(e => e.return_request_id === request.id).map(file => <p key={file.id}>{file.file_name} · {file.evidence_source === 'live_capture' ? 'Recorded as live capture by the existing service' : file.evidence_source === 'uploaded_file' ? 'Uploaded file — not trusted capture' : 'Source unrecognized'} · {dateTime(file.created_at)}</p>)}{!evidence.some(e => e.return_request_id === request.id) && <p>No supporting evidence uploaded for this request.</p>}{['submitted', 'under_review'].includes(request.status) && <EvidenceUpload orderId={orderId} itemId={item.id} requestId={request.id} userId={userId} onChanged={onChanged}/>}</> : blocked ? <p>{blocked}</p> : <form onSubmit={submit} className="commerce-form"><fieldset disabled={busy || uncertain}><label>Return reason<input required value={reason} onChange={e => setReason(e.target.value)}/></label><label>Additional return details (optional)<textarea value={details} onChange={e => setDetails(e.target.value)}/></label><label className="buyer-return-confirm"><input type="checkbox" required checked={confirmed} onChange={e => setConfirmed(e.target.checked)}/>I want to submit this item for seller review. A refund is not automatic.</label><Button type="submit" disabled={!confirmed || !reason.trim()}>{busy ? 'Submitting return…' : 'Submit return request'}</Button></fieldset>{error && <p role="alert">{error}</p>}{uncertain && <p>Use Refresh returns above before any retry.</p>}</form>}</section>
}
function EvidenceUpload({ orderId, itemId, requestId, userId, onChanged }: { orderId: string; itemId: string; requestId: string; userId: string; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false)
  const pending = useRef(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!file || pending.current || uncertain) return
    pending.current = true; setBusy(true); setError('')
    try { await buyerReturnsRepository(requireSupabase(), userId).upload(orderId, itemId, requestId, file); onChanged() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Upload failed. Your selected file is retained.'); if (cause instanceof ReturnOutcomeUnknown) setUncertain(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <form className="commerce-form" onSubmit={submit}><p>Optional supporting upload, shared privately with authorized order reviewers. This is not trusted camera capture. Uploads do not approve a return or issue a refund.</p><label>Return evidence file<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" disabled={busy || uncertain} onChange={e => { setFile(e.target.files?.[0] ?? null); setError('') }}/><small>JPEG, PNG, WebP, MP4, MOV or WebM; at most 15 MiB.</small></label><Button type="submit" disabled={!file || busy || uncertain}>{busy ? 'Uploading evidence…' : 'Upload return evidence'}</Button>{error && <p role="alert">{error}</p>}{uncertain && <p>Use Refresh returns above and check the evidence before any retry.</p>}</form>
}
