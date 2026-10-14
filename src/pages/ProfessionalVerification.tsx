import { useCallback, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { credentialRuleFor } from '../auth/onboardingRules'
import { WorkspaceShell } from '../components/WorkspaceShell'
import { CommerceEmpty, CommerceNote, CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, PageHeader, SectionCard, StatusPill } from '../components/Ui'
import { requireSupabase } from '../lib/supabase'
import { dateTime, label } from '../repositories/commerce'
import { loadProfessional, professionalEditable, professionalEvidenceUrl, professionalValidation, submitProfessionalCorrection, uploadProfessionalEvidence, type ProfessionalEdit } from '../features/creatorSprint/professional'
import '../features/creatorSprint/creator.css'

const errorText = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to complete this action. Please try again.'
export function ProfessionalVerification() {
  const { user, access } = useAuth()
  if (!user || access?.creator_status !== 'approved') return <CommerceEmpty title="Creator approval required" description="Open your Creator application to review its current status." />
  return <WorkspaceShell role="creator"><ProfessionalPage key={user.id} userId={user.id} /></WorkspaceShell>
}
function ProfessionalPage({ userId }: { userId: string }) {
  const load = useCallback(() => loadProfessional(requireSupabase(), userId), [userId])
  const result = useCommerce(load)
  return <><PageHeader eyebrow="Independent professional review" title="Professional verification" description="Review your professional credentials without resubmitting your approved Creator application." actions={<Button variant="secondary" to="/partner/creator/profile">Back to profile</Button>} /><CommerceResult result={result}>{(context) => <ProfessionalDetails key={context.request?.updatedAt ?? 'none'} userId={userId} context={context} refresh={result.refresh} />}</CommerceResult></>
}
function ProfessionalDetails({ userId, context, refresh }: { userId: string; context: Awaited<ReturnType<typeof loadProfessional>>; refresh: () => void }) {
  const { request, policy } = context
  const [edit, setEdit] = useState<ProfessionalEdit>({ professionalTitle: request?.professionalTitle ?? '', degree: request?.degree ?? '', institution: request?.institution ?? '', registrationNumber: request?.registrationNumber ?? '', credentialDocumentPath: request?.credentialDocumentPath ?? '', verificationVideoPath: request?.verificationVideoPath ?? '' })
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [preview, setPreview] = useState<{ url: string; expires: number } | null>(null)
  const editable = Boolean(request && policy && professionalEditable(request.status))
  const rule = credentialRuleFor([request?.professionalCategory ?? ''])
  async function upload(kind: 'credential-document' | 'verification-video', file: File) {
    if (!request) return
    setBusy(kind); setError(''); setMessage(''); setConfirm(false)
    try { const path = await uploadProfessionalEvidence(requireSupabase(), userId, request, kind, file); setEdit((old) => ({ ...old, [kind === 'credential-document' ? 'credentialDocumentPath' : 'verificationVideoPath']: path })); setMessage('Evidence uploaded privately. Submit your correction to link it to this review.') }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy('') }
  }
  async function submit() {
    if (!request) return
    setBusy('submit'); setError('')
    try { await submitProfessionalCorrection(requireSupabase(), userId, request, edit); refresh() }
    catch (cause) { setError(errorText(cause)); setConfirm(false) }
    finally { setBusy('') }
  }
  async function view(path: string) {
    setBusy('view'); setError(''); setPreview(null)
    try { setPreview(await professionalEvidenceUrl(requireSupabase(), userId, path)) }
    catch (cause) { setError(errorText(cause)) }
    finally { setBusy('') }
  }
  if (!request) return <><CommerceEmpty title="No professional request on this account" description="General Creator approval does not imply professional verification. This correction workspace only updates an existing request; it does not change your category or grant credentials." /><Button variant="secondary" onClick={refresh}>Refresh status</Button></>
  return <div className="creator-professional-stack"><SectionCard title={request.professionalCategory || 'Professional review'} action={<StatusPill>{label(request.status)}</StatusPill>}><p>{request.status === 'approved' ? 'Your professional verification is approved. This record is read-only; the current review workflow does not support reopening approved credentials for corrections.' : ['submitted', 'under_review'].includes(request.status) ? 'Your professional request is with the review team. It is read-only while the review is in progress.' : request.status === 'suspended' ? 'Professional access is suspended. Review the Admin feedback; this status cannot be changed by the applicant.' : 'Update the requested information, then submit this professional request for review.'}</p><p>Creator application: <strong>Approved</strong>. This flow does not resubmit or change Seller or Creator approval.</p>{request.requestedInformation && <div className="creator-review-feedback"><strong>Information requested</strong><p>{request.requestedInformation}</p></div>}{request.reviewNote && <div className="creator-review-feedback"><strong>Review feedback</strong><p>{request.reviewNote}</p></div>}<p className="commerce-muted">Updated {dateTime(request.updatedAt)}</p><Button variant="secondary" disabled={Boolean(busy)} onClick={refresh}>Refresh status</Button></SectionCard>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="commerce-success" role="status">{message}</p>}
    {!policy && <CommerceNote>The professional category could not be matched to the current approved Creator policy. Changes are unavailable until Admin reviews this linkage.</CommerceNote>}
    {editable ? <SectionCard title="Correct professional details" description="Existing qualification requirements apply. Your changes stay in this page until you submit; uploaded files are stored privately."><form className="creator-correction-form" onSubmit={(event) => { event.preventDefault(); const validation = professionalValidation(edit); setError(validation ?? ''); if (!validation) setConfirm(true) }}><fieldset disabled={Boolean(busy) || confirm}>
      {([['professionalTitle', 'Professional title'], ['degree', 'Qualification / degree'], ['institution', rule?.institutionLabel || 'Qualification institution'], ['registrationNumber', rule?.registrationLabel || 'Registration or licence number']] as const).map(([key, title]) => <label key={key}>{title}<input required maxLength={250} value={edit[key]} onChange={(event) => setEdit({ ...edit, [key]: event.target.value })} /></label>)}
      <p>{policy?.verification_instructions}</p>
      {(['credential-document', 'verification-video'] as const).map((kind) => { const value = kind === 'credential-document' ? edit.credentialDocumentPath : edit.verificationVideoPath; return <label key={kind}>{kind === 'credential-document' ? rule?.credentialLabel || 'Credential document' : 'Professional verification video'}<input type="file" accept={kind === 'credential-document' ? 'image/jpeg,image/png,image/webp,application/pdf' : 'video/mp4,video/webm,video/quicktime'} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(kind, file); event.target.value = '' }} /><small>{busy === kind ? 'Uploading…' : value ? 'Evidence available. Upload a replacement only if needed.' : 'Required. Maximum 15 MB.'}</small></label> })}
      <Button type="submit">Review correction</Button></fieldset></form>{confirm && <div className="creator-review-feedback" role="region" aria-label="Confirm professional correction"><h3>Submit for professional review?</h3><p>Your corrected credentials will return to Submitted. Professional approval is decided by Admin. Your general Creator approval stays unchanged.</p><div className="commerce-row-actions"><Button disabled={Boolean(busy)} onClick={() => void submit()}>{busy === 'submit' ? 'Submitting…' : 'Submit professional correction'}</Button><Button variant="secondary" disabled={Boolean(busy)} onClick={() => setConfirm(false)}>Back to edit</Button></div></div>}</SectionCard> : <SectionCard title="Submitted professional details"><dl className="commerce-definition" data-private><div><dt>Professional title</dt><dd>{request.professionalTitle || 'Not provided'}</dd></div><div><dt>Qualification</dt><dd>{request.degree || 'Not provided'}</dd></div><div><dt>Institution</dt><dd>{request.institution || 'Not provided'}</dd></div><div><dt>Registration</dt><dd>{request.registrationNumber ? `Ending ${request.registrationNumber.slice(-4)}` : 'Not provided'}</dd></div></dl></SectionCard>}
    <SectionCard title="Evidence linked to this request" description="Private evidence links expire after one minute. Reopen here for a fresh link."><div className="commerce-row-actions">{([['Credential document', request.credentialDocumentPath], ['Supporting document', request.supportingDocumentPath], ['Verification video', request.verificationVideoPath]] as const).filter(([, path]) => path).map(([title, path]) => <Button key={title} variant="secondary" disabled={Boolean(busy)} onClick={() => void view(path!)}>{title}</Button>)}</div>{preview && <p><a href={preview.url} target="_blank" rel="noopener noreferrer" onClick={(event) => { if (Date.now() >= preview.expires) { event.preventDefault(); setPreview(null); setError('This evidence link expired. Choose the evidence again.') } }}>Open private evidence in a new tab</a></p>}</SectionCard></div>
}
