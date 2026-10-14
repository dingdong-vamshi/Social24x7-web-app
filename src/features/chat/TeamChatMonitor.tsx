import { useCallback, useEffect, useMemo, useState } from 'react'
import { CommerceEmpty, CommerceResult, useCommerce } from '../../components/LiveCommerce'
import { Button, StatusPill } from '../../components/Ui'
import { requireSupabase } from '../../lib/supabase'
import { dateTime, label, type TeamDashboard } from '../../repositories/commerce'
import { createTeamChatRepository, type SupervisedConversation } from './teamRepository'
import './team.css'

export function TeamChatMonitor({ storefrontId, members }: { storefrontId: string; members: TeamDashboard['members'] }) {
  const repository = useMemo(() => createTeamChatRepository(requireSupabase()), [])
  const [memberId, setMemberId] = useState('all')
  const [status, setStatus] = useState('all')
  const [selected, setSelected] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(n => n + 1) }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('online', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('online', refresh); document.removeEventListener('visibilitychange', refresh) }
  }, [])
  const load = useCallback(() => { void revision; return repository.conversations(storefrontId) }, [repository, storefrontId, revision])
  const result = useCommerce(load)
  return <section className="team-monitor" aria-labelledby="team-chat-title">
    <header className="team-monitor-heading"><div><h2 id="team-chat-title">Assigned customer chats</h2><p>Monitor your team's authorized business conversations. Personal chats are never included.</p></div><Button variant="secondary" onClick={() => setRevision(n => n + 1)}>Refresh chats</Button></header>
    <div className="team-chat-filters"><label>Employee<select value={memberId} onChange={event => { setMemberId(event.target.value); setSelected('') }}><option value="all">All team members</option>{members.map(member => <option key={member.id} value={member.id}>{member.fullName} · {label(member.status)}</option>)}</select></label><label>Conversation status<select value={status} onChange={event => { setStatus(event.target.value); setSelected('') }}><option value="all">All statuses</option><option value="open">Open</option><option value="resolved">Resolved</option></select></label></div>
    <p className="team-chat-boundary">Read-only monitoring · Replies and reassignment remain in the existing Business Work / Team Management flow. Suspended or removed members do not regain access here.</p>
    <CommerceResult result={result}>{rows => {
      const filtered = rows.filter(row => (memberId === 'all' || row.assignee_membership_id === memberId) && (status === 'all' || row.work_status === status))
      const conversation = filtered.find(row => row.conversation_id === selected)
      return filtered.length ? <div className="team-chat-layout"><nav className="team-chat-list" aria-label="Assigned conversations">{filtered.map(row => <button type="button" key={row.conversation_id} aria-pressed={row.conversation_id === selected} onClick={() => setSelected(row.conversation_id)}><strong>{row.customer_display_name}</strong><span>{row.assignee_name || 'Unassigned'} · {label(row.work_status)}</span><small>{row.last_message || 'No messages yet'}</small><time>{dateTime(row.last_message_at)}</time></button>)}</nav>{conversation ? <TeamThread key={`${storefrontId}:${memberId}:${conversation.conversation_id}:${revision}`} storefrontId={storefrontId} memberId={memberId} conversation={conversation} repository={repository}/> : <CommerceEmpty title="Select a customer chat" description="Choose a conversation to see its business history and sender attribution."/>}</div> : <CommerceEmpty title={memberId === 'all' ? 'No authorized customer chats' : 'No chats assigned to this member'} description="No conversations match this storefront, employee and status. Historical messages may belong to a reassigned conversation; employee status alone does not imply an assigned chat."/>
    }}</CommerceResult>
  </section>
}

function TeamThread({ storefrontId, memberId, conversation, repository }: { storefrontId: string; memberId: string; conversation: SupervisedConversation; repository: ReturnType<typeof createTeamChatRepository> }) {
  const load = useCallback(() => repository.messages(storefrontId, conversation.conversation_id, memberId), [repository, storefrontId, conversation.conversation_id, memberId])
  const result = useCommerce(load)
  return <section className="team-chat-thread" aria-label="Business conversation history"><header><h3>{conversation.customer_display_name}</h3><p>{conversation.assignee_name || 'Unassigned'} <StatusPill>{label(conversation.work_status)}</StatusPill></p></header><CommerceResult result={result}>{messages => messages.length ? <ol>{messages.map(message => <li key={message.message_id}><strong>{message.sender_display_name || 'Business'} <small>· {label(message.sender_type)}</small></strong>{message.sender_tagline && <small>{message.sender_tagline}</small>}<p>{message.body || 'Message without text'}</p>{message.message_kind !== 'text' && <small>{label(message.message_kind)} · Open in the existing app for full content.</small>}<time dateTime={message.created_at}>{dateTime(message.created_at)}</time></li>)}</ol> : <CommerceEmpty title="No messages yet" description="This authorized conversation has no visible messages."/>}</CommerceResult></section>
}
