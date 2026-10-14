import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOperationsRepository, type StoreSettings } from './operations'
const q={select:vi.fn(),eq:vi.fn(),update:vi.fn(),single:vi.fn(),order:vi.fn()}
const client={from:vi.fn(()=>q),storage:{from:vi.fn()},rpc:vi.fn()}
const repo=()=>createOperationsRepository(client as unknown as SupabaseClient)
beforeEach(()=>{vi.clearAllMocks();for(const key of ['select','eq','update','order'] as const)q[key].mockReturnValue(q);q.single.mockResolvedValue({data:{id:'store'},error:null})})
describe('scoped profile, storefront and evidence',()=>{
 it('never persists approval, owner or financial properties from a store draft',async()=>{await repo().saveStore('store','owner',{name:' Store ',slug:'qa-store',owner_id:'attacker',verification_status:'approved',bank_account:'fake'} as unknown as StoreSettings);expect(q.eq.mock.calls).toEqual([['id','store'],['owner_id','owner']]);const payload=q.update.mock.calls[0][0];expect(payload.name).toBe('Store');expect(payload).not.toHaveProperty('owner_id');expect(payload).not.toHaveProperty('verification_status');expect(payload).not.toHaveProperty('bank_account')})
 it('reports a denied or missing scoped store update',async()=>{q.single.mockResolvedValue({data:null,error:null});await expect(repo().saveStore('store','wrong',{name:'Store',slug:'qa-store'} as StoreSettings)).rejects.toThrow('No record')})
 it('updates only the authenticated profile fields supplied by the page',async()=>{await repo().saveProfile('user',{display_name:' QA ',username:' qa ',bio:'Test'});expect(q.eq).toHaveBeenCalledWith('id','user');expect(q.update).toHaveBeenCalledWith({display_name:'QA',username:'qa',bio:'Test'})})
 it('rereads authorized evidence metadata before signing a short-lived link',async()=>{q.single.mockResolvedValue({data:{storage_path:'authorized/evidence.pdf'},error:null});const sign=vi.fn().mockResolvedValue({data:{signedUrl:'fixture'},error:null});client.storage.from.mockReturnValue({createSignedUrl:sign});await repo().evidenceUrl('evidence-id');expect(q.eq).toHaveBeenCalledWith('id','evidence-id');expect(client.storage.from).toHaveBeenCalledWith('creator-commerce-private');expect(sign).toHaveBeenCalledWith('authorized/evidence.pdf',300)})
 it('does not sign evidence after metadata authorization fails',async()=>{q.single.mockResolvedValue({data:null,error:{message:'Denied'}});await expect(repo().evidenceUrl('other-id')).rejects.toThrow('Denied');expect(client.storage.from).not.toHaveBeenCalled()})
})
