import { requireSupabase } from '../lib/supabase'
import type { ApplicationKind } from '../auth/onboardingRepository'

export type ReviewDecision = 'under_review' | 'approved' | 'rejected' | 'more_information_required' | 'suspended'
export interface AdminApplication {
  id: string; owner_id: string; kind: ApplicationKind; status: string; submitted_at: string | null; reviewed_at: string | null; updated_at: string; review_note: string | null;
  legal_name?: string; storefront_name?: string; business_name?: string; seller_type?: string; identity_name?: string; macro_category?: string; category?: string; specializations?: string[]; professional_title?: string; professional_category?: string;
}
export interface Evidence { label: string; path: string; mime: string }
export interface AdminDetail { application: AdminApplication; fields: Array<[string, string]>; evidence: Evidence[]; verification: Array<[string, string]>; requestedInformation: string | null; reviewedBy: string | null }
const tables = { seller: 'seller_applications', creator: 'creator_applications', professional: 'professional_verification_requests' } as const
const common = 'id,owner_id,status,submitted_at,reviewed_at,updated_at,review_note'
const summaries = { seller: `${common},legal_name,storefront_name,business_name,seller_type`, creator: `${common},identity_name,macro_category,category,specializations`, professional: `${common},professional_title,professional_category` }
const detailFields = { seller: 'registered_state,city,address_line,pickup_address,return_address,gstin,pan_number,document_path,exterior_evidence_path,interior_evidence_path,business_verification_video_path,application_payload', creator: 'creator_type,about,social_handles,identity_document_path,application_payload', professional: 'creator_application_id,degree,institution,graduation_year,registration_number,credential_document_path,supporting_document_path,verification_video_path,social_handles' }
export const statusLabel = (value: string) => value.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
export const applicationName = (item: AdminApplication) => item.kind === 'seller' ? item.storefront_name || item.business_name || 'Seller application' : item.kind === 'creator' ? item.identity_name || 'Creator application' : item.professional_title || 'Professional verification'
export const maskIdentifier = (value: unknown) => typeof value === 'string' && value ? `••••${value.slice(-4)}` : 'Not provided'
export function reviewActions(status: string): Array<{ decision: ReviewDecision; label: string; reason: boolean }> {
  const pending = [{ decision: 'approved' as const, label: 'Approve', reason: false }, { decision: 'more_information_required' as const, label: 'Request more information', reason: true }, { decision: 'rejected' as const, label: 'Reject', reason: true }]
  if (status === 'submitted') return [{ decision: 'under_review', label: 'Start review', reason: false }, ...pending]
  if (status === 'under_review') return pending
  if (status === 'approved') return [{ decision: 'suspended', label: 'Suspend', reason: true }]
  if (status === 'suspended') return [{ decision: 'approved', label: 'Reinstate', reason: false }]
  return []
}
async function assertAdmin() {
  const client = requireSupabase()
  const { data, error } = await client.rpc('get_my_creator_commerce_access')
  if (error) throw error
  if ((Array.isArray(data) ? data[0] : data)?.admin_access !== true) throw new Error('Admin access required.')
  return client
}
export const adminRepository = {
  async list(): Promise<AdminApplication[]> {
    const client = await assertAdmin()
    const groups = await Promise.all((Object.keys(tables) as ApplicationKind[]).map(async kind => {
      const rows: AdminApplication[] = []
      // Fetch every summary page so overview counts are never a truncated page count.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await client.from(tables[kind]).select(summaries[kind]).neq('status', 'draft').order('id').range(offset, offset + 499)
        if (error) throw error
        const page = (data || []) as unknown as Omit<AdminApplication, 'kind'>[]
        rows.push(...page.map(row => ({ ...row, kind })))
        if (page.length < 500) break
      }
      return rows
    }))
    return groups.flat().sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  async detail(kind: ApplicationKind, id: string): Promise<AdminDetail> {
    const client = await assertAdmin()
    const { data, error } = await client.from(tables[kind]).select(`${summaries[kind]},${detailFields[kind]},requested_information,reviewed_by`).eq('id', id).neq('status', 'draft').single()
    if (error) throw error
    const row = data as unknown as Record<string, unknown>
    const payload = (row.application_payload || {}) as Record<string, unknown>
    const fields: Array<[string, string]> = []
    const add = (label: string, value: unknown) => fields.push([label, Array.isArray(value) ? value.join(', ') : typeof value === 'string' || typeof value === 'number' ? String(value) || 'Not provided' : 'Not provided'])
    const evidence: Evidence[] = []
    const asset = (label: string, path: unknown) => { if (typeof path === 'string' && path) evidence.push({ label, path, mime: /\.(mp4|mov|webm)$/i.test(path) ? 'video' : /\.pdf$/i.test(path) ? 'pdf' : /\.(png|jpe?g|webp)$/i.test(path) ? 'image' : 'file' }) }
    if (kind === 'seller') {
      for (const [label, key] of [['Legal identity', 'legal_name'], ['Business', 'business_name'], ['Store', 'storefront_name'], ['Seller type', 'seller_type'], ['Registered state', 'registered_state'], ['City', 'city'], ['Store address', 'address_line'], ['Pickup address', 'pickup_address'], ['Return address', 'return_address']]) add(label, row[key])
      add('GSTIN', maskIdentifier(row.gstin)); add('PAN', maskIdentifier(row.pan_number)); add('Bank account', maskIdentifier(payload.bankAccountNumber));
      asset('Business / identity document', row.document_path); asset('Business exterior', row.exterior_evidence_path); asset('Business interior', row.interior_evidence_path); asset('Business verification video', row.business_verification_video_path)
    } else if (kind === 'creator') {
      for (const [label, key] of [['Identity', 'identity_name'], ['Creator type', 'creator_type'], ['Category', 'macro_category'], ['Specializations', 'specializations'], ['About', 'about']]) add(label, row[key])
      add('PAN', maskIdentifier(payload.panNumber)); add('Bank account', maskIdentifier(payload.bankAccountNumber)); add('Payout UPI', maskIdentifier(payload.payoutUpi)); asset('Identity evidence', row.identity_document_path)
    } else {
      for (const [label, key] of [['Professional title', 'professional_title'], ['Specialization', 'professional_category'], ['Degree', 'degree'], ['Institution', 'institution'], ['Graduation year', 'graduation_year']]) add(label, row[key])
      add('Registration number', maskIdentifier(row.registration_number)); asset('Professional credential', row.credential_document_path); asset('Supporting document', row.supporting_document_path); asset('Professional verification video', row.verification_video_path)
      if (typeof row.creator_application_id === 'string') {
        const linked = await client.from('creator_applications').select('identity_name,identity_document_path,macro_category,specializations,status').eq('id', row.creator_application_id).single()
        if (linked.error) throw linked.error
        add('Applicant identity', linked.data.identity_name); add('Creator category', linked.data.macro_category); add('Creator approval', linked.data.status); add('Creator specializations', linked.data.specializations); asset('Creator identity evidence', linked.data.identity_document_path)
      }
    }
    const social = row.social_handles as Record<string, unknown> | undefined
    if (social) for (const [label, value] of Object.entries(social)) add(`Social · ${label}`, value)
    const verificationResult = await client.from('commerce_verification_profiles').select('identity_status,gst_status,pan_status,bank_status,live_kyc_status,professional_status').eq('user_id', row.owner_id).maybeSingle()
    const verification: Array<[string, string]> = verificationResult.error ? [['Verification state', 'Unavailable — existing permission or service error']] : verificationResult.data ? Object.entries(verificationResult.data).map(([key, value]) => [statusLabel(key.replace('_status', '')), statusLabel(String(value))]) : [['Verification state', 'No verification profile recorded']]
    return { application: { ...row, kind } as unknown as AdminApplication, fields, evidence, verification, requestedInformation: row.requested_information as string | null, reviewedBy: row.reviewed_by ? 'Recorded by an authorized reviewer' : null }
  },
  async evidence(path: string) {
    const client = await assertAdmin()
    const { data, error } = await client.storage.from('creator-commerce-private').createSignedUrl(path, 300)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('Evidence access was not returned. Try again.')
    return data.signedUrl
  },
  async review(application: AdminApplication, decision: ReviewDecision, reason: string) {
    const action = reviewActions(application.status).find(action => action.decision === decision)
    if (!action) throw new Error('This action is unavailable for the current application status.')
    if (action.reason && !reason.trim()) throw new Error('Enter a reason for this decision.')
    const client = await assertAdmin()
    const { data, error } = await client.rpc('review_creator_commerce_application', { target_kind: application.kind, target_id: application.id, target_decision: decision, target_reason: reason.trim() || null })
    if (error) throw error
    if (!data || data.decision !== decision || data.applicationId !== application.id) throw new Error('The review response could not be confirmed. Refresh the application before retrying.')
    return data
  },
}
