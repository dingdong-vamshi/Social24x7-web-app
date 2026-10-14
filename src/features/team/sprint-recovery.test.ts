import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { companyMediaUrl, companyProductMedia, isCompanyStoragePath } from './companyMediaRepository'
import { validateTeamInvitation } from './rules'
import { createTeamRepository } from './repository'
import { createBusinessWorkspaceRepository } from '../businessWorkspace/businessWorkspaceRepository'

const invitation = { storefrontId: 'store', fullName: 'QA Employee', workEmail: 'employee@example.com', loginId: 'qa.employee', customerTagline: 'from QA', jobTitle: 'Agent', employeeId: '', department: 'Support', roleId: 'agent' }
const asClient = (value: unknown) => value as SupabaseClient

describe('recovery sprint invitation contracts — mocked, not live activation proof', () => {
  it.each(['employee@example.com', 'employee@example.org', 'first.last+tag@team.example.co.uk', 'qa@example.test', ' USER@EXAMPLE.COM '])('accepts the current backend-compatible syntax: %s', workEmail => {
    expect(validateTeamInvitation({ ...invitation, workEmail }).valid).toBe(true)
  })
  it.each(['a@@example.com', 'a @example.com', 'a@example', '@example.com', 'a@example.', 'a.example.com'])('rejects malformed email: %s', workEmail => {
    expect(validateTeamInvitation({ ...invitation, workEmail }).valid).toBe(false)
  })
  it('enforces database full-name length', () => {
    expect(validateTeamInvitation({ ...invitation, fullName: 'A'.repeat(101) }).valid).toBe(false)
  })
  it.each([null, [], {}, { activation_code: '', expires_at: '2026-10-15' }, { activation_code: 'FICTIONAL' }])('does not present missing activation credentials as success', async data => {
    const repository = createTeamRepository(asClient({ rpc: vi.fn().mockResolvedValue({ data, error: null }) }))
    await expect(repository.invite(invitation)).rejects.toThrow('Activation credentials were not returned')
  })
  it('preserves resend member identity when the canonical RPC omits it', async () => {
    const repository = createTeamRepository(asClient({ rpc: vi.fn().mockResolvedValue({ data: [{ activation_code: 'FICTIONAL', expires_at: '2026-10-15' }], error: null }) }))
    expect((await repository.resend('member')).membershipId).toBe('member')
  })
})

describe('company feed media boundaries', () => {
  it.each(['https://evil.example/a.png', '//evil/a.png', '/root.png', '../a.png', 'store/../a.png', 'a%2fb.png', 'a\\b.png', 'a?token=b', 'a#b', 'a\u0000b', 'a//b'])('rejects non-object or unsafe path %s', path => expect(isCompanyStoragePath(path)).toBe(false))
  it('accepts nested object paths', () => expect(isCompanyStoragePath('store/product/image-01.jpg')).toBe(true))
  it('signs private product media for five minutes without a public fallback', async () => {
    const bucket = { createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed' }, error: null }), getPublicUrl: vi.fn() }
    const from = vi.fn().mockReturnValue(bucket)
    expect(await companyMediaUrl(asClient({ storage: { from } }), { bucket: 'product-media', path: 'store/product.jpg' })).toContain('/signed')
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('store/product.jpg', 300)
    expect(bucket.getPublicUrl).not.toHaveBeenCalled()
    bucket.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'Denied' } } as never)
    await expect(companyMediaUrl(asClient({ storage: { from } }), { bucket: 'product-media', path: 'store/product.jpg' })).rejects.toThrow('access has changed')
    expect(bucket.getPublicUrl).not.toHaveBeenCalled()
  })
  it.each(['social-posts', 'shop-media'] as const)('uses only established public bucket %s', async bucketName => {
    const bucket = { getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example/public' } }), createSignedUrl: vi.fn() }
    const from = vi.fn().mockReturnValue(bucket)
    await companyMediaUrl(asClient({ storage: { from } }), { bucket: bucketName, path: 'owner/media.jpg' })
    expect(from).toHaveBeenCalledWith(bucketName)
    expect(bucket.createSignedUrl).not.toHaveBeenCalled()
  })
  it('resolves product images from authorized bucket metadata, not guessed cover paths', async () => {
    const rows = [{ product_id: 'p', path: 'private/cover.jpg', storage_bucket: 'product-media', position: 1 }, { product_id: 'p', path: 'public/first.jpg', storage_bucket: 'shop-media', position: 0 }]
    const query = { select: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), order: vi.fn().mockResolvedValue({ data: rows, error: null }) }
    const products = [{ id: 'p', coverPath: 'private/cover.jpg' }, { id: 'hidden', coverPath: 'secret.jpg' }] as Parameters<typeof companyProductMedia>[1]
    expect(await companyProductMedia(asClient({ from: () => query }), products)).toEqual({ p: { bucket: 'product-media', path: 'private/cover.jpg' }, hidden: null })
    expect(query.in).toHaveBeenCalledWith('product_id', ['p', 'hidden'])
  })
})

describe('work delivery recovery — mocked canonical responses', () => {
  function client(row: unknown, error: unknown = { message: 'Connection interrupted' }) {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }) }
    const rpc = vi.fn().mockResolvedValue({ data: null, error })
    const value = asClient({ rpc, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'worker' } }, error: null }) }, from: vi.fn().mockReturnValue(query) })
    return { value, rpc, query }
  }
  it('reuses the supplied client ID and confirms an interrupted committed write only through a matching authorized canonical row', async () => {
    const mock = client({ id: 'message', body: 'QA reply' })
    const repository = createBusinessWorkspaceRepository(mock.value)
    await repository.sendMessage('conversation', 'QA reply', 'stable-id')
    await repository.sendMessage('conversation', 'QA reply', 'stable-id')
    expect(mock.rpc).toHaveBeenNthCalledWith(2, 'send_business_employee_message', { target_conversation: 'conversation', message_body: 'QA reply', message_client_id: 'stable-id' })
    expect(mock.query.eq).toHaveBeenCalledWith('sender_id', 'worker')
    expect(mock.query.eq).toHaveBeenCalledWith('conversation_id', 'conversation')
    expect(mock.query.eq).toHaveBeenCalledWith('client_id', 'stable-id')
  })
  it.each([null, { id: 'other', body: 'Different content' }])('does not treat absent/mismatched canonical content as delivered', async row => {
    const mock = client(row)
    await expect(createBusinessWorkspaceRepository(mock.value).sendMessage('conversation', 'QA reply', 'stable-id')).rejects.toThrow('Connection interrupted')
  })
  it('does not claim success if canonical confirmation is denied', async () => {
    const mock = client(null)
    mock.query.maybeSingle.mockResolvedValue({ data: { id: 'm', body: 'QA reply' }, error: { message: 'Denied' } } as never)
    await expect(createBusinessWorkspaceRepository(mock.value).sendMessage('conversation', 'QA reply', 'stable-id')).rejects.toThrow()
  })
  it('uses unique channels, refreshes on reconnection, and stops callbacks after cleanup', () => {
    const callbacks: ((status: string) => void)[] = []
    const channel = vi.fn().mockImplementation(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn((callback: (status: string) => void) => callbacks.push(callback)) }))
    const removeChannel = vi.fn()
    const repository = createBusinessWorkspaceRepository(asClient({ channel, removeChannel }))
    const changed = vi.fn(), stop = repository.subscribe('store', changed)
    const secondStop = repository.subscribe('store', vi.fn())
    expect(new Set(channel.mock.calls.map(args => args[0])).size).toBe(8)
    callbacks[0]('SUBSCRIBED'); callbacks[0]('SUBSCRIBED')
    expect(changed).toHaveBeenCalledTimes(2)
    stop(); callbacks[0]('SUBSCRIBED')
    expect(changed).toHaveBeenCalledTimes(2)
    expect(removeChannel).toHaveBeenCalledTimes(4)
    secondStop()
  })
})
