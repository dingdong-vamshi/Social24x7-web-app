import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ConsumerWeb, BusinessChat } from '../../pages/ConsumerWeb'
import type { Conversation, Message } from './repository'

const mocks = vi.hoisted(() => ({
  listConversations: vi.fn(), getConversation: vi.fn(), reconcile: vi.fn(), listMessages: vi.fn(),
  send: vi.fn(), markRead: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(), signOut: vi.fn(),
}))
vi.mock('../../lib/supabase', () => ({ supabase: {}, requireSupabase: () => ({}) }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'qa-user' }, loading: false, configured: true, signOut: mocks.signOut }) }))
vi.mock('./repository', async original => ({ ...(await original<typeof import('./repository')>()), createChatRepository: () => mocks }))

const conversation: Conversation = { id: 'qa-conversation', kind: 'personal', title: null, name: 'Fictional QA contact', updated_at: '2026-01-01T00:00:00Z', business_context: null, business_customer_id: null, storefront_id: null, storeName: null, names: { 'qa-other': 'QA contact' }, conversation_participants: [{ user_id: 'qa-user', last_read_at: null, cleared_at: null, archived_at: null }] }
const message: Message = { id: 'qa-message', conversation_id: conversation.id, sender_id: 'qa-other', kind: 'text', body: 'Fictional QA history', payload: {}, client_id: null, created_at: '2026-01-01T00:00:00Z', edited_at: null, deleted_at: null, expires_at: null }

function renderChat(path = '/web/chat/qa-conversation', business = false) {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/web/chat/:id" element={<ConsumerWeb />} /><Route path="/web/chats" element={<ConsumerWeb />} /><Route path="/partner/seller/chat" element={business ? <BusinessChat /> : <ConsumerWeb />} /></Routes></MemoryRouter>)
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(Element.prototype, 'scrollIntoView', { value: vi.fn(), configurable: true })
  mocks.listConversations.mockResolvedValue([conversation])
  mocks.getConversation.mockResolvedValue(conversation)
  mocks.reconcile.mockResolvedValue([message])
  mocks.markRead.mockResolvedValue(undefined)
  mocks.send.mockResolvedValue(message)
  mocks.subscribe.mockReturnValue(mocks.unsubscribe)
})
afterEach(cleanup)

describe('consumer conversation interactions', () => {
  it('renders canonical history, sends Enter through the repository and cleans up subscription', async () => {
    const view = renderChat()
    expect(await screen.findByText('Fictional QA history')).toBeInTheDocument()
    const input = screen.getByRole('textbox', { name: 'Message' })
    fireEvent.change(input, { target: { value: 'Hello from fictional QA' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith(conversation, 'Hello from fictional QA', expect.any(String)))
    await waitFor(() => expect(input).toHaveValue(''))
    view.unmount()
    expect(mocks.unsubscribe).toHaveBeenCalled()
  })
  it('preserves the failed send and client ID for a safe retry', async () => {
    mocks.send.mockRejectedValueOnce(new Error('Delivery could not be confirmed.'))
    renderChat()
    const input = await screen.findByRole('textbox', { name: 'Message' })
    fireEvent.change(input, { target: { value: 'Fictional retry' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Delivery could not be confirmed.')
    expect(input).toHaveValue('Fictional retry')
    expect(input).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Retry delivery' }))
    await waitFor(() => expect(mocks.send).toHaveBeenCalledTimes(2))
    expect(mocks.send.mock.calls[0][2]).toBe(mocks.send.mock.calls[1][2])
  })
  it('shows a real denial and no composer for an unavailable conversation', async () => {
    mocks.getConversation.mockResolvedValue(null)
    renderChat()
    expect(await screen.findByRole('alert')).toHaveTextContent('do not have access')
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
    expect(screen.queryByText('Fictional QA history')).not.toBeInTheDocument()
  })
  it('filters the existing inbox without fabricating an empty conversation', async () => {
    renderChat('/web/chats')
    await screen.findByText('Fictional QA contact')
    fireEvent.change(screen.getByRole('textbox', { name: 'Search your conversations' }), { target: { value: 'does-not-exist' } })
    expect(screen.getByText('No matching conversations')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
  })
  it('distinguishes offline from connecting and reconciles after connectivity returns', async () => {
    renderChat()
    await screen.findByText('Fictional QA history')
    fireEvent(window, new Event('offline'))
    expect(screen.getByText('Offline · reconnect to receive updates')).toBeInTheDocument()
    const loadsBeforeReconnect = mocks.reconcile.mock.calls.length
    fireEvent(window, new Event('online'))
    expect(screen.getByText('Connecting · checking for updates')).toBeInTheDocument()
    await waitFor(() => expect(mocks.reconcile.mock.calls.length).toBeGreaterThan(loadsBeforeReconnect))
    act(() => mocks.subscribe.mock.calls[0][1](true))
    expect(screen.getByText('Connected')).toBeInTheDocument()
  })
  it('keeps business owner customer monitoring read-only and requests business-only data', async () => {
    const business = { ...conversation, kind: 'business', business_context: 'buyer_seller', business_customer_id: 'qa-other' }
    mocks.getConversation.mockResolvedValue(business)
    mocks.listConversations.mockResolvedValue([business])
    renderChat('/partner/seller/chat?conversation=qa-conversation', true)
    expect(await screen.findByText(/This conversation is read-only here/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
    expect(mocks.listConversations).toHaveBeenCalledWith(true, 0, undefined)
    expect(mocks.getConversation).toHaveBeenCalledWith('qa-conversation', true, undefined)
  })
  it('removes an expiring message locally without waiting for another network response', async () => {
    mocks.reconcile.mockResolvedValue([{ ...message, expires_at: new Date(Date.now() + 300).toISOString() }])
    renderChat()
    expect(await screen.findByText('Fictional QA history')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Fictional QA history')).not.toBeInTheDocument())
    expect(mocks.reconcile).toHaveBeenCalledTimes(1)
  })
  it('drops visible history, inbox labels and composer after membership is revoked', async () => {
    renderChat()
    expect(await screen.findByText('Fictional QA history')).toBeInTheDocument()
    mocks.getConversation.mockResolvedValue(null)
    mocks.listConversations.mockResolvedValue([])
    act(() => mocks.subscribe.mock.calls[0][0]())
    expect(await screen.findByRole('alert')).toHaveTextContent('do not have access')
    expect(screen.queryByText('Fictional QA history')).not.toBeInTheDocument()
    expect(screen.queryByText('Fictional QA contact')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Message' })).not.toBeInTheDocument()
  })
  it('does not trust a media URL embedded in an unsupported message payload', async () => {
    mocks.reconcile.mockResolvedValue([{ ...message, kind: 'image', payload: { url: 'https://untrusted.invalid/private.jpg' } }])
    renderChat()
    expect(await screen.findByText(/Open in the mobile app for full details/)).toBeInTheDocument()
    expect(document.querySelector('[src="https://untrusted.invalid/private.jpg"]')).toBeNull()
    expect(document.querySelector('[href="https://untrusted.invalid/private.jpg"]')).toBeNull()
  })
})
