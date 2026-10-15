import { useEffect, useId, useRef, type ReactNode } from 'react'
import { BadgeCheck, X } from 'lucide-react'
import type { TeamDashboard, TeamMember, TeamMemberMetrics } from './types'
import { teamStatusLabel } from './rules'

/** Native modal supplies inert background, focus containment and Escape handling. */
export function TeamDialog({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useId()
  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement as HTMLElement | null
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '') // DOM-only test environments
    return () => { dialog.close?.(); previous?.focus() }
  }, [])
  return <dialog ref={ref} className="team-dialog team-management" aria-labelledby={heading}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')).filter(element => element.getClientRects().length > 0)
      const first = controls[0], last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="team-dialog-header"><h2 id={heading}>{title}</h2>
      <button type="button" className="button ghost" aria-label={`Close ${title}`} disabled={busy} onClick={onClose}><X size={20}/></button>
    </header>
    <div className="team-dialog-body">{children}</div>
  </dialog>
}

export function RepresentativeBadge() {
  return <span className="team-verified" title="Verified representative"><BadgeCheck size={17} aria-hidden="true"/><span className="sr-only">Verified representative</span></span>
}

export function TeamSteps() {
  return <ol className="team-steps" aria-label="Employee activation steps">
    {[
      ['Create login', 'Invite your employee and share their one-time code privately.'],
      ['Employee activates', 'They choose their own private Work password.'],
      ['Review and approve', 'Check their identity, role and permissions.'],
      ['Verified work access', 'Their name and company appear in assigned customer chats.'],
    ].map(([title, description], index) => <li key={title}><span>{index + 1}</span><div><strong>{title}</strong><p>{description}</p></div></li>)}
  </ol>
}

export function TeamCounts({ dashboard, selected, onSelect }: {
  dashboard: TeamDashboard; selected: string; onSelect: (value: string) => void
}) {
  const items = [
    ['verified', 'verified', 'Verified members', 'Approved representatives, including the owner'],
    ['awaitingApproval', 'awaiting_approval', 'Awaiting approval', 'Review the activated employee'],
    ['notActivated', 'not_activated', 'Not activated', 'Employee has not created a password'],
    ['suspended', 'suspended', 'Suspended', 'Work access is paused'],
  ] as const
  return <div className="team-counts" aria-label="Team status overview">{items.map(([key, status, title, detail]) =>
    <button key={key} type="button" aria-label={`${title}: ${dashboard.counts[key] ?? dashboard.members.filter(m => m.status === status).length}`} aria-pressed={selected === status} onClick={() => onSelect(selected === status ? 'all' : status)}>
      <span>{title}</span><strong>{dashboard.counts[key] ?? dashboard.members.filter(m => m.status === status).length}</strong><small>{detail}</small>
    </button>)}
  </div>
}

export function TeamRoster({ members, metrics, onOpen }: {
  members: TeamMember[]; metrics: TeamMemberMetrics[]; onOpen: (id: string) => void
}) {
  return <div className="team-roster">{members.map(member => {
    const metric = metrics.find(row => row.membershipId === member.id)
    return <button className="team-roster-row" key={member.id} type="button" aria-label={`Open team member ${member.fullName}`} onClick={() => onOpen(member.id)}>
      <span className="team-avatar" aria-hidden="true">{member.fullName.slice(0, 1).toUpperCase()}</span>
      <span className="team-roster-identity"><strong>{member.fullName} {member.representativeVerified && <RepresentativeBadge/>}</strong><small>{member.jobTitle || member.roleName} · {member.department}</small><small>{member.identityKind === 'owner_personal' ? 'Owner · protected identity' : member.roleName}</small></span>
      <span className="team-roster-metric"><strong>{metric?.openChats ?? '—'}</strong><small>open chats</small></span>
      <span className={`team-state team-state-${member.status}`}>{teamStatusLabel[member.status]}</span><span aria-hidden="true">›</span>
    </button>
  })}</div>
}

export function MemberMetrics({ metric }: { metric?: TeamMemberMetrics }) {
  return <><div className="team-member-metrics" aria-label="Member chat metrics">{[
    ['Open chats', metric?.openChats], ['Resolved', metric?.resolvedChats],
    ['Currently assigned total', metric?.lifetimeChats], ['Waiting for reply', metric?.waitingForReply],
    ...(metric?.recordedLifetimeChats === undefined ? [] : [['Recorded lifetime chats', metric.recordedLifetimeChats]]),
  ].map(([name, count]) => <div key={name}><strong>{count ?? '—'}</strong><span>{name}</span></div>)}</div>
  <small>{metric?.recordedLifetimeChats === undefined ? 'Historical totals await backend activation. Current assignments remain accurate.' : `Recorded lifetime counts distinct conversations from retained assignment history and current assignments. Unrecorded earlier assignments cannot be recovered.${metric.firstRecordedAt ? ` Earliest retained record: ${new Date(metric.firstRecordedAt).toLocaleDateString()}.` : ''}`}</small></>
}

export function CustomerIdentityPreview({ name, tagline, company, verified = false, preview = false }: {
  name: string; tagline: string; company: string; verified?: boolean; preview?: boolean
}) {
  return <aside className="team-customer-preview" aria-label="Customer identity preview">
    <h3>{preview ? 'Customer preview · after approval' : 'Customer-facing identity'}</h3>
    <p className="team-preview-company">{company}</p>
    <div className="team-preview-bubble"><strong>{name.trim() || 'Employee name'} {(verified || preview) && <RepresentativeBadge/>}</strong><small>{tagline.trim() || `from ${company}`}</small><p>Hi! How can I help you today?</p></div>
    <p>{preview ? 'Illustration only. The blue tick appears only after activation, your approval and business verification. No message is sent.' : verified ? 'Verified representative. Replies still require permission and an assigned conversation.' : 'Work access is not verified. No blue tick or reply access is granted.'}</p>
  </aside>
}
