import type { SupabaseClient } from '@supabase/supabase-js'
import { getCreatorCommerceAccess, getMyCreatorApplication, getMyProfessionalRequest, uploadCommerceEvidence, type ProfessionalVerificationRequest } from '../../auth/onboardingRepository'

export interface ProfessionalPolicy { macro_category: string; specialization: string; requires_professional_verification: boolean; required_credential_types: string[]; requires_verification_video: boolean; verification_instructions: string }
export interface ProfessionalEdit { professionalTitle: string; degree: string; institution: string; registrationNumber: string; credentialDocumentPath: string; verificationVideoPath: string }
export const professionalEditable = (status: string) => ['draft', 'rejected', 'more_information_required'].includes(status)
export function professionalValidation(edit: ProfessionalEdit) {
  if (![edit.professionalTitle, edit.degree, edit.institution, edit.registrationNumber].every((value) => value.trim())) return 'Complete your professional title, qualification, institution and registration number.'
  if (!edit.credentialDocumentPath || !edit.verificationVideoPath) return 'A credential document and verification video are required by the existing verification policy.'
  return null
}
export async function loadProfessional(client: SupabaseClient, userId: string) {
  const { data: auth, error } = await client.auth.getUser()
  if (error || auth.user?.id !== userId) throw new Error('Your account session changed. Sign in again.')
  const [creator, request, access] = await Promise.all([getMyCreatorApplication(client, userId), getMyProfessionalRequest(client, userId), getCreatorCommerceAccess(client)])
  if (access?.creatorStatus !== 'approved' || access.userId !== userId || creator?.status !== 'approved') throw new Error('This page requires an approved Creator application.')
  const policies = await client.from('creator_specialization_policies').select('macro_category,specialization,requires_professional_verification,required_credential_types,requires_verification_video,verification_instructions').eq('macro_category', creator.macroCategory).in('specialization', creator.specializations).eq('requires_professional_verification', true)
  if (policies.error) throw policies.error
  const policy = (policies.data as ProfessionalPolicy[]).find((row) => row.specialization === request?.professionalCategory) ?? null
  return { creator, request, policy }
}
export async function assertProfessionalEditable(client: SupabaseClient, userId: string, snapshot: ProfessionalVerificationRequest) {
  const current = await loadProfessional(client, userId)
  if (!current.request || current.request.id !== snapshot.id || current.request.updatedAt !== snapshot.updatedAt) throw new Error('This request changed. Refresh before editing or submitting it.')
  if (!professionalEditable(current.request.status)) throw new Error('This verification is locked for review. Refresh to see its current status.')
  if (!current.policy || !current.policy.requires_verification_video || current.request.creatorApplicationId !== current.creator.id) throw new Error('The existing professional policy or Creator link needs Admin review. No changes were submitted.')
  return current.request
}
export async function submitProfessionalCorrection(client: SupabaseClient, userId: string, snapshot: ProfessionalVerificationRequest, edit: ProfessionalEdit) {
  const validation = professionalValidation(edit)
  if (validation) throw new Error(validation)
  await assertProfessionalEditable(client, userId, snapshot)
  // Update only this professional request. Never resubmit the approved Creator
  // application or write access/approval columns. The RLS + validation trigger
  // enforce ownership, evidence linkage and permitted transition atomically.
  const { data, error } = await client.from('professional_verification_requests').update({ professional_title: edit.professionalTitle.trim(), degree: edit.degree.trim(), institution: edit.institution.trim(), registration_number: edit.registrationNumber.trim(), credential_document_path: edit.credentialDocumentPath, verification_video_path: edit.verificationVideoPath, status: 'submitted', requested_information: null, submitted_at: new Date().toISOString() }).eq('id', snapshot.id).eq('owner_id', userId).eq('updated_at', snapshot.updatedAt).in('status', ['draft', 'rejected', 'more_information_required']).select('id,status').maybeSingle()
  if (error) throw error
  if (!data || data.status !== 'submitted') throw new Error('The request changed or could not be submitted. Refresh and review its latest status.')
  return data
}
export async function uploadProfessionalEvidence(client: SupabaseClient, userId: string, snapshot: ProfessionalVerificationRequest, kind: 'credential-document' | 'verification-video', file: File) {
  await assertProfessionalEditable(client, userId, snapshot)
  const uri = URL.createObjectURL(file)
  try { return await uploadCommerceEvidence(client, userId, 'professional', kind, { uri, fileName: file.name, mimeType: file.type, fileSize: file.size }) }
  finally { URL.revokeObjectURL(uri) }
}
export async function professionalEvidenceUrl(client: SupabaseClient, userId: string, path: string) {
  const context = await loadProfessional(client, userId)
  if (!path || !context.request || ![context.request.credentialDocumentPath, context.request.supportingDocumentPath, context.request.verificationVideoPath].includes(path)) throw new Error('This evidence is not linked to your request.')
  const { data, error } = await client.storage.from('creator-commerce-private').createSignedUrl(path, 60)
  if (error) throw error
  return { url: data.signedUrl, expires: Date.now() + 60_000 }
}
