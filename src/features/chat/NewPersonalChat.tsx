import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChatRepository } from './repository'
import type { PersonalContact } from './personalDiscovery'

export function NewPersonalChat({ repository, opened, close, revision }: { repository: ChatRepository; opened: (id: string) => void; close: () => void; revision: number }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<PersonalContact[]>([])
  const [incoming, setIncoming] = useState<PersonalContact[]>([])
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)
  const generation = useRef(0)
  const acting = useRef(false)
  useEffect(() => { let active = true; void repository.incomingRequests().then(data => { if (active) setIncoming(data) }).catch(() => { if (active) setError('Incoming requests could not be loaded. Close and reopen New chat to retry.') }); return () => { active = false } }, [repository, revision, refresh])
  useEffect(() => () => { generation.current++ }, [])
  async function search(event: FormEvent) {
    event.preventDefault()
    const request = ++generation.current
    setBusy(true); setError(''); setNotice(''); setRows([]); setSearched(false)
    try { const result = await repository.searchUsernames(query); if (generation.current === request) { setRows(result); setSearched(true) } }
    catch (cause) { if (generation.current === request) setError((cause as Error).message) }
    finally { if (generation.current === request) setBusy(false) }
  }
  async function act(contact: PersonalContact, action: 'request' | 'accept' | 'decline') {
    if (acting.current) return
    acting.current = true; setBusy(true); setError(''); setNotice('')
    const request = ++generation.current
    try {
      const result = await repository.requestPersonalChat(contact.id, action)
      if (generation.current !== request) return
      if (result.conversation_id) { opened(result.conversation_id); return }
      setNotice(result.state === 'outgoing' ? 'Request sent. Messaging opens after the recipient accepts.' : result.state === 'incoming' ? 'This person has already sent you a request. Accept it below to start chatting.' : 'Request declined.')
      setRows(previous => previous.map(row => row.id === contact.id ? { ...row, request_state: result.state === 'declined' ? 'none' : result.state } : row))
      setRefresh(value => value + 1)
    } catch (cause) { if (generation.current === request) setError((cause as Error).message) }
    finally { acting.current = false; if (generation.current === request) setBusy(false) }
  }
  const contactRow = (contact: PersonalContact, request = false) => <li key={contact.id}><div><strong>{contact.display_name || contact.username}</strong><small>@{contact.username}</small></div>{request || contact.request_state === 'incoming' ? <><button type="button" disabled={busy} onClick={() => void act(contact, 'accept')}>Accept request</button><button type="button" disabled={busy} onClick={() => void act(contact, 'decline')}>Decline</button></> : <button type="button" disabled={busy || contact.request_state === 'outgoing'} onClick={() => void act(contact, 'request')}>{contact.request_state === 'accepted' ? 'Open chat' : contact.request_state === 'outgoing' ? 'Request pending' : 'Send request'}</button>}</li>
  return <section className="personal-discovery" aria-label="New personal chat"><header><h2>New chat</h2><button type="button" onClick={close}>Close</button></header><p>Find someone by username. Only discoverable profiles appear; a message request must be accepted before you can chat.</p><form onSubmit={search}><label>Search username<input autoFocus disabled={busy} value={query} maxLength={31} autoCapitalize="none" autoComplete="off" spellCheck={false} onChange={event => { generation.current++; setQuery(event.target.value); setRows([]); setSearched(false); setBusy(false) }}/></label><button type="submit" disabled={busy}>Search</button></form>{busy && <p role="status">Checking…</p>}{error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}{searched && !rows.length && <p>No permitted profiles match that username.</p>}<ul>{rows.map(row => contactRow(row))}</ul><h3>Incoming message requests</h3>{incoming.length ? <ul>{incoming.map(row => contactRow(row, true))}</ul> : <p>No incoming requests.</p>}<small>Personal messaging does not grant access to customer records or Work conversations.</small></section>
}
