export type PartnerRole = 'seller' | 'creator'
export type ApplicationStatus = 'draft' | 'submitted' | 'under_review' | 'more_information_required' | 'approved' | 'rejected'
export type AsyncState = 'loading' | 'empty' | 'success' | 'error'

export interface PartnerSession {
  id: string
  name: string
  phone: string
  role: PartnerRole
  applicationStatus: ApplicationStatus
}

export interface ApplicationRecord {
  id: string
  role: PartnerRole
  status: ApplicationStatus
  submittedAt?: string
  reviewNote?: string
  missingRequirements: string[]
  timeline: Array<{ label: string; date: string; complete: boolean }>
}

export interface Product {
  id: string
  title: string
  sku: string
  category: string
  status: 'Active' | 'Draft' | 'Needs review'
  inventory: number
  priceMinor: number
  salePriceMinor?: number
  creatorPromotionEnabled: boolean
  commissionBps: number
  seller: string
  performance: 'High' | 'Steady' | 'New'
}

export interface Order {
  id: string
  customer: string
  item: string
  valueMinor: number
  status: 'Placed' | 'Confirmed' | 'Processing' | 'Shipped' | 'Out for delivery' | 'Delivered' | 'Cancelled'
  fulfillment: string
  orderedAt: string
}

export interface ReturnRequest {
  id: string
  orderId: string
  item: string
  reason: string
  evidence: number
  status: 'Under review' | 'Approved' | 'Rejected'
  requestedAt: string
}

export interface Settlement {
  id: string
  period: string
  orderValueMinor: number
  commissionMinor: number
  feesMinor: number
  netMinor: number
  status: 'Pending' | 'Processing' | 'Completed'
}

export interface TeamMember {
  id: string
  name: string
  role: string
  department: string
  status: 'Verified' | 'Awaiting approval' | 'Not activated' | 'Suspended'
  assignment: string
}

export interface Promotion {
  id: string
  productTitle: string
  seller: string
  trackingCode: string
  clicks: number
  orders: number
  attributedMinor: number
  commissionMinor: number
  status: 'Active' | 'Paused' | 'Completed'
}

export interface SellerOverview {
  ordersRequiringAction: number
  revenueMinor: number
  pendingReturns: number
  lowStockProducts: number
  creatorPromotions: number
  nextSettlementMinor: number
  accountHealth: number
}

export interface CreatorOverview {
  estimatedEarningsMinor: number
  activePromotions: number
  clicks: number
  orders: number
  conversion: number
  pendingPayoutMinor: number
}
