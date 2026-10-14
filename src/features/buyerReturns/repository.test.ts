import type { SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it, vi } from 'vitest'
import { buyerReturnsRepository, returnEligibility, ReturnOutcomeUnknown, validateReturnFile, type BuyerReturnItem } from './repository'

const item: BuyerReturnItem = { id: 'item', product_title_snapshot: 'QA item', quantity: 1, return_window_ends_at: null, orders: { status: 'delivered' } }
const request = { id: 'request', order_item_id: 'item', status: 'submitted', reason: 'Damaged', details: null, requested_at: '2026-10-14T00:00:00Z' }
function fixture(existing = false) {
  const queries: Record<string, ReturnType<typeof vi.fn>>[] = []
  const from = vi.fn((table: string) => {
    const response = { data: table === 'order_items' ? [item] : table === 'return_requests' ? existing ? [request] : [] : [], error: null }
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), in: vi.fn(), limit: vi.fn().mockResolvedValue(response) }
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.order.mockReturnValue(query); query.in.mockReturnValue(query); queries.push(query)
    return query
  })
  const rpc = vi.fn().mockResolvedValue({ data: request, error: null })
  const upload = vi.fn().mockResolvedValue({ data: {}, error: null }), remove = vi.fn()
  const auth = { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'buyer' } }, error: null }) }
  const client = { auth, from, rpc, storage: { from: vi.fn().mockReturnValue({ upload, remove }) } }
  return { ...client, upload, remove, queries, repo: buyerReturnsRepository(client as unknown as SupabaseClient, 'buyer') }
}
describe('buyer return eligibility and repository', () => {
  it('matches backend delivery states and nullable deadline without inventing a window', () => {
    for (const status of ['delivered', 'return_requested', 'return_approved', 'return_rejected']) expect(returnEligibility({ ...item, orders: [{ status }] }, undefined)).toBeNull()
    expect(returnEligibility({ ...item, orders: { status: 'shipped' } }, undefined)).toMatch(/after delivery/)
    expect(returnEligibility({ ...item, return_window_ends_at: '2020-01-01' }, undefined)).toMatch(/ended/)
    expect(returnEligibility({ ...item, return_window_ends_at: 'invalid' }, undefined)).toMatch(/verified/)
    expect(returnEligibility(item, { ...request, status: 'rejected' })).toMatch(/already exists/)
  })
  it('rejects unsupported evidence MIME and malformed sizes', () => {
    for (const size of [0, -1, NaN, 15728641]) expect(() => validateReturnFile({ size, type: 'image/png' })).toThrow()
    expect(() => validateReturnFile({ size: 10, type: 'application/pdf' })).toThrow()
    expect(() => validateReturnFile({ size: 15728640, type: 'video/mp4' })).not.toThrow()
  })
  it('filters reads to expected buyer and refuses switched accounts before queries', async () => {
    const f = fixture(); await f.repo.load('order')
    expect(f.queries[0].eq).toHaveBeenCalledWith('buyer_id', 'buyer')
    expect(f.queries[1].eq).toHaveBeenCalledWith('order_id', 'order')
    f.auth.getUser.mockResolvedValue({ data: { user: { id: 'other' } }, error: null })
    await expect(f.repo.submit('order', 'item', 'Reason', '')).rejects.toThrow(/account changed/)
    expect(f.rpc).not.toHaveBeenCalled()
  })
  it('submits only whitelisted lifecycle parameters, with no refund or trusted intent call', async () => {
    const f = fixture(); await f.repo.submit('order', 'item', '  Damaged  ', '  Box damaged  ')
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('submit_creator_commerce_return', { p_order_item_id: 'item', p_reason: 'Damaged', p_details: 'Box damaged' })
  })
  it('does not submit duplicate or inaccessible items', async () => {
    const duplicate = fixture(true); await expect(duplicate.repo.submit('order', 'item', 'Damaged', '')).rejects.toThrow(/already exists/)
    expect(duplicate.rpc).not.toHaveBeenCalled()
    const other = fixture(); await expect(other.repo.submit('order', 'not-owned', 'Damaged', '')).rejects.toThrow(/not available/)
    expect(other.rpc).not.toHaveBeenCalled()
  })
  it('treats lost submission response as uncertain instead of claiming failure or success', async () => {
    const f = fixture(); f.rpc.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(f.repo.submit('order', 'item', 'Damaged', '')).rejects.toBeInstanceOf(ReturnOutcomeUnknown)
  })
  it('uploads evidence using the uploaded-only intent and preserves object on uncertain finalization', async () => {
    const f = fixture(true)
    f.rpc.mockResolvedValueOnce({ data: { intent_id: 'intent', path_prefix: 'buyer/orders/order/return/request/file' }, error: null }).mockRejectedValueOnce(new Error('lost response'))
    await expect(f.repo.upload('order', 'item', 'request', new File(['x'], 'evidence.png', { type: 'image/png' }))).rejects.toBeInstanceOf(ReturnOutcomeUnknown)
    expect(f.rpc).toHaveBeenNthCalledWith(1, 'begin_uploaded_commerce_evidence_capture', { p_order_id: 'order', p_order_item_id: 'item', p_evidence_kind: 'return', p_return_request_id: 'request' })
    expect(f.upload).toHaveBeenCalledWith('buyer/orders/order/return/request/file.png', expect.any(File), { contentType: 'image/png', upsert: false })
    expect(f.remove).not.toHaveBeenCalled()
  })
  it('rejects absent return and wrong upload path before storage mutation', async () => {
    const none = fixture(); await expect(none.repo.upload('order', 'item', 'request', new File(['x'], 'e.png', { type: 'image/png' }))).rejects.toThrow(/open return/)
    const f = fixture(true); f.rpc.mockResolvedValue({ data: { intent_id: 'intent', path_prefix: 'other/orders/order/return/request/file' }, error: null })
    await expect(f.repo.upload('order', 'item', 'request', new File(['x'], 'e.png', { type: 'image/png' }))).rejects.toThrow(/valid return-evidence/)
    expect(f.upload).not.toHaveBeenCalled()
  })
})
