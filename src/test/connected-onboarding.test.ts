import { describe, expect, it } from 'vitest'
import { normalizePhone, safeNext } from '../auth/routing'
import { creatorRequiresProfessionalVerification, creatorSpecializationsFor, selectCreatorSpecialization } from '../auth/onboardingRules'
import { validateOnboardingStep } from '../auth/onboardingValidation'
import { validateCommerceEvidence } from '../auth/onboardingRepository'

describe('existing account routing', () => {
  it('rejects external and auth-loop redirect targets', () => {
    for (const path of ['https://example.com','//example.com','/\\example.com','/login','/partner/login?next=/','/web/register']) expect(safeNext(path)).toBe('/partner')
    expect(safeNext('/account/chat/conversation?from=list')).toBe('/account/chat/conversation?from=list')
  })
  it('preserves mobile phone normalization', () => {
    expect(normalizePhone('98765 43210')).toBe('+919876543210')
    expect(normalizePhone('+44 7700 900123')).toBe('+447700900123')
  })
})
describe('canonical onboarding gates', () => {
  it('requires professional verification only for regulated specializations', () => {
    expect(creatorRequiresProfessionalVerification(['Doctor'])).toBe(true)
    expect(creatorRequiresProfessionalVerification(['Fitness','Content Creator'])).toBe(false)
    expect(creatorSpecializationsFor('Content & Digital Media')).toContain('Travel Vlogger')
    expect(selectCreatorSpecialization(['Fashion','Beauty','Makeup Artist'],'Model')).toHaveLength(3)
  })
  it('does not accept unuploaded seller evidence or a missing location', () => {
    expect(validateOnboardingStep('seller',2,{addressLine:'A',pickupAddress:'B',returnAddress:'C',postalCode:'400001'},false)).toBeTruthy()
    expect(validateOnboardingStep('seller',4,{},false)).toBeTruthy()
  })
  it('allows creator UPI without inventing mandatory bank fields', () => {
    const data={identityName:'QA Applicant',panNumber:'TESTP1234A',identityDocumentPath:'owner/creator/identity-document/file.pdf',payoutUpi:'qa@example'}
    expect(validateOnboardingStep('creator',2,data,false)).toBeNull()
    expect(validateOnboardingStep('creator',2,{...data,payoutUpi:''},false)).toBeTruthy()
  })
  it('rejects fake video evidence and oversized or unsupported files', () => {
    expect(()=>validateCommerceEvidence('verification-video','image/png',100)).toThrow()
    expect(()=>validateCommerceEvidence('business-document','text/html',100)).toThrow()
    expect(()=>validateCommerceEvidence('business-document','application/pdf',16*1024*1024)).toThrow()
    expect(()=>validateCommerceEvidence('verification-video','video/mp4',100)).not.toThrow()
  })
})
