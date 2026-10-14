import { applicationSocialLinks, creatorPlatforms, validPan } from './applicationFields'
export type OnboardingData = Record<string, unknown>
export const valueOf = (form: OnboardingData, key: string) => typeof form[key] === 'string' ? form[key] as string : ''
export const selectedSpecializations = (form: OnboardingData) => Array.isArray(form.specializations) ? form.specializations.filter((x): x is string => typeof x === 'string') : []
export function validateOnboardingStep(role: 'seller' | 'creator', step: number, form: OnboardingData, professional: boolean) {
  const missing = (keys: string[]) => keys.some(key => !valueOf(form,key).trim())
  if (role === 'seller') {
    if (step === 1) {
      if (missing(['legalName','businessName','storefrontName','registeredState','city','phone','email',form.sellerType === 'gst' ? 'gstin' : 'panNumber'])) return 'Complete all business and compliance fields.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valueOf(form,'email'))) return 'Enter a valid business email.'
      if (valueOf(form,'panNumber') && !validPan(valueOf(form,'panNumber'))) return 'PAN must contain five letters, four digits and a final letter.'
      if (form.sellerType === 'non_gst' && (missing(['localSellerId']) || form.declarationAccepted !== true)) return 'Enter your enrolment / local Seller ID and confirm the home-state declaration.'
    }
    if (step === 2 && (missing(['addressLine','pickupAddress','returnAddress','postalCode','documentPath','exteriorEvidencePath','interiorEvidencePath']) || typeof form.locationLatitude !== 'number' || typeof form.locationLongitude !== 'number')) return 'Complete all addresses, location and three business evidence uploads.'
    if (step === 3 && missing(['bankAccountHolder','bankAccountNumber','bankIfsc'])) return 'Complete the bank details for manual review.'
    if (step === 4 && missing(['businessVerificationVideoPath'])) return 'Upload the required Business Verification video.'
    if (step === 4) { try { applicationSocialLinks(form, role) } catch (error) { return (error as Error).message } }
  } else {
    if (step === 0 && (missing(['macroCategory']) || selectedSpecializations(form).length < 1 || selectedSpecializations(form).length > 3)) return 'Choose a category and one to three specializations.'
    if (step === 1) {
      try {
        const links = applicationSocialLinks(form, role)
        if (!Object.values(links).some(Boolean)) return 'Add at least one social profile or website.'
        if (Array.isArray(form.selectedPlatforms) && creatorPlatforms.some(key => form.selectedPlatforms instanceof Array && form.selectedPlatforms.includes(key) && !links[key])) return 'Add the actual profile URL for each selected platform.'
      } catch (error) { return (error as Error).message }
    }
    if (step === 2 && (missing(['identityName','panNumber','identityDocumentPath']) || (!valueOf(form,'payoutUpi').trim() && missing(['bankAccountHolder','bankAccountNumber','bankIfsc'])))) return 'Complete identity, upload evidence and provide either UPI or all bank details.'
    if (step === 2 && !validPan(valueOf(form,'panNumber'))) return 'PAN must contain five letters, four digits and a final letter.'
    if (step === 3 && professional && missing(['professionalTitle','degree','institution','registrationNumber','credentialDocumentPath','verificationVideoPath'])) return 'Complete professional credentials and upload the credential document and verification video.'
  }
  return null
}
