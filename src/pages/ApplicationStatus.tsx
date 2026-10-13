import { useCallback } from 'react'
import { ArrowRight, Check, Clock3, FileSearch, ShieldCheck } from 'lucide-react'
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
  const navigate = useNavigate()
  async function openApproved() {
    await repositories.applications.useApprovedFixture(role)
    navigate(`/${role}`)
  }
  return <div className="status-page"><header><Brand /><Button to="/onboarding" variant="ghost">Switch role</Button></header><main><div className="status-title"><div className="status-icon"><FileSearch /></div><div><div className="eyebrow">Partner application</div><h1>Application status</h1><p>Follow review progress and see what needs your attention.</p></div></div>{loading && <LoadingState />}{error && <ErrorState message={error} />}{data && <div className="status-grid"><section className="application-card"><div className="application-head"><div><small>{role === 'seller' ? 'Seller application' : 'Creator application'} · {data.id}</small><h2>{role === 'seller' ? 'Arjun QA Store' : 'Maya Makes'}</h2></div><StatusPill>Under review</StatusPill></div><div className="review-callout"><Clock3 /><div><strong>Our verification team is reviewing your application</strong><p>Most applications receive an initial review within 2–3 business days. We’ll show any required action here.</p></div></div><dl className="application-facts"><div><dt>Submitted</dt><dd>{data.submittedAt}</dd></div><div><dt>Current stage</dt><dd>Initial document review</dd></div><div><dt>Missing requirements</dt><dd>None</dd></div></dl><div className="next-action"><ShieldCheck /><span><strong>No action needed right now</strong><small>Keep your phone available if the review team needs clarification.</small></span></div></section><aside className="timeline-card"><h2>Application timeline</h2><ol>{data.timeline.map((event) => <li key={event.label} className={event.complete ? 'complete' : ''}><span>{event.complete ? <Check size={15} /> : null}</span><div><strong>{event.label}</strong><small>{event.date}</small></div></li>)}</ol><div className="fixture-box"><strong>Review the approved workspace</strong><p>Use an approved local fixture to inspect the operational experience while backend review is not connected.</p><Button onClick={openApproved}>Open {role === 'seller' ? 'Seller Studio' : 'Creator Center'} <ArrowRight size={16} /></Button></div></aside></div>}</main></div>
}
