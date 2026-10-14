export { applicationName, reviewActions, safeApplicationLink, statusLabel, assertAdmin } from '../src/repositories/admin.ts'
const kind = new URLSearchParams(window.location.search).get('kind') === 'creator' ? 'creator' : 'seller'
const application = { id: 'synthetic', owner_id: 'synthetic-preview', kind, status: 'submitted', identity_name: 'Synthetic Applicant — NOT a real application', storefront_name: 'Synthetic Preview — NOT a real application', legal_name: 'Synthetic Applicant', seller_type: 'non_gst', updated_at: '2026-10-14T12:00:00Z', submitted_at: '2026-10-14T12:00:00Z' }
export const adminRepository = {
  list: async () => [application],
  detail: async () => ({ application, fields: [['Applicant', 'Synthetic Preview'], ['Social · LinkedIn', 'https://www.linkedin.com/'+(kind==='seller'?'company':'in')+'/synthetic-preview'], ['Social · Instagram', 'https://instagram.com/synthetic_preview'], ['Social · Facebook', 'https://facebook.com/synthetic_preview'], ...(kind==='seller'?[['Social · Business website', 'https://example.com/'], ['Social · Google Maps business link', 'https://maps.app.goo.gl/synthetic']]:[['Social · TikTok', 'https://www.tiktok.com/@synthetic_preview']])], evidence: [], verification: [['Identity', 'Manual review'], ['PAN', 'Manual review']], requestedInformation: null, reviewedBy: null }),
  review: async () => { throw new Error('Review mutations are disabled in isolated QA.') },
  evidence: async () => { throw new Error('Real evidence is unavailable in isolated QA.') },
}
