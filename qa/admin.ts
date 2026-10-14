export { applicationName, reviewActions, safeApplicationLink, statusLabel, assertAdmin } from '../src/repositories/admin.ts'
const application = { id: 'synthetic', owner_id: 'synthetic-preview', kind: 'seller', status: 'submitted', storefront_name: 'Synthetic Preview — NOT a real application', legal_name: 'Synthetic Applicant', seller_type: 'non_gst', updated_at: '2026-10-14T12:00:00Z', submitted_at: '2026-10-14T12:00:00Z' }
export const adminRepository = {
  list: async () => [application],
  detail: async () => ({ application, fields: [['Business', 'Synthetic Preview'], ['Social · Business website', 'https://example.com/'], ['Social · Instagram', 'https://instagram.com/synthetic_preview'], ['Social · Facebook', 'https://facebook.com/synthetic_preview'], ['Social · Google Maps business link', 'https://maps.app.goo.gl/synthetic']], evidence: [], verification: [['Identity', 'Manual review'], ['PAN', 'Manual review']], requestedInformation: null, reviewedBy: null }),
  review: async () => { throw new Error('Review mutations are disabled in isolated QA.') },
  evidence: async () => { throw new Error('Real evidence is unavailable in isolated QA.') },
}
