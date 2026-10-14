import { useCallback, useState } from 'react'
import { assertAdmin, statusLabel } from '../repositories/admin'
import { CommerceEmpty, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, PageHeader, SectionCard, StatusPill } from '../components/Ui'

interface ReturnRow { id: string; order_id: string; status: string; reason: string; admin_note: string | null; requested_at: string; reviewed_at: string | null }
interface RefundRow { id: string; return_request_id: string; order_id: string; amount_minor: number; status: string; created_at: string }
async function loadAdminReturns() {
  const client = await assertAdmin()
  // Existing RLS is authoritative. Never use a privileged client to fill this queue.
  const returns = await client.from('return_requests').select('id,order_id,status,reason,admin_note,requested_at,reviewed_at').order('requested_at', { ascending: false }).limit(100)
  if (returns.error) throw returns.error
  const refunds = await client.from('refund_requests').select('id,return_request_id,order_id,amount_minor,status,created_at').order('created_at', { ascending: false }).limit(100)
  if (refunds.error) throw refunds.error
  return { returns: returns.data as ReturnRow[], refunds: refunds.data as RefundRow[] }
}
export function AdminReturns() {
  const result = useCommerce(useCallback(() => loadAdminReturns(), []))
  const [filter, setFilter] = useState('all')
  return <><PageHeader title="Returns & refund requests" eyebrow="Administration" description="Read-only review of records allowed by the existing backend. Latest 100 records per queue." actions={<Button variant="secondary" onClick={result.refresh}>Refresh</Button>}/>
    <p className="commerce-notice">No money is moved here. The existing approval RPC also changes commissions and creates refund requests; decision controls remain unavailable until its repeat-decision safety is verified. Return visibility follows store access rules and may not include every business.</p>
    <CommerceResult result={result}>{data => <><SectionCard title="Return review"><label>Status<select value={filter} onChange={event => setFilter(event.target.value)}>{['all', ...new Set(data.returns.map(row => row.status))].map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>{!data.returns.filter(row => filter === 'all' || row.status === filter).length ? <CommerceEmpty title="No accessible returns" description="No returns match this view. An empty list is not proof that the global queue is empty."/> : <div className="admin-table"><table><thead><tr><th>Order</th><th>Status</th><th>Request</th><th>Latest review</th></tr></thead><tbody>{data.returns.filter(row => filter === 'all' || row.status === filter).map(row => <tr key={row.id}><td data-label="Order">{row.order_id.slice(0, 8)}</td><td data-label="Status"><StatusPill>{statusLabel(row.status)}</StatusPill></td><td data-label="Request"><span data-private>{row.reason}</span><small>{new Date(row.requested_at).toLocaleDateString('en-IN')}</small></td><td data-label="Latest review"><span data-private>{row.admin_note || 'No reviewer note'}</span><small>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString('en-IN') : 'Not reviewed'}</small></td></tr>)}</tbody></table></div>}</SectionCard>
    <SectionCard title="Refund status" description="Provider-pending is not a completed payout. Amounts are shown in stored minor units because this table does not record currency.">{!data.refunds.length ? <CommerceEmpty title="No refund requests" description="No accessible refund requests were returned."/> : <div className="admin-table"><table><thead><tr><th>Order</th><th>Recorded amount</th><th>Status</th></tr></thead><tbody>{data.refunds.map(row => <tr key={row.id}><td data-label="Order">{row.order_id.slice(0,8)}</td><td data-label="Amount">{row.amount_minor.toLocaleString('en-IN')} minor units · currency not recorded</td><td data-label="Status"><StatusPill>{statusLabel(row.status)}</StatusPill></td></tr>)}</tbody></table></div>}</SectionCard></>}</CommerceResult>
  </>
}
