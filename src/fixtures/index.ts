import type { ApplicationRecord, CreatorOverview, Order, Product, Promotion, ReturnRequest, SellerOverview, Settlement, TeamMember } from '../domain/models'

export const products: Product[] = [
  { id: 'PRD-2048', title: 'Everyday Linen Shirt', sku: 'LN-SH-042', category: 'Fashion', status: 'Active', inventory: 84, priceMinor: 189900, salePriceMinor: 159900, creatorPromotionEnabled: true, commissionBps: 800, seller: 'Arjun QA Store', performance: 'High' },
  { id: 'PRD-2049', title: 'Botanical Face Serum', sku: 'BT-SR-018', category: 'Beauty', status: 'Active', inventory: 12, priceMinor: 129900, creatorPromotionEnabled: true, commissionBps: 750, seller: 'Nila Botanics', performance: 'Steady' },
  { id: 'PRD-2050', title: 'Desk Focus Lamp', sku: 'HM-LP-105', category: 'Home', status: 'Needs review', inventory: 6, priceMinor: 239900, salePriceMinor: 219900, creatorPromotionEnabled: false, commissionBps: 0, seller: 'Arjun QA Store', performance: 'New' },
  { id: 'PRD-2051', title: 'Travel Brew Kit', sku: 'KT-BR-212', category: 'Kitchen', status: 'Draft', inventory: 0, priceMinor: 349900, creatorPromotionEnabled: true, commissionBps: 1000, seller: 'Roam & Brew', performance: 'New' },
  { id: 'PRD-2052', title: 'Studio Yoga Mat', sku: 'FT-YG-077', category: 'Fitness', status: 'Active', inventory: 147, priceMinor: 219900, salePriceMinor: 199900, creatorPromotionEnabled: true, commissionBps: 650, seller: 'Move Daily', performance: 'High' },
]

export const orders: Order[] = [
  { id: 'S24-845291', customer: 'Priya M.', item: 'Everyday Linen Shirt', valueMinor: 159900, status: 'Placed', fulfillment: 'Confirm by 2:30 PM', orderedAt: '13 Oct, 10:42 AM' },
  { id: 'S24-845274', customer: 'Arun K.', item: 'Botanical Face Serum', valueMinor: 259800, status: 'Processing', fulfillment: 'Pack today', orderedAt: '13 Oct, 9:18 AM' },
  { id: 'S24-845119', customer: 'Meera S.', item: 'Studio Yoga Mat', valueMinor: 199900, status: 'Shipped', fulfillment: 'Ecom Express · 77831', orderedAt: '12 Oct, 6:05 PM' },
  { id: 'S24-844901', customer: 'Customer #9031', item: 'Everyday Linen Shirt', valueMinor: 319800, status: 'Delivered', fulfillment: 'Delivered 12 Oct', orderedAt: '10 Oct, 3:25 PM' },
]

export const returns: ReturnRequest[] = [
  { id: 'RET-1182', orderId: 'S24-844702', item: 'Everyday Linen Shirt', reason: 'Size differs from selection', evidence: 3, status: 'Under review', requestedAt: '12 Oct, 4:10 PM' },
  { id: 'RET-1175', orderId: 'S24-843991', item: 'Desk Focus Lamp', reason: 'Damaged packaging', evidence: 5, status: 'Approved', requestedAt: '11 Oct, 11:32 AM' },
  { id: 'RET-1168', orderId: 'S24-843214', item: 'Studio Yoga Mat', reason: 'Changed mind', evidence: 1, status: 'Rejected', requestedAt: '9 Oct, 2:08 PM' },
]

export const settlements: Settlement[] = [
  { id: 'SET-4018', period: '06–12 Oct 2026', orderValueMinor: 1864200, commissionMinor: 132900, feesMinor: 38200, netMinor: 1693100, status: 'Processing' },
  { id: 'SET-3981', period: '29 Sep–05 Oct 2026', orderValueMinor: 2148100, commissionMinor: 151300, feesMinor: 45100, netMinor: 1951700, status: 'Completed' },
  { id: 'SET-3944', period: '22–28 Sep 2026', orderValueMinor: 1987400, commissionMinor: 140500, feesMinor: 42300, netMinor: 1804600, status: 'Completed' },
]

export const team: TeamMember[] = [
  { id: 'TM-01', name: 'Arjun Rao', role: 'Owner', department: 'Leadership', status: 'Verified', assignment: 'All operations' },
  { id: 'TM-02', name: 'Kavya Iyer', role: 'Operations manager', department: 'Fulfillment', status: 'Verified', assignment: 'Orders & returns' },
  { id: 'TM-03', name: 'Rahul Sen', role: 'Catalog editor', department: 'Merchandising', status: 'Awaiting approval', assignment: 'Products' },
  { id: 'TM-04', name: 'Diya Shah', role: 'Support associate', department: 'Customer care', status: 'Not activated', assignment: 'Business support' },
]

export const promotions: Promotion[] = [
  { id: 'PROMO-601', productTitle: 'Everyday Linen Shirt', seller: 'Arjun QA Store', trackingCode: 'MAYA-LINEN-8A2', clicks: 1842, orders: 63, attributedMinor: 10073700, commissionMinor: 805900, status: 'Active' },
  { id: 'PROMO-584', productTitle: 'Studio Yoga Mat', seller: 'Move Daily', trackingCode: 'MAYA-FLOW-31C', clicks: 975, orders: 28, attributedMinor: 5597200, commissionMinor: 363800, status: 'Active' },
  { id: 'PROMO-530', productTitle: 'Botanical Face Serum', seller: 'Nila Botanics', trackingCode: 'MAYA-GLOW-19F', clicks: 614, orders: 16, attributedMinor: 2078400, commissionMinor: 155900, status: 'Completed' },
]

export const sellerOverview: SellerOverview = { ordersRequiringAction: 18, revenueMinor: 1864200, pendingReturns: 3, lowStockProducts: 4, creatorPromotions: 27, nextSettlementMinor: 1693100, accountHealth: 92 }
export const creatorOverview: CreatorOverview = { estimatedEarningsMinor: 1325600, activePromotions: 7, clicks: 4928, orders: 107, conversion: 2.17, pendingPayoutMinor: 429800 }

export const applicationFor = (role: 'seller' | 'creator'): ApplicationRecord => ({
  id: `${role === 'seller' ? 'SELL' : 'CRTR'}-APP-2026-1042`, role, status: 'under_review', submittedAt: '13 Oct 2026, 11:24 AM', missingRequirements: [],
  timeline: [
    { label: 'Application created', date: '12 Oct, 4:10 PM', complete: true },
    { label: 'Application submitted', date: '13 Oct, 11:24 AM', complete: true },
    { label: 'Initial review', date: 'In progress', complete: false },
    { label: 'Final decision', date: 'Pending', complete: false },
  ],
})
