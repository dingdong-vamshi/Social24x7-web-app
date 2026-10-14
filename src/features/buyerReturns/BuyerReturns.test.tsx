import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BuyerReturns } from './BuyerReturns'
import { ReturnOutcomeUnknown } from './repository'
const mocked = vi.hoisted(() => ({ userId: 'buyer', load: vi.fn(), submit: vi.fn(), upload: vi.fn() }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: mocked.userId }, loading: false, workContext: null }) }))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({}) }))
vi.mock('./repository', async importOriginal => ({ ...await importOriginal<typeof import('./repository')>(), buyerReturnsRepository: () => mocked }))
const data = { items: [{ id: 'item', product_title_snapshot: 'QA product', quantity: 1, return_window_ends_at: null, orders: { status: 'delivered' } }], returns: [], evidence: [] }
function expandReturns() { const element = screen.getByText('Returns and supporting evidence').closest('details')!; element.open = true; fireEvent(element, new Event('toggle')) }
beforeEach(() => { mocked.userId = 'buyer'; mocked.load.mockReset().mockResolvedValue(data); mocked.submit.mockReset(); mocked.upload.mockReset() })
describe('Buyer returns UI', () => {
  it('does not fetch returns for collapsed orders', async () => {
    render(<BuyerReturns orderId="order"/>); expect(mocked.load).not.toHaveBeenCalled()
    expandReturns(); await screen.findByLabelText('Return reason'); expect(mocked.load).toHaveBeenCalledTimes(1)
  })
  it('requires acknowledgment, retains draft on rejection, and never claims an automatic refund', async () => {
    mocked.submit.mockRejectedValue(new Error('Return window has ended'))
    render(<BuyerReturns orderId="order"/>)
    expandReturns()
    const reason = await screen.findByLabelText('Return reason')
    fireEvent.change(reason, { target: { value: 'Damaged item' } })
    expect(screen.getByRole('button', { name: 'Submit return request', hidden: true })).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox', { hidden: true }))
    fireEvent.submit(reason.closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('Return window has ended'))
    expect(reason).toHaveValue('Damaged item')
    expect(mocked.submit).toHaveBeenCalledExactlyOnceWith('order', 'item', 'Damaged item', '')
    expect(screen.getByText(/does not issue a refund/)).toBeInTheDocument()
  })
  it('blocks immediate duplicate retry after ambiguous submission', async () => {
    mocked.submit.mockRejectedValue(new ReturnOutcomeUnknown('Check saved returns before retrying'))
    render(<BuyerReturns orderId="order"/>)
    expandReturns()
    const reason = await screen.findByLabelText('Return reason')
    fireEvent.change(reason, { target: { value: 'Damaged' } }); fireEvent.click(screen.getByRole('checkbox', { hidden: true })); fireEvent.submit(reason.closest('form')!)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Submit return request', hidden: true })).toBeDisabled())
    expect(screen.getByText('Use Refresh returns above before any retry.')).toBeInTheDocument()
  })
  it('clears drafts on account switch and displays closed-return status instead of new submission controls', async () => {
    const view = render(<BuyerReturns orderId="order"/>)
    expandReturns()
    fireEvent.change(await screen.findByLabelText('Return reason'), { target: { value: 'Private draft' } })
    mocked.userId = 'other'; view.rerender(<BuyerReturns orderId="order"/>)
    expandReturns()
    expect(await screen.findByLabelText('Return reason')).toHaveValue('')
    mocked.load.mockResolvedValue({ ...data, returns: [{ id: 'return', order_item_id: 'item', status: 'rejected', reason: 'Damaged', details: null, requested_at: '2026-10-14T00:00:00Z' }] })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh returns', hidden: true }))
    await screen.findByText('rejected')
    expect(screen.queryByLabelText('Return reason')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Return evidence file')).not.toBeInTheDocument()
  })
})
