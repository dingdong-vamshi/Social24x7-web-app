import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readBusinessSharedContent } from './businessContentRepository'

const store='00000000-0000-4000-8000-000000000001', chat='00000000-0000-4000-8000-000000000002', message='00000000-0000-4000-8000-000000000003', attachment='00000000-0000-4000-8000-000000000004'
function fixture(payload: Record<string,unknown>, kind='image') {
  const query={select:vi.fn(),eq:vi.fn(),is:vi.fn(),maybeSingle:vi.fn()}
  query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.is.mockReturnValue(query)
  query.maybeSingle.mockResolvedValueOnce({data:{id:message,kind,payload},error:null}).mockResolvedValueOnce({data:{storage_path:`${chat}/sender/photo.png`,original_filename:'Synthetic QA image',mime_type:'image/png'},error:null})
  const inbox={eq:vi.fn().mockResolvedValue({data:[{storefront_id:store,conversation_id:chat}],error:null})}
  const signed=vi.fn().mockResolvedValue({data:{signedUrl:'https://storage.example/signed-qa'},error:null})
  const raw={rpc:vi.fn().mockReturnValue(inbox),from:vi.fn().mockReturnValue(query),storage:{from:vi.fn().mockReturnValue({createSignedUrl:signed})}}
  return {raw,client:raw as unknown as SupabaseClient,query,inbox,signed}
}
describe('Business shared content uses existing RLS without widening access',()=>{
  it('loads an attachment only after live inbox and message/conversation checks',async()=>{
    const f=fixture({attachment_id:attachment,url:'https://untrusted.invalid/not-used'})
    expect(await readBusinessSharedContent(f.client,store,chat,message)).toMatchObject({type:'attachment',media:'image',filename:'Synthetic QA image'})
    expect(f.query.eq).toHaveBeenCalledWith('id',message);expect(f.query.eq).toHaveBeenCalledWith('conversation_id',chat)
    expect(f.query.eq).toHaveBeenCalledWith('id',attachment)
    expect(f.signed).toHaveBeenCalledWith(`${chat}/sender/photo.png`,60)
  })
  it('does not query messages after a changed assignment/store visibility',async()=>{
    const f=fixture({attachment_id:attachment});f.inbox.eq.mockResolvedValue({data:[{storefront_id:'other',conversation_id:chat}],error:null})
    await expect(readBusinessSharedContent(f.client,store,chat,message)).rejects.toThrow('no longer available')
    expect(f.raw.from).not.toHaveBeenCalled()
  })
  it('does not bypass participant RLS for a supervisor with text-only access',async()=>{
    const f=fixture({});f.query.maybeSingle.mockReset().mockResolvedValue({data:null,error:null})
    await expect(readBusinessSharedContent(f.client,store,chat,message)).rejects.toThrow('current conversation access')
    expect(f.signed).not.toHaveBeenCalled()
  })
  it('rejects a cross-conversation attachment path',async()=>{
    const f=fixture({attachment_id:attachment});f.query.maybeSingle.mockReset().mockResolvedValueOnce({data:{kind:'image',payload:{attachment_id:attachment}},error:null}).mockResolvedValueOnce({data:{storage_path:'other-conversation/photo.png'},error:null})
    await expect(readBusinessSharedContent(f.client,store,chat,message)).rejects.toThrow('path is unavailable')
    expect(f.signed).not.toHaveBeenCalled()
  })
  it('does not trust arbitrary media URLs or silently retry denied Storage as public',async()=>{
    const f=fixture({url:'https://untrusted.invalid/photo.png'})
    await expect(readBusinessSharedContent(f.client,store,chat,message)).rejects.toThrow('format is not available')
    expect(f.signed).not.toHaveBeenCalled()
    const denied=fixture({attachment_id:attachment});denied.signed.mockResolvedValue({data:null,error:{message:'Denied'}})
    await expect(readBusinessSharedContent(denied.client,store,chat,message)).rejects.toThrow('No public fallback')
  })
  it('renders only a scoped order snapshot, excluding financial/customer payload fields',async()=>{
    const f=fixture({storefront_id:store,order_id:attachment,order_status:'confirmed',items:[{title:'Synthetic item',quantity:2}],customer_note:'private',tracking_number:'private'},'order')
    expect(await readBusinessSharedContent(f.client,store,chat,message)).toEqual({type:'order',id:attachment,status:'confirmed',items:[{title:'Synthetic item',quantity:2}]})
    const foreign=fixture({storefront_id:'other',order_id:attachment},'order')
    await expect(readBusinessSharedContent(foreign.client,store,chat,message)).rejects.toThrow('format is not available')
  })
  it('does not convert a shared post into a product or open global Social for Work',async()=>{
    const f=fixture({post:{id:attachment,caption:'Synthetic shared post',url:'https://untrusted.invalid'}},'product')
    expect(await readBusinessSharedContent(f.client,store,chat,message)).toEqual({type:'post',caption:'Synthetic shared post'})
  })
})
