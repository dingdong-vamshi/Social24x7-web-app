import { useCallback, useState } from 'react'
import { ArrowRight, Check, CheckCircle2, Clock3, FileSearch, ShieldCheck } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button, ErrorState, LoadingState, StatusPill } from '../components/Ui'
import type { PartnerRole } from '../domain/models'
import { useRepository } from '../hooks/useRepository'
import { repositories } from '../repositories/mock'

export function ApplicationStatusPage() {
  const [params] = useSearchParams()
  const role: PartnerRole = params.get('role') === 'creator' ? 'creator' : 'seller'
  const load = useCallback(() => repositories.applications.get(role), [role])
  const { data, error, loading } = useRepository(load)
  const [approved, setApproved] = useState(false)
  const navigate = useNavigate()

  async function previewApproval() {
    await repositories.applications.useApprovedFixture(role)
    setApproved(true)
  }

  const workspaceName = role === 'seller' ? 'Arjun QA Store' : 'Maya Makes'
  const workspaceLabel = role === 'seller' ? 'Seller Studio' : 'Creator Center'
  const timeline = approved && data
    ? [...data.timeline.map((event) => ({ ...event, complete: true })), { label: 'Application approved', date: 'Preview fixture', complete: true }]
    : data?.timeline

  return <div className="status-page">
    <header><Brand /><Button to="/onboarding" variant="ghost">Switch role</Button></header>
    <main>
      <div className="status-title"><div className="status-icon">{approved ? <CheckCircle2 /> : <FileSearch />}</div><div><div className="eyebrow">Partner application</div><h1>Application status</h1><p>Follow review progress and see what needs your attention.</p></div></div>
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {data && <div className="status-grid">
        <section className="application-card">
          <div className="application-head"><div><small>{role === 'seller' ? 'Seller application' : 'Creator application'} · {data.id}</small><h2>{workspaceName}</h2></div><StatusPill>{approved ? 'Approved' : 'Under review'}</StatusPill></div>
          <div className="review-callout">{approved ? <CheckCircle2 /> : <Clock3 />}<div><strong>{approved ? 'This preview application is approved' : 'Application review preview'}</strong><p>{approved ? `The approved local fixture can now open ${workspaceLabel}. No production verification occurred.` : 'In a connected environment, verification progress and any required action will appear here.'}</p></div></div>
          <dl className="application-facts"><div><dt>Submitted</dt><dd>{data.submittedAt}</dd></div><div><dt>Current stage</dt><dd>{approved ? 'Approved fixture' : 'Initial document review'}</dd></div><div><dt>Missing requirements</dt><dd>None</dd></div></dl>
          <div className="next-action"><ShieldCheck /><span><strong>{approved ? 'Workspace access is ready' : 'No action needed in this preview'}</strong><small>{approved ? `Continue to ${workspaceLabel} to inspect the operational experience.` : 'Use the approved fixture when you are ready to inspect the next stage.'}</small></span></div>
        </section>
        <aside className="timeline-card">
          <h2>Application timeline</h2>
          <ol>{timeline?.map((event) => <li key={event.label} className={event.complete ? 'complete' : ''}><span>{event.complete ? <Check size={15} /> : null}</span><div><strong>{event.label}</strong><small>{event.date}</small></div></li>)}</ol>
          <div className="fixture-box"><strong>{approved ? `Open ${workspaceLabel}` : 'Preview an approval decision'}</strong><p>{approved ? 'Continue with the approved local fixture. All workspace records remain mock data.' : 'Advance this local fixture to Approved so the complete visual flow can be reviewed without a backend.'}</p>{approved ? <Button onClick={() => navigate(`/${role}`)}>Open {workspaceLabel} <ArrowRight size={16} /></Button> : <Button onClick={previewApproval}>Preview approved status <ArrowRight size={16} /></Button>}</div>
        </aside>
      </div>}
    </main>
  </div>
}
