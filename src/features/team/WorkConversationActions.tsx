import { useMemo, useRef, useState } from 'react'
import { requireSupabase } from '../../lib/supabase'
import { label } from '../../repositories/commerce'
import { createBusinessOperationsRepository, type ShareOption, type ReturnOption, type ReturnDecision } from './businessOperationsRepository'

export function WorkConversationActions({ conversationId, permissions, onChanged, repository: suppliedRepository }: { conversationId: string; permissions: string[]; onChanged: () => void; repository?: ReturnType<typeof createBusinessOperationsRepository> }) {
  const repository = useMemo(() => suppliedRepository ?? createBusinessOperationsRepository(requireSupabase()), [suppliedRepository])
  const [mode, setMode] = useState<'product' | 'order' | 'returns' | null>(null)
  const [shares, setShares] = useState<ShareOption[]>([]), [returns, setReturns] = useState<ReturnOption[]>([])
  const [selected, setSelected] = useState(''), [decision, setDecision] = useState<ReturnDecision>('under_review'), [note, setNote] = useState('')
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('')
  const inFlight = useRef(false), retry = useRef<{ record: string; mode: string; id: string } | null>(null)
  async function open(next: 'product' | 'order' | 'returns') {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setNotice(''); setMode(null); setSelected(''); setShares([]); setReturns([])
    try {
      if (next === 'returns') setReturns(await repository.listReturns(conversationId))
      else setShares(await repository.listShares(conversationId, next))
      setMode(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Access could not be confirmed.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  async function save() {
    if (!mode || !selected || inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setNotice('')
    try {
      if (mode === 'returns') {
        const result = await repository.reviewReturn(conversationId, selected, decision, note)
        setNotice(`Return ${label(result.status).toLowerCase()}. ${result.refundProcessing === 'external_integration_pending' ? 'Refund processing is pending an external integration.' : 'No refund processing requested.'} No money was transferred.`)
      } else {
        if (retry.current?.record !== selected || retry.current.mode !== mode) retry.current = { record: selected, mode, id: crypto.randomUUID() }
        await repository.sendShare(conversationId, mode, selected, retry.current.id)
        retry.current = null; setNotice(`${label(mode)} shared with this customer.`)
      }
      setMode(null); setSelected(''); setNote(''); onChanged()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Action could not be confirmed. Refresh before retrying a return decision.') }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <section className="work-conversation-actions" aria-label="Authorized customer actions">
    <div className="commerce-row-actions">
      {permissions.includes('business_share_products_orders') && <><button type="button" className="button secondary" disabled={busy} onClick={() => void open('product')}>Share company product</button><button type="button" className="button secondary" disabled={busy} onClick={() => void open('order')}>Share customer order</button></>}
      {permissions.includes('business_returns_refunds') && <button type="button" className="button secondary" disabled={busy} onClick={() => void open('returns')}>Review customer returns</button>}
    </div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {mode && <form className="commerce-form" onSubmit={e => { e.preventDefault(); void save() }}><fieldset disabled={busy}>
      <legend>{mode === 'returns' ? 'Return review — no payment execution' : `Share ${mode} in this conversation`}</legend>
      <p>Only this company’s records for the current conversation are available. Access is checked again when you confirm. Up to 100 recent records are shown.</p>
      <label>{mode === 'returns' ? 'Return request' : label(mode)}<select required value={selected} onChange={e => setSelected(e.target.value)}><option value="">Select…</option>{(mode === 'returns' ? returns : shares).map(row => <option key={row.id} value={row.id} disabled={mode === 'returns' && !['submitted', 'under_review'].includes(row.status || '')}>{row.title || `#${row.id.slice(0, 8)}`} {row.status ? `· ${label(row.status)}` : ''}</option>)}</select></label>
      {mode === 'returns' && <><p>{returns.find(r => r.id === selected)?.reason}</p><label>Decision<select value={decision} onChange={e => setDecision(e.target.value as ReturnDecision)}><option value="under_review">Under review</option><option value="approved">Approve return and queue refund processing</option><option value="rejected">Reject return</option></select></label><label>Review note<textarea maxLength={1000} value={note} onChange={e => setNote(e.target.value)}/></label><p>Approval updates the existing return, commission and order records and queues a pending external refund. It does not transfer money or mark a refund paid.</p></>}
      {!(mode === 'returns' ? returns : shares).length && <p>No matching records. No test data has been created.</p>}
      <div className="commerce-row-actions"><button type="button" className="button secondary" onClick={() => setMode(null)}>Cancel</button><button className="button" disabled={!selected}>{busy ? 'Checking and saving…' : mode === 'returns' ? 'Confirm return decision' : 'Confirm share'}</button></div>
    </fieldset></form>}
  </section>
}
