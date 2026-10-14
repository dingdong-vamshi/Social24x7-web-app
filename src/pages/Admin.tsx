import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { ClipboardCheck, Menu, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import type { ApplicationKind } from '../auth/onboardingRepository'
import { AccountMenu } from '../components/AccountMenu'
import { Brand } from '../components/Brand'
import { CommerceEmpty, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, MetricCard, PageHeader, SectionCard, StatusPill } from '../components/Ui'
import { adminRepository, applicationName, reviewActions, statusLabel, type AdminApplication, type AdminDetail, type Evidence, type ReviewDecision } from '../repositories/admin'
import '../commerce.css'
import './admin.css'

const base = '/partner/admin'
const sections = [['', 'Overview'], ['seller', 'Seller Applications'], ['creator', 'Creator Applications'], ['professional', 'Professional Verification'], ['all', 'All Applications'], ['history', 'Review History']]
const pending = (item: AdminApplication) => ['submitted', 'under_review'].includes(item.status)
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded'
const detailPath = (item: AdminApplication) => `${base}/application/${item.kind}/${item.id}`
const message = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to complete the request. Please retry.'

export function AdminDashboard() {
  const { user, access, loading, error } = useAuth()
  if (loading || error || !user || !access?.admin_access) return null
  return <AdminWorkspace key={user.id}/>
}
function AdminWorkspace() {
  const { pathname, search } = useLocation()
  const [mobile, setMobile] = useState(false)
  const load = useCallback(() => adminRepository.list(), [])
  const result = useCommerce(load)
  const params = useParams()
  const route = pathname.slice(base.length + 1)
  const detail = route.startsWith('application/')
  const section = sections.find(([path]) => path === route)
  const count = result.data?.filter(pending).length
  return <div className="workspace commerce-workspace admin-workspace">
    <aside className={`sidebar ${mobile ? 'open' : ''}`}><div className="sidebar-brand"><Brand variant="sidebar"/><button className="icon-button mobile-only" aria-label="Close Admin navigation" onClick={() => setMobile(false)}><X/></button></div><div className="admin-label"><ShieldCheck size={20}/><span>Administration</span></div><nav aria-label="Admin navigation">{sections.map(([path, label]) => <NavLink key={path} to={`${base}${path ? `/${path}` : ''}`} end onClick={() => setMobile(false)}><ClipboardCheck size={18}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-foot"><p>Application review</p><small>Seller, Creator and professional permissions are reviewed separately.</small></div></aside>
    {mobile && <button className="sidebar-backdrop" aria-label="Close Admin navigation" onClick={() => setMobile(false)}/>}
    <div className="workspace-main"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open Admin navigation" aria-expanded={mobile} onClick={() => setMobile(true)}><Menu/></button><span className="commerce-topbar-title">Admin Dashboard</span><div className="top-actions">{count !== undefined && <Link className="admin-pending" to={`${base}/all?status=pending`}>{count} pending</Link>}<AccountMenu/></div></header>
    <main className="workspace-content" id="main-content">
      {detail ? <ApplicationDetail key={`${params.kind}:${params.id}`} onReviewed={result.refresh}/> : !section ? <><h1>Admin page not found</h1><Button to={base}>Return to overview</Button></> : <>
        <PageHeader eyebrow="SOCIAL 24-7 · Administration" title={section[1] === 'Overview' ? 'Application overview' : section[1]} description={route === 'history' ? 'Latest recorded review on each application. This is not a complete event history.' : 'Review submitted applications and their current status.'} actions={<Button variant="secondary" onClick={result.refresh}><RefreshCw size={16}/>Refresh</Button>}/>
        <CommerceResult result={result}>{items => route === '' ? <Overview items={items}/> : <ApplicationList key={route + search} items={route === 'history' ? items.filter(item => item.reviewed_at).sort((a,b) => b.reviewed_at!.localeCompare(a.reviewed_at!)) : route === 'all' ? items : items.filter(item => item.kind === route)} history={route === 'history'}/>}</CommerceResult>
      </>}
      <footer className="commerce-footer"><Link to="/">SOCIAL 24-7</Link><span>Authorized application review</span></footer>
    </main></div>
  </div>
}
function Overview({ items }: { items: AdminApplication[] }) {
  const kind = (value: ApplicationKind) => items.filter(item => item.kind === value)
  const metrics: Array<[string, number, string]> = [
    ['Seller applications', kind('seller').length, 'Submitted applications · excludes drafts'], ['Pending Sellers', kind('seller').filter(pending).length, 'Submitted or under review'], ['Approved Sellers', kind('seller').filter(item => item.status === 'approved').length, 'Current approval'], ['Rejected Sellers', kind('seller').filter(item => item.status === 'rejected').length, 'Current status'],
    ['Creator applications', kind('creator').length, 'Submitted applications · excludes drafts'], ['Pending Creators', kind('creator').filter(pending).length, 'Submitted or under review'], ['Approved Creators', kind('creator').filter(item => item.status === 'approved').length, 'Current approval'], ['Pending professional reviews', kind('professional').filter(pending).length, 'Separate credential review'], ['More information required', items.filter(item => item.status === 'more_information_required').length, 'Waiting for applicant corrections'],
  ]
  return <><div className="admin-metrics">{metrics.map(([label, count, detail]) => <MetricCard key={label} label={label} value={String(count)} detail={detail}/>)}</div><SectionCard title="Requires your attention" description="Applications awaiting an Admin decision." action={<Button to={`${base}/all?status=pending`} variant="secondary">View pending reviews</Button>}><ApplicationList compact items={items.filter(pending).slice(0, 10)}/></SectionCard><SectionCard title="Recently reviewed" description="Latest recorded decisions; open an application to inspect its note."><ApplicationList compact history items={items.filter(item => item.reviewed_at).sort((a,b) => b.reviewed_at!.localeCompare(a.reviewed_at!)).slice(0,5)}/></SectionCard></>
}
function ApplicationList({ items, compact = false, history = false }: { items: AdminApplication[]; compact?: boolean; history?: boolean }) {
  const location = useLocation()
  const [status, setStatus] = useState(new URLSearchParams(location.search).get('status') || 'all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const filtered = items.filter(item => (status === 'all' || (status === 'pending' ? pending(item) : item.status === status)) && `${applicationName(item)} ${item.legal_name || ''} ${item.kind}`.toLowerCase().includes(search.toLowerCase()))
  const visible = compact ? filtered : filtered.slice(page * 20, page * 20 + 20)
  return <>{!compact && <div className="admin-filters"><label>Search applications<input value={search} onChange={event => { setSearch(event.target.value); setPage(0) }} placeholder="Applicant, business or type"/></label><label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(0) }}>{['all','pending','submitted','under_review','more_information_required','approved','rejected','suspended'].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><span>{filtered.length} applications</span></div>}
    {!visible.length ? <CommerceEmpty title="No applications to show" description="No submitted applications match this view. Saved drafts do not enter the review queue."/> : <div className="admin-table"><table><thead><tr><th>Applicant / application</th><th>Type</th><th>{history ? 'Last reviewed' : 'Submitted'}</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(item => <tr key={`${item.kind}:${item.id}`}><td data-label="Application"><strong data-private>{applicationName(item)}</strong><small data-private>{item.kind === 'seller' ? item.legal_name : item.kind === 'creator' ? item.macro_category || item.category : item.professional_category}</small></td><td data-label="Type">{statusLabel(item.kind)}{item.kind === 'seller' && <small>{item.seller_type === 'gst' ? 'GST registered' : 'Non-GST'}</small>}</td><td data-label={history ? 'Last reviewed' : 'Submitted'}>{date(history ? item.reviewed_at : item.submitted_at)}</td><td data-label="Status"><StatusPill>{statusLabel(item.status)}</StatusPill></td><td data-label="Action"><Link className="inline-link" to={detailPath(item)}>Review application</Link></td></tr>)}</tbody></table></div>}
    {!compact && filtered.length > 20 && <div className="admin-pagination"><Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {Math.ceil(filtered.length / 20)}</span><Button variant="secondary" disabled={(page + 1) * 20 >= filtered.length} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </>
}
function ApplicationDetail({ onReviewed }: { onReviewed: () => void }) {
  const { kind, id } = useParams()
  const [success, setSuccess] = useState('')
  const load = useCallback(() => {
    if (!id || !['seller','creator','professional'].includes(kind || '')) return Promise.reject(new Error('Invalid application link.'))
    return adminRepository.detail(kind as ApplicationKind, id)
  }, [kind, id])
  const result = useCommerce(load)
  return <><Link to={`${base}/${kind || 'all'}`} className="inline-link">← Back to applications</Link>{success && <p className="commerce-success" role="status">{success}</p>}<CommerceResult result={result}>{detail => <DetailContent key={`${detail.application.updated_at}:${detail.application.status}`} detail={detail} onReviewed={() => { setSuccess('Decision recorded by the review service. The current application and counts have been refreshed.'); result.refresh(); onReviewed() }}/>}</CommerceResult></>
}
function DetailContent({ detail, onReviewed }: { detail: AdminDetail; onReviewed: () => void }) {
  const [decision, setDecision] = useState<ReviewDecision | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const [error, setError] = useState('')
  const [evidence, setEvidence] = useState<Evidence | null>(null)
  const item = detail.application
  const action = reviewActions(item.status).find(action => action.decision === decision)
  async function confirm() {
    if (!decision || inFlight.current) return
    inFlight.current = true; setBusy(true); setError('')
    try { await adminRepository.review(item, decision, reason); setDecision(null); onReviewed() }
    catch (cause) { setError(message(cause)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <><PageHeader eyebrow={`${statusLabel(item.kind)} application`} title="Application review" description="Inspect the submitted information and evidence before recording a decision."/><div className="admin-detail-heading"><h2 data-private>{applicationName(item)}</h2><StatusPill>{statusLabel(item.status)}</StatusPill></div>
    <div className="admin-detail-grid"><SectionCard title="Application information"><dl className="admin-fields">{detail.fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd data-private>{value}</dd></div>)}</dl></SectionCard><div><SectionCard title="Verification states"><dl className="admin-fields">{detail.verification.map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>Creator approval and professional credential approval are separate decisions.</p></SectionCard><SectionCard title="Review record"><dl className="admin-fields"><div><dt>Submitted</dt><dd>{date(item.submitted_at)}</dd></div><div><dt>Latest review</dt><dd>{date(item.reviewed_at)}</dd></div><div><dt>Reviewer</dt><dd>{detail.reviewedBy || 'No review recorded'}</dd></div><div><dt>Review note</dt><dd data-private>{item.review_note || 'No note recorded'}</dd></div><div><dt>Requested information</dt><dd data-private>{detail.requestedInformation || 'None recorded'}</dd></div></dl></SectionCard></div></div>
    <SectionCard title="Submitted evidence" description="Private evidence opens on request. Access expires after five minutes.">{detail.evidence.length ? <div className="admin-evidence">{detail.evidence.map(asset => <div key={asset.path}><ShieldCheck size={20}/><span>{asset.label}</span><Button variant="secondary" onClick={() => setEvidence(asset)}>View evidence</Button></div>)}</div> : <p>No evidence attached to this application.</p>}</SectionCard>
    <SectionCard title="Review actions"><div className="admin-actions">{reviewActions(item.status).map(action => <Button key={action.decision} variant={action.decision === 'approved' ? 'primary' : 'secondary'} onClick={() => { setDecision(action.decision); setReason(''); setError('') }}>{action.label}</Button>)}</div>{reviewActions(item.status).length === 0 && <p>No decision is available until the applicant submits or resubmits this application.</p>}</SectionCard>
    {action && <Modal title={`${action.label} application`} onClose={() => { if (!busy) setDecision(null) }}><p>This changes the applicant’s {item.kind === 'professional' ? 'professional credential' : item.kind} status to “{statusLabel(action.decision)}”.</p><label className="admin-reason">Reviewer note {action.reason ? '(required)' : '(optional)'}<textarea maxLength={4000} value={reason} disabled={busy} onChange={event => setReason(event.target.value)}/></label>{error && <p role="alert" className="form-error">{error}</p>}<div className="admin-actions"><Button variant="secondary" disabled={busy} onClick={() => setDecision(null)}>Cancel</Button><Button disabled={busy || (action.reason && !reason.trim())} onClick={() => void confirm()}>{busy ? 'Recording decision…' : `Confirm ${action.label.toLowerCase()}`}</Button></div></Modal>}
    {evidence && <EvidenceViewer asset={evidence} onClose={() => setEvidence(null)}/>}
  </>
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close() }, [])
  return <dialog ref={ref} className="admin-modal" aria-label={title} onCancel={event => { event.preventDefault(); onClose() }}><header><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X/></button></header>{children}</dialog>
}
function EvidenceViewer({ asset, onClose }: { asset: Evidence; onClose: () => void }) {
  const [revision, setRevision] = useState(0)
  const [state, setState] = useState<{url?: string; error?: string}>({})
  useEffect(() => {
    let active = true
    void adminRepository.evidence(asset.path).then(url => { if (active) setState({ url }) }).catch(cause => { if (active) setState({ error: message(cause) }) })
    const timeout = window.setTimeout(() => { if (active) setState({ error: 'Access expired. Renew access to continue viewing.' }) }, 290000)
    return () => { active = false; clearTimeout(timeout) }
  }, [asset.path, revision])
  return <Modal title={asset.label} onClose={onClose}><p>Private document · temporary authorized access</p>{state.error ? <p role="alert" className="form-error">{state.error}</p> : !state.url ? <p role="status">Opening private evidence…</p> : <div className="admin-evidence-view" data-private>{asset.mime === 'image' ? <img src={state.url} alt={asset.label} onError={() => setState({ error: 'Evidence could not load. Renew access or try again later.' })}/> : asset.mime === 'video' ? <video src={state.url} controls onError={() => setState({ error: 'Video could not load. Renew access or try again later.' })}/> : <a href={state.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open document in a new tab</a>}</div>}<Button variant="secondary" onClick={() => { setState({}); setRevision(value => value + 1) }}>Renew access</Button></Modal>
}
