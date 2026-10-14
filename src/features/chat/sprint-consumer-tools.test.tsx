import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AttachmentComposer, GroupMembers, NewGroup } from './ConsumerChatTools'
import { createConsumerExtensions, GroupCreationError, newAttachmentDraft, validateChatFile } from './consumerExtensions'
import type { ChatRepository, Conversation } from './repository'

const user = '11111111-1111-4111-8111-111111111111', chat = '22222222-2222-4222-8222-222222222222', other = '33333333-3333-4333-8333-333333333333', third = '44444444-4444-4444-8444-444444444444'
const conversation: Conversation = { id: chat, kind: 'personal', title: null, name: 'QA', names: {}, storeName: null, updated_at: '2026-10-14', business_context: null, business_customer_id: null, storefront_id: null, conversation_participants: [{ user_id: user, cleared_at: null, archived_at: null, last_read_at: null }] }
const fixtureFile = () => new File(['fictional QA'], 'qa.txt', { type: 'text/plain' })
function mockClient(rows: { data: unknown; error: unknown }[] = []) {
  const queue = [...rows]
  const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn(async () => queue.shift() ?? { data: null, error: null }) }
  const upload = vi.fn().mockResolvedValue({ data: { path: 'stored' }, error: null }), remove = vi.fn()
  const raw = { rpc: vi.fn(), from: vi.fn(() => query), storage: { from: vi.fn(() => ({ upload, remove })) } }
  return { raw, query, upload, remove, repository: createConsumerExtensions(raw as unknown as SupabaseClient, user) }
}

describe('consumer group contracts — mocked, not live group creation', () => {
  it('loads only accepted contacts through the canonical RPC', async () => {
    const mock = mockClient(); mock.raw.rpc.mockResolvedValue({ data: [{ id: other, display_name: 'QA Contact', username: 'qa' }], error: null })
    expect(await mock.repository.listGroupContacts()).toEqual([{ id: other, name: 'QA Contact', username: 'qa' }])
    expect(mock.raw.rpc).toHaveBeenCalledWith('list_group_eligible_contacts')
  })
  it('deduplicates selections, excludes the creator, and preserves the group RPC', async () => {
    const mock = mockClient(); mock.raw.rpc.mockResolvedValue({ data: chat, error: null })
    expect(await mock.repository.createGroup('  QA Group  ', [other, third, other, user])).toBe(chat)
    expect(mock.raw.rpc).toHaveBeenCalledWith('create_group_conversation', { group_name: 'QA Group', member_ids: [other, third] })
  })
  it.each([['A', [other, third]], ['Valid', [other]], ['A'.repeat(81), [other, third]]])('validates before writing', async (name, ids) => {
    const mock = mockClient()
    await expect(mock.repository.createGroup(name as string, ids as string[])).rejects.toThrow('2–80')
    expect(mock.raw.rpc).not.toHaveBeenCalled()
  })
  it('distinguishes SQL rollback from unknown transport outcomes', async () => {
    const mock = mockClient(); mock.raw.rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Select accepted contacts' } })
    await expect(mock.repository.createGroup('QA', [other, third])).rejects.toMatchObject({ uncertain: false })
    mock.raw.rpc.mockRejectedValue(new Error('Connection lost'))
    await expect(mock.repository.createGroup('QA', [other, third])).rejects.toMatchObject({ uncertain: true })
    mock.raw.rpc.mockResolvedValue({ data: null, error: null })
    await expect(mock.repository.createGroup('QA', [other, third])).rejects.toMatchObject({ uncertain: true })
  })
  it('gates member inspection on group membership and uses canonical roles', async () => {
    const mock = mockClient(); mock.raw.rpc.mockResolvedValue({ data: [{ id: user, display_name: 'QA Admin', member_role: 'admin' }], error: null })
    expect((await mock.repository.listGroupMembers({ ...conversation, kind: 'group' }))[0].role).toBe('admin')
    expect(mock.raw.rpc).toHaveBeenCalledWith('get_group_members', { target_conversation: chat })
    await expect(mock.repository.listGroupMembers(conversation)).rejects.toThrow('Group membership')
    await expect(mock.repository.listGroupMembers({ ...conversation, kind: 'group', conversation_participants: [] })).rejects.toThrow('Group membership')
  })
})

describe('private attachment delivery recovery — mocked storage/RPC', () => {
  it('rejects invalid files and constructs one path from conversation, user, UUID', () => {
    expect(() => validateChatFile(new File([], 'empty.txt', { type: 'text/plain' }))).toThrow('non-empty')
    expect(() => validateChatFile(new File(['x'], 'unsafe.svg', { type: 'image/svg+xml' }))).toThrow('Supported files')
    const oversized = fixtureFile(); Object.defineProperty(oversized, 'size', { value: 104_857_601 })
    expect(() => validateChatFile(oversized)).toThrow('100 MiB')
    expect(newAttachmentDraft(fixtureFile(), chat, user).storagePath).toMatch(new RegExp(`^${chat}/${user}/[a-f0-9-]{36}\\.txt$`))
  })
  it('uploads privately without overwrite then finalizes through the existing RPC', async () => {
    const mock = mockClient(); const draft = newAttachmentDraft(fixtureFile(), chat, user)
    mock.raw.rpc.mockResolvedValue({ data: { id: 'message' }, error: null })
    await mock.repository.sendAttachment(conversation, draft)
    expect(mock.raw.storage.from).toHaveBeenCalledWith('chat-media')
    expect(mock.upload).toHaveBeenCalledWith(draft.storagePath, draft.file, { contentType: 'text/plain', upsert: false })
    expect(mock.raw.rpc).toHaveBeenCalledWith('send_chat_attachment', { target_conversation: chat, target_storage_path: draft.storagePath, target_filename: 'qa.txt', target_mime_type: 'text/plain', target_bytes: draft.file.size, target_width: null, target_height: null, target_duration_ms: null, target_source: 'document_picker' })
    expect(mock.remove).not.toHaveBeenCalled()
  })
  it('recovers a finalized retry without uploading or sending again', async () => {
    const saved = { id: 'message', payload: { attachment_id: 'attachment' } }
    const mock = mockClient([{ data: { id: 'attachment', status: 'finalized' }, error: null }, { data: saved, error: null }])
    const draft = newAttachmentDraft(fixtureFile(), chat, user)
    expect(await mock.repository.sendAttachment(conversation, draft)).toEqual(saved)
    expect(mock.upload).not.toHaveBeenCalled(); expect(mock.raw.rpc).not.toHaveBeenCalled()
    expect(mock.query.eq).toHaveBeenCalledWith('storage_path', draft.storagePath)
    expect(mock.query.eq).toHaveBeenCalledWith('sender_id', user)
    expect(mock.query.eq).toHaveBeenCalledWith('payload->>attachment_id', 'attachment')
  })
  it('recovers an ambiguous finalization response through canonical metadata and never removes the object', async () => {
    const mock = mockClient([{ data: null, error: null }, { data: { id: 'attachment', status: 'finalized' }, error: null }, { data: { id: 'saved-message' }, error: null }])
    mock.raw.rpc.mockRejectedValue(new Error('Connection lost after commit'))
    expect(await mock.repository.sendAttachment(conversation, newAttachmentDraft(fixtureFile(), chat, user))).toEqual({ id: 'saved-message' })
    expect(mock.remove).not.toHaveBeenCalled()
  })
  it('retries with the original object path after unknown finalization, without another upload', async () => {
    const mock = mockClient(); const draft = newAttachmentDraft(fixtureFile(), chat, user)
    mock.raw.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Network lost' } }).mockResolvedValue({ data: { id: 'message' }, error: null })
    await expect(mock.repository.sendAttachment(conversation, draft)).rejects.toThrow('could not be confirmed')
    await mock.repository.sendAttachment(conversation, draft)
    expect(mock.upload).toHaveBeenCalledTimes(1)
    expect(mock.raw.rpc.mock.calls[0][1].target_storage_path).toBe(mock.raw.rpc.mock.calls[1][1].target_storage_path)
    expect(mock.remove).not.toHaveBeenCalled()
  })
  it('can finalize the original upload after retry returns a storage conflict', async () => {
    const mock = mockClient(); mock.upload.mockResolvedValue({ error: { statusCode: '409' } })
    mock.raw.rpc.mockResolvedValue({ data: { id: 'message' }, error: null })
    await mock.repository.sendAttachment(conversation, newAttachmentDraft(fixtureFile(), chat, user))
    expect(mock.raw.rpc).toHaveBeenCalledTimes(1)
  })
  it('does not upload when canonical delivery lookup fails or owner monitoring is read-only', async () => {
    const mock = mockClient([{ data: null, error: { message: 'Denied' } }]); const draft = newAttachmentDraft(fixtureFile(), chat, user)
    await expect(mock.repository.sendAttachment(conversation, draft)).rejects.toThrow('could not be checked')
    await expect(mock.repository.sendAttachment({ ...conversation, kind: 'business', business_context: 'buyer_seller', business_customer_id: other }, draft)).rejects.toThrow('read-only')
    expect(mock.upload).not.toHaveBeenCalled(); expect(mock.raw.rpc).not.toHaveBeenCalled()
  })
})

describe('consumer tools UI — controlled responses only', () => {
  it('locks group retry after unknown creation and offers inbox reconciliation', async () => {
    const createGroup = vi.fn().mockRejectedValue(new GroupCreationError('Check conversations before creating another.', true)), close = vi.fn()
    const repository = { listGroupContacts: vi.fn().mockResolvedValue([{ id: other, name: 'QA One' }, { id: third, name: 'QA Two' }]), createGroup } as unknown as ChatRepository
    render(<NewGroup repository={repository} created={vi.fn()} close={close} />)
    fireEvent.change(screen.getByLabelText('Group name'), { target: { value: 'Fictional QA group' } })
    fireEvent.click(await screen.findByLabelText('QA One')); fireEvent.click(screen.getByLabelText('QA Two'))
    fireEvent.click(screen.getByRole('button', { name: 'Create group (2)' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Check conversations')
    expect(screen.getByRole('button', { name: 'Create group (2)' })).toBeDisabled()
    expect(createGroup).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Check conversations' })); expect(close).toHaveBeenCalled()
  })
  it('renders authorized group member roles without administration controls', async () => {
    const repository = { listGroupMembers: vi.fn().mockResolvedValue([{ id: user, name: 'QA Admin', role: 'admin' }, { id: other, name: 'QA Member', role: 'member' }]) } as unknown as ChatRepository
    render(<GroupMembers repository={repository} conversation={{ ...conversation, kind: 'group' }} />)
    expect(await screen.findByText('QA Admin')).toBeInTheDocument(); expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove|promote/i })).not.toBeInTheDocument()
  })
  it('retains attachment draft identity, disables replacement, and safely retries', async () => {
    const sendAttachment = vi.fn().mockRejectedValueOnce(new Error('Unknown delivery')).mockResolvedValue({ id: 'saved' }), sent = vi.fn()
    render(<AttachmentComposer repository={{ sendAttachment } as unknown as ChatRepository} conversation={conversation} userId={user} disabled={false} sent={sent} />)
    const input = screen.getByLabelText(/Attach a file/)
    fireEvent.change(input, { target: { files: [fixtureFile()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Send attachment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unknown delivery')
    expect(input).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Check / retry attachment' }))
    await waitFor(() => expect(sendAttachment).toHaveBeenCalledTimes(2))
    expect(sendAttachment.mock.calls[0][1]).toBe(sendAttachment.mock.calls[1][1])
    expect(await screen.findByText('Attachment saved.')).toBeInTheDocument()
  })
})
