import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn(),signed:vi.fn(),storage:vi.fn()}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({rpc:mocks.rpc,from:mocks.from,storage:{from:mocks.storage}})}))
import { adminRepository, maskIdentifier, reviewActions, type AdminApplication } from './admin'
import { submitSellerApplication } from '../auth/onboardingRepository'
import type { SupabaseClient } from '@supabase/supabase-js'
const application={id:'qa',kind:'seller',status:'submitted'} as AdminApplication
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:{admin_access:true},error:null});mocks.storage.mockReturnValue({createSignedUrl:mocks.signed})})
describe('Admin backend contracts',()=>{
  it('carries submitted Seller social links into the same authoritative Admin detail record (memory adapter)',async()=>{
    let saved: Record<string,unknown> = {}
    const applicationQuery = {
      upsert: vi.fn((row:Record<string,unknown>)=>{saved={id:'synthetic',updated_at:'2026-10-14',...row};return applicationQuery}),
      select: vi.fn(()=>applicationQuery),eq:vi.fn(()=>applicationQuery),neq:vi.fn(()=>applicationQuery),
      single:vi.fn(async()=>({data:saved,error:null})),
    }
    const verificationQuery={select:vi.fn(()=>verificationQuery),eq:vi.fn(()=>verificationQuery),maybeSingle:vi.fn(async()=>({data:null,error:null}))}
    mocks.from.mockImplementation((table:string)=>table==='commerce_verification_profiles'?verificationQuery:applicationQuery)
    const links={website:'https://example.com/',instagram:'https://instagram.com/synthetic'}
    const client={from:mocks.from} as unknown as SupabaseClient
    const submitted=await submitSellerApplication(client,'synthetic-owner',{sellerType:'non_gst',legalName:'Synthetic Legal',businessName:'Synthetic Business',storefrontName:'Synthetic Store',registeredState:'MH',city:'Synthetic',phone:'',email:'',addressLine:'',pickupAddress:'',returnAddress:'',applicationPayload:{socialHandles:links}})
    expect(submitted.status).toBe('submitted')
    expect(saved.owner_id).toBe('synthetic-owner')
    const detail=await adminRepository.detail('seller','synthetic')
    expect(detail.application.id).toBe(submitted.id)
    expect(detail.fields).toContainEqual(['Social · Business website',links.website])
    expect(detail.fields).toContainEqual(['Social · Instagram',links.instagram])
    expect(applicationQuery.neq).toHaveBeenCalledWith('status','draft')
    expect(mocks.rpc).toHaveBeenCalledWith('get_my_creator_commerce_access')
  })
  it('checks backend admin capability before reading records',async()=>{mocks.rpc.mockResolvedValue({data:{admin_access:false},error:null});await expect(adminRepository.list()).rejects.toThrow('Admin access required');expect(mocks.from).not.toHaveBeenCalled()})
  it('uses canonical review RPC and exact parameters',async()=>{mocks.rpc.mockResolvedValueOnce({data:{admin_access:true},error:null}).mockResolvedValueOnce({data:{decision:'approved',applicationId:'qa'},error:null});await adminRepository.review(application,'approved','');expect(mocks.rpc).toHaveBeenLastCalledWith('review_creator_commerce_application',{target_kind:'seller',target_id:'qa',target_decision:'approved',target_reason:null});expect(mocks.from).not.toHaveBeenCalled()})
  it('rejects unsupported state transitions and missing reasons before mutation',async()=>{await expect(adminRepository.review({...application,status:'draft'},'approved','')).rejects.toThrow('unavailable');await expect(adminRepository.review(application,'rejected','  ')).rejects.toThrow('reason');expect(mocks.rpc).not.toHaveBeenCalled()})
  it('uses private storage with a five minute URL',async()=>{mocks.signed.mockResolvedValue({data:{signedUrl:'https://qa.invalid/temporary'},error:null});await adminRepository.evidence('qa/path.pdf');expect(mocks.storage).toHaveBeenCalledWith('creator-commerce-private');expect(mocks.signed).toHaveBeenCalledWith('qa/path.pdf',300)})
  it('propagates evidence access denial without public fallback',async()=>{mocks.signed.mockResolvedValue({data:null,error:new Error('Storage access denied')});await expect(adminRepository.evidence('qa/path.pdf')).rejects.toThrow('Storage access denied')})
  it('keeps professional lifecycle separate and masks identifiers',()=>{expect(reviewActions('approved').map(a=>a.decision)).toEqual(['suspended']);expect(reviewActions('suspended').map(a=>a.decision)).toEqual(['approved']);expect(maskIdentifier('QA-SAMPLE-1234')).toBe('••••1234')})
})
