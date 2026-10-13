import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createChatRepository, mayCompose, mergeMessages, visibleMessages, type Conversation, type Message } from './repository'

const viewer = '11111111-1111-4111-8111-111111111111'
const conversationId = '22222222-2222-4222-8222-222222222222'
const clientId = '33333333-3333-4333-8333-333333333333'
const conversation: Conversation = { id: conversationId, kind: 'personal', name: 'QA conversation', title: null, updated_at: '2026-01-01T00:00:00Z', business_context: null, business_customer_id: null, storefront_id: null, names: {}, storeName: null, conversation_participants: [{ user_id: viewer, last_read_at: null, archived_at: null, cleared_at: null }] }
const message = (number: number, overrides: Partial<Message> = {}): Message => ({ id: `00000000-0000-4000-8000-${String(number).padStart(12, '0')}`, conversation_id: conversationId, sender_id: viewer, kind: 'text', body: 'Fictional QA message', payload: {}, client_id: clientId, created_at: new Date(Date.UTC(2026, 0, 1, 0, number)).toISOString(), edited_at: null, deleted_at: null, expires_at: null, ...overrides })

function clientWith(results: { data: unknown; error: unknown }[]) {
  const queue = [...results]
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(), gt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(), range: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(() => Promise.resolve(queue.shift() ?? { data: null, error: null })),
    then: (resolve: (value: unknown) => void) => Promise.resolve(queue.shift() ?? { data: [], error: null }).then(resolve),
  }
  const raw = { from: vi.fn(() => query), rpc: vi.fn(), storage: { from: vi.fn() } }
  return { raw, query, client: raw as unknown as SupabaseClient }
}

describe('canonical chat history', () => {
  it('deduplicates canonical IDs, replaces updates and uses stable timestamp/ID ordering', () => {
    const a = message(1)
    const b = message(2, { created_at: a.created_at })
    expect(mergeMessages([b, a], [{ ...a, body: 'Edited' }])).toEqual([{ ...a, body: 'Edited' }, b])
  })
  it('hides deleted, cleared and expired rows without persisting them locally', () => {
    const rows = [message(1), message(2, { deleted_at: '2026-01-01' }), message(3, { expires_at: '2026-01-02' }), message(4)]
    expect(visibleMessages(rows, message(1).created_at, Date.parse('2026-01-03'))).toEqual([message(4)])
  })
  it('uses timestamp AND ID cursor so identical timestamps do not lose messages', async () => {
    const { client, query } = clientWith([{ data: [message(1)], error: null }])
    const cursor = message(2)
    await createChatRepository(client, viewer).listMessages(conversation, cursor)
    expect(query.eq).toHaveBeenCalledWith('conversation_id', conversationId)
    expect(query.or).toHaveBeenCalledWith(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    expect(query.limit).toHaveBeenCalledWith(50)
  })
  it('reconciles an offline gap larger than one page and removes old deleted rows', async () => {
    const latest = Array.from({ length: 50 }, (_, i) => message(i + 53)).reverse()
    const middle = Array.from({ length: 50 }, (_, i) => message(i + 3)).reverse()
    const oldest = [message(2)]
    const { client, query } = clientWith([{ data: latest, error: null }, { data: middle, error: null }, { data: oldest, error: null }, { data: [], error: null }])
    const result = await createChatRepository(client, viewer).reconcile(conversation, [message(1), message(2)])
    expect(result).toHaveLength(101)
    expect(result[0].id).toBe(message(2).id)
    expect(result.at(-1)?.id).toBe(message(102).id)
    expect(query.in).toHaveBeenCalledWith('id', [message(1).id])
  })
})

describe('message sending and authorization', () => {
  it('identifies the customer in an owner business inbox instead of naming every row after their store', async () => {
    const customer = '44444444-4444-4444-8444-444444444444'
    const store = '55555555-5555-4555-8555-555555555555'
    const row = { ...conversation, kind: 'business', storefront_id: store, business_context: 'buyer_seller', business_customer_id: customer, conversation_participants: [...conversation.conversation_participants, { user_id: customer, last_read_at: null, cleared_at: null, archived_at: null }] }
    const { client } = clientWith([{ data: [row], error: null }, { data: [{ id: viewer, display_name: 'Owner' }, { id: customer, display_name: 'QA Customer' }], error: null }, { data: [{ id: store, name: 'QA Store' }], error: null }])
    expect((await createChatRepository(client, viewer).listConversations(true))[0].name).toBe('QA Customer · QA Store')
  })
  it('allows group members and customer replies but keeps unassigned owner monitoring read-only', () => {
    expect(mayCompose({ ...conversation, kind: 'group' }, viewer)).toBe(true)
    const business = { ...conversation, kind: 'business' as const, business_context: 'buyer_seller' }
    expect(mayCompose(business, viewer)).toBe(false)
    expect(mayCompose({ ...business, business_customer_id: viewer }, viewer)).toBe(true)
    expect(mayCompose({ ...business, business_context: 'creator_seller' }, viewer)).toBe(true)
    expect(mayCompose({ ...conversation, conversation_participants: [] }, viewer)).toBe(false)
  })
  it('recovers a previously delivered retry without sending a second message', async () => {
    const delivered = message(1)
    const { client, raw, query } = clientWith([{ data: delivered, error: null }])
    await expect(createChatRepository(client, viewer).send(conversation, 'Test', clientId)).resolves.toEqual(delivered)
    expect(raw.rpc).not.toHaveBeenCalled()
    expect(query.eq).toHaveBeenCalledWith('sender_id', viewer)
    expect(query.eq).toHaveBeenCalledWith('client_id', clientId)
  })
  it('uses the original RPC and same client ID, recovering a concurrent unique-key conflict', async () => {
    const delivered = message(1)
    const { client, raw } = clientWith([{ data: null, error: null }, { data: delivered, error: null }])
    raw.rpc.mockResolvedValue({ data: null, error: { code: '23505' } })
    await expect(createChatRepository(client, viewer).send(conversation, '  QA  ', clientId)).resolves.toEqual(delivered)
    expect(raw.rpc).toHaveBeenCalledWith('send_personal_message', { target_conversation: conversationId, message_body: 'QA', message_kind: 'text', message_payload: {}, message_client_id: clientId })
  })
  it('does not write when delivery lookup fails, membership is absent or message exceeds server limit', async () => {
    const { client, raw } = clientWith([{ data: null, error: { code: 'NETWORK_ERROR' } }])
    const repository = createChatRepository(client, viewer)
    await expect(repository.send(conversation, 'QA', clientId)).rejects.toThrow('verify delivery')
    await expect(repository.send({ ...conversation, conversation_participants: [] }, 'QA', clientId)).rejects.toThrow('read-only')
    await expect(repository.send(conversation, 'a'.repeat(2001), clientId)).rejects.toThrow('2,000')
    expect(raw.rpc).not.toHaveBeenCalled()
  })
})

describe('private attachments and customer orders', () => {
  it('signs only an attachment returned by authorized metadata lookup, for 60 seconds', async () => {
    const attachment = { id: clientId, storage_path: 'authorized/private/file.pdf', original_filename: 'QA.pdf', attachment_type: 'document', mime_type: 'application/pdf', bytes: 25 }
    const { client, raw, query } = clientWith([{ data: attachment, error: null }])
    const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.invalid/short-lived' }, error: null })
    raw.storage.from.mockReturnValue({ createSignedUrl })
    const result = await createChatRepository(client, viewer).openAttachment(conversationId, clientId)
    expect(result.attachment).toEqual(attachment)
    expect(query.eq).toHaveBeenCalledWith('conversation_id', conversationId)
    expect(raw.storage.from).toHaveBeenCalledWith('chat-media')
    expect(createSignedUrl).toHaveBeenCalledWith(attachment.storage_path, 60, { download: 'QA.pdf' })
  })
  it('never signs a missing or unauthorized attachment', async () => {
    const { client, raw } = clientWith([{ data: null, error: null }])
    await expect(createChatRepository(client, viewer).openAttachment(conversationId, clientId)).rejects.toThrow('no longer have access')
    expect(raw.storage.from).not.toHaveBeenCalled()
  })
  it('limits order history to the signed-in buyer even if their session can manage stores', async () => {
    const { client, query } = clientWith([{ data: [], error: null }])
    await createChatRepository(client, viewer).listOrders(1)
    expect(query.eq).toHaveBeenCalledWith('customer_id', viewer)
    expect(query.range).toHaveBeenCalledWith(50, 99)
  })
})
