export type OnboardingData = Record<string, unknown>
export const valueOf = (form: OnboardingData, key: string) => typeof form[key] === 'string' ? form[key] as string : ''
export const selectedSpecializations = (form: OnboardingData) => Array.isArray(form.specializations) ? form.specializations.filter((x): x is string => typeof x === 'string') : []
export function validateOnboardingStep(role: 'seller' | 'creator', step: number, form: OnboardingData, professional: boolean) {
  const missing = (keys: string[]) => keys.some(key => !valueOf(form,key).trim())
  if (role === 'seller') {
    if (step === 1) {
      if (missing(['legalName','businessName','storefrontName','registeredState','city','phone','email',form.sellerType === 'gst' ? 'gstin' : 'panNumber'])) return 'Complete all business and compliance fields.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueOf(form,'email'))) return 'Enter a valid business email.'
      if (form.sellerType === 'non_gst' && (missing(['localSellerId']) || form.declarationAccepted !== true)) return 'Enter your enrolment / local Seller ID and confirm the home-state declaration.'
    }
    if (step === 2 && (missing(['addressLine','pickupAddress','returnAddress','postalCode','documentPath','exteriorEvidencePath','interiorEvidencePath']) || typeof form.locationLatitude !== 'number' || typeof form.locationLongitude !== 'number')) return 'Complete all addresses, location and three business evidence uploads.'
    if (step === 3 && missing(['bankAccountHolder','bankAccountNumber','bankIfsc'])) return 'Complete the bank details for manual review.'
    if (step === 4 && missing(['businessVerificationVideoPath'])) return 'Upload the required Business Verification video.'
  } else {
    if (step === 0 && (missing(['macroCategory']) || selectedSpecializations(form).length < 1 || selectedSpecializations(form).length > 3)) return 'Choose a category and one to three specializations.'
    if (step === 1 && !['instagram','youtube','facebook','tiktok','website'].some(key => valueOf(form,key).trim())) return 'Add at least one social profile or website.'
    if (step === 2 && (missing(['identityName','panNumber','identityDocumentPath']) || (!valueOf(form,'payoutUpi').trim() && missing(['bankAccountHolder','bankAccountNumber','bankIfsc'])))) return 'Complete identity, upload evidence and provide either UPI or all bank details.'
    if (step === 3 && professional && missing(['professionalTitle','degree','institution','registrationNumber','credentialDocumentPath','verificationVideoPath'])) return 'Complete professional credentials and upload the credential document and verification video.'
  }
  return null
}
