import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CompanyMedia } from './CompanyMedia'
import { BusinessWork } from '../../pages/BusinessWork'

const mock = vi.hoisted(() => ({
  mediaUrl: vi.fn(),
  repository: { getContext: vi.fn(), listInbox: vi.fn(), listMessages: vi.fn(), markRead: vi.fn(), sendMessage: vi.fn(), resolve: vi.fn(), subscribe: vi.fn() },
}))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({}) }))
vi.mock('./companyMediaRepository', async original => ({ ...await original<object>(), companyMediaUrl: mock.mediaUrl }))
vi.mock('../businessWorkspace/businessWorkspaceRepository', () => ({ createBusinessWorkspaceRepository: () => mock.repository }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'worker', app_metadata: { account_type: 'business_employee' } }, loading: false, signOut: vi.fn() }) }))

const context = { storefrontId: 'store', storefrontName: 'Fictional QA Store', membershipId: 'member', fullName: 'QA Worker', customerTagline: 'from QA', roleName: 'Agent', status: 'verified', permissions: ['business_chat_reply'] }
const conversation = { conversationId: 'chat', storefrontId: 'store', customerDisplayName: 'Fictional Customer', lastMessage: 'Earlier reply', workStatus: 'open', assigneeMembershipId: 'member', assigneeName: 'QA Worker', unreadCount: 0 }
beforeEach(() => {
  vi.clearAllMocks()
  mock.mediaUrl.mockResolvedValue('https://storage.example/signed-qa.jpg')
  mock.repository.getContext.mockResolvedValue(context)
  mock.repository.listInbox.mockResolvedValue([conversation])
  mock.repository.listMessages.mockResolvedValue([{ messageId: 'message', body: 'Authorized history', senderDisplayName: 'Customer', messageKind: 'text', createdAt: '2026-10-14T09:00:00Z' }])
  mock.repository.markRead.mockResolvedValue(undefined)
  mock.repository.sendMessage.mockResolvedValue(undefined)
  mock.repository.subscribe.mockReturnValue(() => {})
})

describe('company media UI — mocked storage, not production media proof', () => {
  it('shows a media failure and retries without hiding company content', async () => {
    render(<CompanyMedia reference={{ bucket: 'product-media', path: 'qa/photo.jpg' }} alt="QA product" />)
    fireEvent.error(await screen.findByRole('img', { name: 'QA product' }))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('This image is unavailable. Please retry.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry media' }))
    expect(await screen.findByRole('img', { name: 'QA product' })).toBeInTheDocument()
    expect(mock.mediaUrl).toHaveBeenCalledTimes(2)
  })
  it('shows storage denial with a retry instead of an unsigned URL', async () => {
    mock.mediaUrl.mockRejectedValue(new Error('Access changed'))
    render(<CompanyMedia reference={{ bucket: 'product-media', path: 'qa/photo.jpg' }} alt="QA product" />)
    expect(await screen.findByText('Access changed')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('renders controlled video without autoplay', async () => {
    const { container } = render(<CompanyMedia reference={{ bucket: 'social-posts', path: 'qa/video.mp4' }} alt="QA company video" video />)
    await screen.findByLabelText('QA company video')
    const video = container.querySelector('video')!
    expect(video.controls).toBe(true)
    expect(video.autoplay).toBe(false)
  })
})

describe('Business Work UI authorization and retry — mocked lifecycle', () => {
  async function thread() {
    render(<MemoryRouter><BusinessWork /></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button', { name: /Fictional Customer/ }))
    await screen.findByText('Authorized history')
  }
  it('retains a failed reply and retries with the same canonical client ID', async () => {
    mock.repository.sendMessage.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValue(undefined)
    await thread()
    fireEvent.change(screen.getByLabelText('Reply as work identity'), { target: { value: 'Fictional reply' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted')
    expect(screen.getByLabelText('Reply as work identity')).toHaveValue('Fictional reply')
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    await waitFor(() => expect(mock.repository.sendMessage).toHaveBeenCalledTimes(2))
    const first = mock.repository.sendMessage.mock.calls[0]
    expect(first[2]).toMatch(/^[a-f0-9-]{36}$/)
    expect(mock.repository.sendMessage.mock.calls[1]).toEqual(first)
    await waitFor(() => expect(screen.getByLabelText('Reply as work identity')).toHaveValue(''))
  })
  it('rechecks revoked reply permission before dispatching', async () => {
    await thread()
    mock.repository.getContext.mockResolvedValue({ ...context, permissions: [] })
    fireEvent.change(screen.getByLabelText('Reply as work identity'), { target: { value: 'Fictional reply' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('reply permission or assignment is no longer available')
    expect(mock.repository.sendMessage).not.toHaveBeenCalled()
  })
  it('clears visible inbox/history when access refresh confirms suspension', async () => {
    await thread()
    mock.repository.getContext.mockResolvedValue({ ...context, status: 'suspended' })
    fireEvent.click(screen.getByRole('button', { name: 'Refresh access' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Work access is no longer verified')
    expect(screen.queryByText('Authorized history')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Reply as work identity')).not.toBeInTheDocument()
  })
  it('excludes unrelated storefronts from the verified work inbox', async () => {
    mock.repository.listInbox.mockResolvedValue([{ ...conversation, storefrontId: 'other-store' }])
    render(<MemoryRouter><BusinessWork /></MemoryRouter>)
    expect(await screen.findByText('No authorized conversations match.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Fictional Customer/ })).not.toBeInTheDocument()
  })
})
