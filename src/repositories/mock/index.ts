import type { PartnerRole, PartnerSession, Promotion } from '../../domain/models'
import { applicationFor, creatorOverview, orders, products, promotions, returns, sellerOverview, settlements, team } from '../../fixtures'
import type { RepositoryRegistry } from '../contracts'

const wait = async <T>(value: T, delay = 120) => {
  await new Promise((resolve) => setTimeout(resolve, delay))
  return structuredClone(value)
}

const storage = {
  get(key: string) { return typeof window === 'undefined' ? null : window.localStorage.getItem(key) },
  set(key: string, value: unknown) { if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value)) },
}

const sessionFor = (role: PartnerRole, approved = false): PartnerSession => ({
  id: role === 'seller' ? 'partner-seller-001' : 'partner-creator-001',
  name: role === 'seller' ? 'Arjun Rao' : 'Maya Kapoor',
  phone: '+91 98765 43210',
  role,
  applicationStatus: approved ? 'approved' : 'draft',
})

const onboardingRepository = (role: PartnerRole) => ({
  async save(step: number, data: Record<string, string>) {
    storage.set(`social24:${role}:step:${step}`, data)
  },
  async submit() {
    const record = applicationFor(role)
    storage.set(`social24:${role}:application`, record)
    return wait(record)
  },
})

export const repositories: RepositoryRegistry = {
  auth: {
    async requestOtp(phone) {
      if (!/^\+?[0-9\s-]{10,16}$/.test(phone)) throw new Error('Enter a valid phone number.')
      storage.set('social24:otp-phone', phone)
      return wait({ challengeId: 'mock-challenge-local-only' })
    },
    async verifyOtp(_challengeId, otp) {
      if (otp !== '246810') throw new Error('For this local mock, use 246810.')
      const session = sessionFor('seller')
      storage.set('social24:session', session)
      return wait(session)
    },
    async currentSession() {
      const value = storage.get('social24:session')
      return wait(value ? JSON.parse(value) as PartnerSession : null)
    },
  },
  partnerProfile: { async get(role) { return wait(sessionFor(role)) } },
  sellerOnboarding: onboardingRepository('seller'),
  creatorOnboarding: onboardingRepository('creator'),
  applications: {
    async get(role) {
      const value = storage.get(`social24:${role}:application`)
      return wait(value ? JSON.parse(value) : applicationFor(role))
    },
    async useApprovedFixture(role) {
      const session = sessionFor(role, true)
      storage.set('social24:session', session)
      return wait(session)
    },
  },
  sellerCatalog: { async list() { return wait(products) } },
  sellerOrders: { async list() { return wait(orders) } },
  sellerReturns: { async list() { return wait(returns) } },
  sellerFinance: { async listSettlements() { return wait(settlements) } },
  sellerTeam: { async listMembers() { return wait(team) } },
  creatorDiscovery: { async listEligibleProducts() { return wait(products.filter((product) => product.creatorPromotionEnabled)) } },
  creatorPromotions: {
    async list() { return wait(promotions) },
    async create(productId) {
      const product = products.find((item) => item.id === productId)
      if (!product) throw new Error('Product not found.')
      const promotion: Promotion = { id: `PROMO-${Date.now()}`, productTitle: product.title, seller: product.seller, trackingCode: `S24-${product.sku}`, clicks: 0, orders: 0, attributedMinor: 0, commissionMinor: 0, status: 'Active' }
      return wait(promotion)
    },
  },
  creatorEarnings: { async list() { return wait(promotions) } },
  analytics: { async sellerOverview() { return wait(sellerOverview) }, async creatorOverview() { return wait(creatorOverview) } },
}
