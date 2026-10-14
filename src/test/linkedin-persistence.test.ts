import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { applicationSocialLinks } from '../auth/applicationFields'
import { getMyCreatorApplication, getMySellerApplication, saveCommerceOnboardingDraft } from '../auth/onboardingRepository'

// Contract-level adapter, not a production database or authorization simulation.
describe('LinkedIn repository round trip', () => {
  it.each(['seller', 'creator'] as const)('round-trips %s LinkedIn using the existing RPC and owner-scoped read', async kind => {
    const links = applicationSocialLinks({linkedin:'linkedin.com/in/synthetic'}, kind)
    const payload = {currentStep:kind === 'seller' ? 4 : 1, ...links, socialHandles:links}
    let row:Record<string,unknown> = {}
    const rpc = vi.fn(async (_name, args) => {
      row = {id:'synthetic',owner_id:'synthetic-owner',status:'draft',application_payload:structuredClone(args.p_payload),social_handles:structuredClone(args.p_payload.socialHandles)}
      return {data:structuredClone(args.p_payload),error:null}
    })
    const query = {select:vi.fn(()=>query),eq:vi.fn(()=>query),order:vi.fn(()=>query),limit:vi.fn(()=>query),maybeSingle:vi.fn(async()=>({data:structuredClone(row),error:null}))}
    const from = vi.fn(()=>query)
    const client = {rpc,from} as unknown as SupabaseClient
    expect(await saveCommerceOnboardingDraft(client,kind,payload)).toMatchObject({socialHandles:{linkedin:'https://linkedin.com/in/synthetic'}})
    expect(rpc).toHaveBeenCalledWith('save_creator_commerce_onboarding_draft',{p_kind:kind,p_payload:payload})
    const resumed = kind === 'seller' ? await getMySellerApplication(client,'synthetic-owner') : await getMyCreatorApplication(client,'synthetic-owner')
    expect(from).toHaveBeenCalledWith(kind+'_applications')
    expect(query.eq).toHaveBeenCalledWith('owner_id','synthetic-owner')
    expect(resumed?.applicationPayload.socialHandles).toMatchObject({linkedin:links.linkedin})
    if (resumed && 'socialHandles' in resumed) expect(resumed.socialHandles.linkedin).toBe(links.linkedin)
  })
  it.each(['seller','creator'] as const)('propagates %s backend permission errors rather than claiming a saved draft',async kind=>{
    const rpc = vi.fn(async()=>({data:null,error:new Error('Authentication required.')}))
    await expect(saveCommerceOnboardingDraft({rpc} as unknown as SupabaseClient,kind,{socialHandles:{linkedin:'https://linkedin.com/in/synthetic'}})).rejects.toThrow('Authentication required.')
  })
})
