import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AdminDashboard } from '../pages/Admin'
import { AdminReturns } from '../pages/AdminReturns'
import type { AdminApplication, AdminDetail } from '../repositories/admin'

const mocks = vi.hoisted(() => ({
  auth: { user: { id: 'fictional-admin' } as { id: string } | null, profile: { display_name: 'QA reviewer' }, access: { admin_access: true }, loading: false, error: null as string | null },
  list: vi.fn(), detail: vi.fn(), review: vi.fn(), evidence: vi.fn(), assertAdmin: vi.fn(), from: vi.fn(),
}))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => mocks.auth }))
vi.mock('../components/AccountMenu', () => ({ AccountMenu: () => <span>QA reviewer</span> }))
vi.mock('../repositories/admin', async (original) => ({ ...await original<typeof import('../repositories/admin')>(), adminRepository: { list: mocks.list, detail: mocks.detail, review: mocks.review, evidence: mocks.evidence }, assertAdmin: mocks.assertAdmin }))
const application: AdminApplication = { id: 'fictional-request', owner_id: 'fictional-applicant', kind: 'professional', status: 'submitted', submitted_at: '2026-10-14T09:00:00Z', updated_at: '2026-10-14T09:00:00Z', reviewed_at: null, review_note: null, professional_title: 'Fictional professional' }
const detail: AdminDetail = { application, fields: [['Qualification', 'Fictional QA degree']], verification: [['Identity', 'Verified']], evidence: [{ label: 'Professional credential', path: 'fictional/private.pdf', mime: 'pdf' }], requestedInformation: null, reviewedBy: null }
function mountDetail() {
  return render(<MemoryRouter initialEntries={['/partner/admin/application/professional/fictional-request']}><Routes><Route path="/partner/admin/application/:kind/:id" element={<AdminDashboard />} /></Routes></MemoryRouter>)
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.user = { id: 'fictional-admin' }; mocks.auth.access.admin_access = true; mocks.auth.loading = false; mocks.auth.error = null
  mocks.list.mockResolvedValue([application]); mocks.detail.mockResolvedValue(detail); mocks.review.mockResolvedValue({ decision: 'approved', applicationId: application.id }); mocks.evidence.mockResolvedValue('https://signed.example/temporary')
  mocks.assertAdmin.mockResolvedValue({ from: mocks.from })
  mocks.from.mockImplementation((table: string) => {
    const query = { select: vi.fn(), order: vi.fn(), limit: vi.fn() }
    query.select.mockReturnValue(query); query.order.mockReturnValue(query)
    query.limit.mockResolvedValue({ data: table === 'return_requests' ? [{ id: 'fictional-return', order_id: 'order-qa-123', status: 'requested', reason: 'Fictional damaged parcel', admin_note: null, requested_at: '2026-10-14T09:00:00Z', reviewed_at: null }] : [{ id: 'fictional-refund', order_id: 'order-qa-123', return_request_id: 'fictional-return', amount_minor: 12345, status: 'provider_pending', created_at: '2026-10-14T09:00:00Z' }], error: null })
    return query
  })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => { vi.useRealTimers() })

describe('Admin decision acceptance without production mutations', () => {
  it.each([
    ['Approve', 'approved', false], ['Reject', 'rejected', true], ['Request more information', 'more_information_required', true],
  ] as const)('%s requires explicit confirmation and submits the correct existing decision', async (button, decision, requiresReason) => {
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    fireEvent.click(screen.getByRole('button', { name: button }))
    expect(mocks.review).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toHaveTextContent('professional credential status')
    const confirm = screen.getByRole('button', { name: `Confirm ${button.toLowerCase()}` })
    expect(confirm.hasAttribute('disabled')).toBe(requiresReason)
    fireEvent.change(screen.getByLabelText(/Reviewer note/), { target: { value: '   ' } })
    expect(confirm.hasAttribute('disabled')).toBe(requiresReason)
    fireEvent.change(screen.getByLabelText(/Reviewer note/), { target: { value: 'Fictional QA review note' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.review).toHaveBeenCalledWith(application, decision, 'Fictional QA review note'))
    await screen.findByText(/Decision recorded by the review service/)
    expect(mocks.detail).toHaveBeenCalledTimes(2)
    expect(mocks.list).toHaveBeenCalledTimes(2)
  })
  it('cancels a decision without calling the review service', async () => {
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(mocks.review).not.toHaveBeenCalled()
  })
  it('keeps note and dialog on a rejected RPC, enables retry and never displays success', async () => {
    mocks.review.mockRejectedValueOnce(new Error('Application changed during review'))
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    fireEvent.click(screen.getByRole('button', { name: 'Request more information' }))
    fireEvent.change(screen.getByLabelText(/Reviewer note/), { target: { value: 'Please provide clearer evidence.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm request more information' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Application changed during review')
    expect(screen.getByLabelText(/Reviewer note/)).toHaveValue('Please provide clearer evidence.')
    expect(screen.getByRole('button', { name: 'Confirm request more information' })).toBeEnabled()
    expect(screen.queryByText(/Decision recorded by the review service/)).not.toBeInTheDocument()
  })
  it('does not offer approved-professional correction or reapproval', async () => {
    mocks.detail.mockResolvedValue({ ...detail, application: { ...application, status: 'approved' } })
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    expect(screen.getByRole('button', { name: 'Suspend' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request more information' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
  })
})

describe('Admin private evidence acceptance', () => {
  it('expires its document link and requests a fresh signed URL only on explicit renewal', async () => {
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    expect(mocks.evidence).not.toHaveBeenCalled()
    vi.useFakeTimers()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'View evidence' })) })
    expect(screen.getByRole('link', { name: 'Open document in a new tab' })).toHaveAttribute('href', 'https://signed.example/temporary')
    await act(async () => { vi.advanceTimersByTime(290000) })
    expect(screen.queryByRole('link', { name: 'Open document in a new tab' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Access expired')
    expect(mocks.evidence).toHaveBeenCalledTimes(1)
    mocks.evidence.mockResolvedValueOnce('https://signed.example/fresh')
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Renew access' })) })
    expect(screen.getByRole('link', { name: 'Open document in a new tab' })).toHaveAttribute('href', 'https://signed.example/fresh')
    expect(mocks.evidence).toHaveBeenCalledTimes(2)
  })
  it('handles image load failure without keeping an inaccessible media URL visible', async () => {
    mocks.detail.mockResolvedValue({ ...detail, evidence: [{ label: 'Credential image', path: 'fictional/private.png', mime: 'image' }] })
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    fireEvent.click(screen.getByRole('button', { name: 'View evidence' }))
    fireEvent.error(await screen.findByRole('img', { name: 'Credential image' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Evidence could not load')
    expect(screen.queryByRole('img', { name: 'Credential image' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Renew access' })).toBeInTheDocument()
  })
  it('shows denied signing and does not offer a public URL fallback', async () => {
    mocks.evidence.mockRejectedValue(new Error('Private storage access denied'))
    mountDetail(); await screen.findByRole('heading', { name: 'Fictional professional' })
    fireEvent.click(screen.getByRole('button', { name: 'View evidence' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Private storage access denied')
    expect(screen.queryByRole('link', { name: 'Open document in a new tab' })).not.toBeInTheDocument()
  })
})

describe('Admin returns queue read-only and authorization', () => {
  it('shows only authorized return/refund reads, no decision or payout controls', async () => {
    render(<MemoryRouter><AdminReturns /></MemoryRouter>)
    await screen.findByText('Fictional damaged parcel')
    expect(mocks.assertAdmin).toHaveBeenCalledTimes(1)
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['return_requests', 'refund_requests'])
    expect(screen.getByText('12,345 minor units · currency not recorded')).toBeInTheDocument()
    expect(screen.getByText(/Provider-pending is not a completed payout/)).toBeInTheDocument()
    expect(screen.getAllByRole('button').map(button => button.textContent)).toEqual(['Refresh'])
    expect(mocks.review).not.toHaveBeenCalled()
  })
  it('refuses queue reads when backend Admin assertion fails', async () => {
    mocks.assertAdmin.mockRejectedValue(new Error('Admin access required.'))
    render(<MemoryRouter><AdminReturns /></MemoryRouter>)
    expect(await screen.findByText('Admin access required.')).toBeInTheDocument()
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.review).not.toHaveBeenCalled()
    expect(screen.queryByText('Fictional damaged parcel')).not.toBeInTheDocument()
  })
  it.each(['non-admin', 'signed-out', 'loading', 'access-error'])('Admin dashboard does not mount or fetch private returns for %s', (state) => {
    if (state === 'non-admin') mocks.auth.access.admin_access = false
    if (state === 'signed-out') mocks.auth.user = null
    if (state === 'loading') mocks.auth.loading = true
    if (state === 'access-error') mocks.auth.error = 'Authorization unavailable'
    render(<MemoryRouter initialEntries={['/partner/admin/returns']}><AdminDashboard /></MemoryRouter>)
    expect(mocks.assertAdmin).not.toHaveBeenCalled(); expect(mocks.list).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', { name: 'Returns & refund requests' })).not.toBeInTheDocument()
  })
})
