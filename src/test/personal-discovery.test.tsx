import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NewPersonalChat } from '../features/chat/NewPersonalChat'
import type { ChatRepository } from '../features/chat/repository'
import { createPersonalDiscovery } from '../features/chat/personalDiscovery'
import { verifiedDisplayNames } from '../auth/publicIdentity'

const id = '00000000-0000-4000-8000-000000000002'
it('normalizes username search and refuses private identifier lookup', async () => {
  const rpc = vi.fn().mockResolvedValue({data:[],error:null})
  const repo = createPersonalDiscovery({rpc} as unknown as SupabaseClient)
  await repo.searchUsernames('@Some_User')
  expect(rpc).toHaveBeenCalledWith('search_partner_chat_usernames',{p_query:'some_user'})
  rpc.mockClear()
  await expect(repo.searchUsernames('person@example.test')).rejects.toThrow('username')
  expect(rpc).not.toHaveBeenCalled()
})
it('requires a confirmed conversation response and hides provider errors',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:{state:'accepted'},error:null})
  const repo=createPersonalDiscovery({rpc} as unknown as SupabaseClient)
  await expect(repo.requestPersonalChat(id,'accept')).rejects.toThrow('confirmed')
  rpc.mockResolvedValue({data:null,error:{message:'private database detail'}})
  await expect(repo.requestPersonalChat(id,'request')).rejects.toThrow('unavailable')
})
it('adds only backend-approved presentation and fails closed',async()=>{
  const rpc=vi.fn().mockResolvedValue({data:[{id,display_name:'Dr Example',verified_doctor:true},{id:'other',display_name:'Dr Unverified',verified_doctor:false}],error:null})
  const client={rpc} as unknown as SupabaseClient
  expect(await verifiedDisplayNames(client,[id,'other',id])).toEqual({[id]:'Dr Example'})
  expect(rpc).toHaveBeenCalledWith('get_partner_display_names',{target_ids:[id,'other']})
  rpc.mockRejectedValue(new Error('Unavailable'))
  expect(await verifiedDisplayNames(client,[id])).toEqual({})
})
it('sends a consent request without opening a conversation prematurely',async()=>{
  const request=vi.fn().mockResolvedValue({state:'outgoing'})
  const repository={incomingRequests:vi.fn().mockResolvedValue([]),searchUsernames:vi.fn().mockResolvedValue([{id,username:'synthetic',display_name:'Synthetic',request_state:'none'}]),requestPersonalChat:request} as unknown as ChatRepository
  const opened=vi.fn()
  render(<NewPersonalChat repository={repository} opened={opened} close={vi.fn()} revision={0}/>)
  fireEvent.change(screen.getByLabelText('Search username'),{target:{value:'synthetic'}})
  fireEvent.click(screen.getByRole('button',{name:'Search'}))
  fireEvent.click(await screen.findByRole('button',{name:'Send request'}))
  await screen.findByRole('button',{name:'Request pending'})
  expect(request).toHaveBeenCalledWith(id,'request');expect(opened).not.toHaveBeenCalled()
})
it('opens only the accepted conversation and supports incoming requests',async()=>{
  const repository={incomingRequests:vi.fn().mockResolvedValue([{id,username:'synthetic',display_name:'Synthetic',request_state:'incoming'}]),requestPersonalChat:vi.fn().mockResolvedValue({state:'accepted',conversation_id:id})} as unknown as ChatRepository
  const opened=vi.fn()
  render(<NewPersonalChat repository={repository} opened={opened} close={vi.fn()} revision={0}/>)
  fireEvent.click(await screen.findByRole('button',{name:'Accept request'}))
  await waitFor(()=>expect(opened).toHaveBeenCalledWith(id))
})
