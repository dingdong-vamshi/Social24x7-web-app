import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CHAT_ATTACHMENT_TYPES, GroupCreationError, newAttachmentDraft, type AttachmentDraft, type GroupContact } from './consumerExtensions'
import type { ChatRepository, Conversation } from './repository'
import './consumer-tools.css'

const errorText = (cause: unknown) => cause instanceof Error ? cause.message : 'This action could not be confirmed.'
const fileSize = (bytes: number) => bytes < 1024 ? `${bytes} bytes` : bytes < 1_048_576 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1_048_576).toFixed(2)} MiB`

export function NewGroup({ repository, created, close }: { repository: ChatRepository; created: (id: string) => void; close: () => void }) {
  const [contacts, setContacts] = useState<GroupContact[]>([]), [selected, setSelected] = useState<string[]>([])
  const [name, setName] = useState(''), [search, setSearch] = useState(''), [error, setError] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false), [revision, setRevision] = useState(0)
  const inFlight = useRef(false)
  useEffect(() => {
    let active = true
    repository.listGroupContacts().then(rows => { if (active) { setContacts(rows); setError('') } }).catch(cause => { if (active) { setContacts([]); setError(errorText(cause)) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [repository, revision])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (inFlight.current || uncertain) return
    inFlight.current = true; setBusy(true); setError('')
    try { created(await repository.createGroup(name, selected)) }
    catch (cause) { setError(errorText(cause)); setUncertain(!(cause instanceof GroupCreationError) || cause.uncertain) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <section className="consumer-chat-tools" aria-label="New group">
    <h2>New group</h2>
    <p>Choose at least two accepted contacts. You will join as the group admin.</p>
    <form onSubmit={submit}>
      <fieldset disabled={busy || uncertain}>
        <label>Group name<input autoFocus required minLength={2} maxLength={80} value={name} onChange={event => setName(event.target.value)} /></label>
        <label>Find an accepted contact<input value={search} onChange={event => setSearch(event.target.value)} /></label>
        {loading ? <p role="status">Loading accepted contacts…</p> : !contacts.length ? <p>No accepted contacts available. Accept contacts in the app before creating a group.</p> : <div className="group-contact-options">{contacts.filter(contact => `${contact.name} ${contact.username}`.toLowerCase().includes(search.toLowerCase())).map(contact => <label key={contact.id} className="group-contact-option"><input type="checkbox" checked={selected.includes(contact.id)} onChange={event => setSelected(current => event.target.checked ? [...current, contact.id] : current.filter(id => id !== contact.id))} /><span>{contact.name}{contact.username && <small>@{contact.username}</small>}</span></label>)}</div>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="consumer-chat-tool-actions">
        <button type="submit" disabled={loading || busy || uncertain || name.trim().length < 2 || selected.length < 2}>{busy ? 'Creating…' : `Create group (${selected.length})`}</button>
        {!loading && !contacts.length && !uncertain && <button type="button" disabled={busy} onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Reload contacts</button>}
        <button type="button" disabled={busy} onClick={close}>{uncertain ? 'Check conversations' : 'Cancel'}</button>
      </div>
    </form>
  </section>
}

export function GroupMembers({ repository, conversation }: { repository: ChatRepository; conversation: Conversation }) {
  const [members, setMembers] = useState<GroupContact[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    repository.listGroupMembers(conversation).then(rows => { if (active) { setMembers(rows); setError('') } }).catch(cause => { if (active) { setMembers([]); setError(errorText(cause)) } }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [repository, conversation, revision])
  return <section className="consumer-chat-tools group-members" aria-label="Group members">
    <h3>Group members</h3>
    {loading ? <p role="status">Loading members…</p> : error ? <p role="alert">{error} <button type="button" onClick={() => { setLoading(true); setRevision(value => value + 1) }}>Retry member list</button></p> : <ul>{members.map(member => <li key={member.id}><span>{member.name}{member.username && <small>@{member.username}</small>}</span><span>{member.role === 'admin' ? 'Admin' : 'Member'}</span></li>)}</ul>}
    <p>Membership changes and group administration are not available here.</p>
  </section>
}

export function AttachmentComposer({ repository, conversation, userId, disabled, sent }: { repository: ChatRepository; conversation: Conversation; userId: string; disabled: boolean; sent: () => void }) {
  const inputId = useId()
  const [draft, setDraft] = useState<AttachmentDraft | null>(null), [error, setError] = useState(''), [stage, setStage] = useState(''), [busy, setBusy] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const inFlight = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (attempted) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [attempted])
  async function send(event: FormEvent) {
    event.preventDefault()
    if (!draft || disabled || inFlight.current) return
    inFlight.current = true; setAttempted(true); setBusy(true); setError('')
    try {
      await repository.sendAttachment(conversation, draft, setStage)
      setAttempted(false); setDraft(null); setStage('Attachment saved.'); if (input.current) input.current.value = ''; sent()
    } catch (cause) { setError(errorText(cause)); setStage('') }
    finally { inFlight.current = false; setBusy(false) }
  }
  function clear() { setAttempted(false); setDraft(null); setError(''); setStage(''); if (input.current) input.current.value = ''; sent() }
  return <form className="chat-upload" onSubmit={send} aria-label="Send attachment">
    <label htmlFor={inputId}>Attach a file <small>Images, video or documents · up to 100 MiB</small></label>
    <input ref={input} id={inputId} type="file" accept={CHAT_ATTACHMENT_TYPES.join(',')} disabled={disabled || busy || attempted} onChange={event => {
      const file = event.target.files?.[0]; setError(''); setStage('')
      if (!file) { setDraft(null); return }
      try { setDraft(newAttachmentDraft(file, conversation.id, userId)) } catch (cause) { setDraft(null); setError(errorText(cause)); event.target.value = '' }
    }} />
    {draft && <><p>{draft.file.name} · {fileSize(draft.file.size)}</p><div className="consumer-chat-tool-actions"><button type="submit" disabled={disabled || busy}>{busy ? 'Sending attachment…' : attempted ? 'Check / retry attachment' : 'Send attachment'}</button><button type="button" disabled={busy} onClick={clear}>{attempted ? 'Close draft and check history' : 'Remove file'}</button></div></>}
    {stage && <p role="status">{stage}</p>}
    {error && <p role="alert">{error}{attempted && ' Keep this draft to retry safely. Closing it does not cancel a possibly saved message.'}</p>}
  </form>
}
