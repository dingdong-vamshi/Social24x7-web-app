import { createRoot } from 'react-dom/client'
import { WorkConversationActions } from '../src/features/team/WorkConversationActions'
import { MemberMetrics } from '../src/features/team/TeamPresentation'
import { SharedCommerceMessage } from '../src/features/chat/SharedCommerceMessage'
import type { createBusinessOperationsRepository } from '../src/features/team/businessOperationsRepository'
import '../src/styles.css'
import '../src/features/team/team.css'
import '../src/features/chat/chat.css'
const id='10000000-0000-4000-8000-000000000001'
const repository: ReturnType<typeof createBusinessOperationsRepository> = {
  listShares: async (_,kind) => kind === 'product' ? [{id,title:'Synthetic desk lamp',price_minor:120000,currency:'INR'}] : [{id,status:'delivered'}],
  sendShare: async () => id,
  listReturns: async () => [{id,order_id:id,status:'submitted',reason:'Synthetic fixture: damaged shade',title:'Synthetic desk lamp'}],
  reviewReturn: async (_,__,status) => ({status,moneyTransferred:false,refundProcessing:status==='approved'?'external_integration_pending':'not_requested'}),
}
createRoot(document.getElementById('root')!).render(<main className="account-page team-management"><p style={{padding:16,background:'#fff1b8',color:'#332600'}}>ISOLATED QA · Synthetic data · No authentication or production connection · All actions stay in this local fixture</p><h1>Business Work · customer actions</h1><p>Assigned representative: Synthetic Alice · Operations fixture</p><WorkConversationActions conversationId={id} permissions={['business_share_products_orders','business_returns_refunds']} onChanged={()=>{}} repository={repository}/><h2>Customer-visible product card</h2><SharedCommerceMessage kind="product" payload={{product_id:id,product:{id,title:'Synthetic desk lamp',price_minor:120000,currency:'INR'}}}/><h2>Separate current and recorded history</h2><MemberMetrics metric={{membershipId:id,openChats:1,resolvedChats:1,lifetimeChats:2,waitingForReply:0,recordedLifetimeChats:7,firstRecordedAt:'2026-09-25T00:00:00Z'}}/></main>)
