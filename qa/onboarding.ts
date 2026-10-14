// Memory-only adapters. No account, evidence, application or bank data leaves
// this preview. Reopening the page resets all synthetic state.
const params = new URLSearchParams(window.location.search)
let draft = { currentStep: Number(params.get('step') || 0), sellerType: 'non_gst', audienceTier: 'Mid', macroCategory: 'Content & Digital Media', specializations: ['Content Creator'], selectedPlatforms: ['linkedin', 'instagram', 'facebook', 'tiktok'], linkedin: params.get('view') === 'seller' ? 'https://www.linkedin.com/company/synthetic-preview' : 'https://www.linkedin.com/in/synthetic-preview', instagram: 'https://instagram.com/synthetic_preview', facebook: 'https://facebook.com/synthetic_preview', tiktok: 'https://www.tiktok.com/@synthetic_preview', googleMaps: 'https://maps.app.goo.gl/synthetic', youtube: 'https://youtube.com/@synthetic_preview', website: 'https://example.com/', businessName: 'Synthetic Demo', storefrontName: 'Synthetic Preview', identityName: 'Synthetic Applicant' }
export const getMySellerApplication = async () => ({ status: 'draft', applicationPayload: draft })
export const getMyCreatorApplication = getMySellerApplication
export const getMyProfessionalRequest = async () => null
export const saveCommerceOnboardingDraft = async (_client: unknown, _role: unknown, payload: typeof draft) => { draft = payload; return {} }
export const submitSellerApplication = async () => { throw new Error('Submission is disabled in isolated QA.') }
export const submitCreatorApplication = submitSellerApplication
export const submitProfessionalVerification = submitSellerApplication
export const uploadCommerceEvidence = async () => { throw new Error('Upload is disabled in isolated QA.') }
export const validateCommerceEvidence = () => {}
