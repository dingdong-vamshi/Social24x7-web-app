import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getCreatorCommerceAccess, getMyCreatorApplication, getMyProfessionalRequest, type ProfessionalVerificationRequest } from '../../auth/onboardingRepository'
import { assertProfessionalEditable, professionalEditable, professionalValidation, submitProfessionalCorrection } from './professional'
import { canPromoteProduct, creatorMediaUrl, loadCreatorProduct, type DetailMedia } from './product'

vi.mock('../../auth/onboardingRepository', () => ({ getCreatorCommerceAccess: vi.fn(), getMyCreatorApplication: vi.fn(), getMyProfessionalRequest: vi.fn(), uploadCommerceEvidence: vi.fn() }))
const request = { id: 'request-1', ownerId: 'owner-1', creatorApplicationId: 'creator-1', professionalCategory: 'Doctor', status: 'more_information_required', updatedAt: '2026-10-14T00:00:00Z' } as ProfessionalVerificationRequest
const edit = { professionalTitle: 'Doctor', degree: 'MBBS', institution: 'QA institution', registrationNumber: 'QA-1234', credentialDocumentPath: 'owner-1/professional/credential.pdf', verificationVideoPath: 'owner-1/professional/video.mp4' }
function clientFixture() {
  const write = { id: request.id, status: 'submitted' }
  const query = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), update: vi.fn(), maybeSingle: vi.fn(async () => ({ data: write, error: null })), then: (resolve: (value: unknown) => void) => resolve({ data: [{ macro_category: 'Health & Wellness', specialization: 'Doctor', requires_professional_verification: true, requires_verification_video: true }], error: null }) }
  for (const method of ['select', 'eq', 'in', 'update'] as const) query[method].mockReturnValue(query)
  const client = { auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'owner-1' } }, error: null })) }, from: vi.fn((table: string) => { void table; return query }) }
  return { client: client as unknown as SupabaseClient, query, from: client.from }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getCreatorCommerceAccess).mockResolvedValue({ userId: 'owner-1', creatorStatus: 'approved', sellerStatus: 'approved', professionalStatus: 'more_information_required', buyerKycStatus: 'verified', adminAccess: false })
  vi.mocked(getMyCreatorApplication).mockResolvedValue({ id: 'creator-1', ownerId: 'owner-1', status: 'approved', macroCategory: 'Health & Wellness', specializations: ['Doctor'] } as Awaited<ReturnType<typeof getMyCreatorApplication>>)
  vi.mocked(getMyProfessionalRequest).mockResolvedValue(request)
})
describe('independent professional corrections', () => {
  it.each(['draft', 'rejected', 'more_information_required'])('allows only editable status %s', (status) => expect(professionalEditable(status)).toBe(true))
  it.each(['approved', 'submitted', 'under_review', 'suspended', 'unknown'])('blocks owner writes from %s', async (status) => {
    vi.mocked(getMyProfessionalRequest).mockResolvedValue({ ...request, status: status as ProfessionalVerificationRequest['status'] })
    const { client, query } = clientFixture()
    await expect(submitProfessionalCorrection(client, 'owner-1', request, edit)).rejects.toThrow('locked')
    expect(query.update).not.toHaveBeenCalled()
  })
  it('updates only professional fields with owner/status/version guards; never Creator or access', async () => {
    const { client, query, from } = clientFixture()
    await submitProfessionalCorrection(client, 'owner-1', request, edit)
    expect(from.mock.calls.map(([table]) => table)).toEqual(['creator_specialization_policies', 'professional_verification_requests'])
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'submitted', professional_title: 'Doctor' }))
    expect(query.eq).toHaveBeenCalledWith('owner_id', 'owner-1')
    expect(query.eq).toHaveBeenCalledWith('updated_at', request.updatedAt)
    expect(query.in).toHaveBeenCalledWith('status', ['draft', 'rejected', 'more_information_required'])
    const payload = query.update.mock.calls[0][0]
    expect(payload).not.toHaveProperty('creator_status'); expect(payload).not.toHaveProperty('review_note'); expect(payload).not.toHaveProperty('creator_application_id')
  })
  it('rejects changed server snapshots', async () => {
    const { client, query } = clientFixture()
    vi.mocked(getMyProfessionalRequest).mockResolvedValue({ ...request, updatedAt: 'changed' })
    await expect(assertProfessionalEditable(client, 'owner-1', request)).rejects.toThrow('changed')
    expect(query.update).not.toHaveBeenCalled()
  })
  it('rejects a no-row stale update rather than displaying success', async () => {
    const { client, query } = clientFixture()
    query.maybeSingle.mockResolvedValue({ data: null as unknown as { id: string; status: string }, error: null })
    await expect(submitProfessionalCorrection(client, 'owner-1', request, edit)).rejects.toThrow('could not be submitted')
  })
  it('rejects another session before reading applicant information', async () => {
    const { client, from } = clientFixture()
    await expect(assertProfessionalEditable(client, 'other-user', request)).rejects.toThrow('session changed')
    expect(from).not.toHaveBeenCalled()
  })
  it('requires actual existing evidence and all backend-required text', () => {
    expect(professionalValidation(edit)).toBeNull()
    expect(professionalValidation({ ...edit, degree: ' ' })).toContain('Complete')
    expect(professionalValidation({ ...edit, verificationVideoPath: '' })).toContain('video')
  })
})
describe('Creator product detail', () => {
  it('uses existing product eligibility, never allowing inactive/out-of-stock promotions', () => {
    const product = { status: 'active', product_approval_status: 'approved', creator_promotion_enabled: true, inventory: 2 }
    expect(canPromoteProduct(product)).toBe(true)
    expect(canPromoteProduct({ ...product, inventory: 0 })).toBe(false)
    expect(canPromoteProduct({ ...product, product_approval_status: 'submitted' })).toBe(false)
  })
  it('rejects malformed deep links without querying', async () => {
    const { client, from } = clientFixture()
    await expect(loadCreatorProduct(client, '../private', 'owner-1')).rejects.toThrow('invalid')
    expect(from).not.toHaveBeenCalled()
  })
  it('never creates public URLs for private product media or unknown buckets', async () => {
    const signed = vi.fn(async () => ({ data: { signedUrl: 'https://signed.example' }, error: null }))
    const publicUrl = vi.fn()
    const from = vi.fn(() => ({ createSignedUrl: signed, getPublicUrl: publicUrl }))
    const client = { storage: { from } } as unknown as SupabaseClient
    await expect(creatorMediaUrl(client, { path: 'product/photo.jpg', storage_bucket: 'product-media' } as DetailMedia)).resolves.toBe('https://signed.example')
    expect(publicUrl).not.toHaveBeenCalled()
    await expect(creatorMediaUrl(client, { path: 'private', storage_bucket: 'creator-commerce-private' } as DetailMedia)).rejects.toThrow('unavailable')
    expect(from).toHaveBeenCalledTimes(1)
  })
})
