import type { ApplicationRecord, CreatorOverview, Order, PartnerRole, PartnerSession, Product, Promotion, ReturnRequest, SellerOverview, Settlement, TeamMember } from '../domain/models'

export interface AuthRepository {
  requestOtp(phone: string): Promise<{ challengeId: string }>
  verifyOtp(challengeId: string, otp: string): Promise<PartnerSession>
  currentSession(): Promise<PartnerSession | null>
}

export interface PartnerProfileRepository { get(role: PartnerRole): Promise<PartnerSession> }
export interface SellerOnboardingRepository { save(step: number, data: Record<string, string>): Promise<void>; submit(): Promise<ApplicationRecord> }
export interface CreatorOnboardingRepository { save(step: number, data: Record<string, string>): Promise<void>; submit(): Promise<ApplicationRecord> }
export interface ApplicationRepository { get(role: PartnerRole): Promise<ApplicationRecord>; useApprovedFixture(role: PartnerRole): Promise<PartnerSession> }
export interface SellerCatalogRepository { list(): Promise<Product[]> }
export interface SellerOrdersRepository { list(): Promise<Order[]> }
export interface SellerReturnsRepository { list(): Promise<ReturnRequest[]> }
export interface SellerFinanceRepository { listSettlements(): Promise<Settlement[]> }
export interface SellerTeamRepository { listMembers(): Promise<TeamMember[]> }
export interface CreatorDiscoveryRepository { listEligibleProducts(): Promise<Product[]> }
export interface CreatorPromotionRepository { list(): Promise<Promotion[]>; create(productId: string): Promise<Promotion> }
export interface CreatorEarningsRepository { list(): Promise<Promotion[]> }
export interface AnalyticsRepository { sellerOverview(): Promise<SellerOverview>; creatorOverview(): Promise<CreatorOverview> }

export interface RepositoryRegistry {
  auth: AuthRepository
  partnerProfile: PartnerProfileRepository
  sellerOnboarding: SellerOnboardingRepository
  creatorOnboarding: CreatorOnboardingRepository
  applications: ApplicationRepository
  sellerCatalog: SellerCatalogRepository
  sellerOrders: SellerOrdersRepository
  sellerReturns: SellerReturnsRepository
  sellerFinance: SellerFinanceRepository
  sellerTeam: SellerTeamRepository
  creatorDiscovery: CreatorDiscoveryRepository
  creatorPromotions: CreatorPromotionRepository
  creatorEarnings: CreatorEarningsRepository
  analytics: AnalyticsRepository
}
