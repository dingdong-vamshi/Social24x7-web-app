import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOperationsRepository, fulfillmentNext } from './operations'
import { CounterpartyDirectory, FulfillmentEditor, ReturnReview } from '../pages/CommerceOperations'
import { MemoryRouter } from 'react-router-dom'
import type { Order } from './commerce'
const mocks=vi.hoisted(()=>({rpc:vi.fn(),from:vi.fn()}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>mocks}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:{id:'owner'}})}))
const repo=()=>createOperationsRepository(mocks as unknown as SupabaseClient)
beforeEach(()=>{vi.clearAllMocks();mocks.rpc.mockResolvedValue({data:[],error:null});const q={select:vi.fn(),eq:vi.fn(),order:vi.fn(),then:(fn:(x:unknown)=>void)=>Promise.resolve({data:[],error:null}).then(fn)};q.select.mockReturnValue(q);q.eq.mockReturnValue(q);q.order.mockReturnValue(q);mocks.from.mockReturnValue(q)})
describe('operational parity',()=>{
  it.each([['creator','/partner/seller/creator-chat'],['seller','/partner/creator/chat']] as const)('keeps the %s counterparty in its dedicated commerce channel', async (role, path) => {
    mocks.rpc.mockImplementation(async (name: string) => ({ data: name === 'search_creator_seller_counterparties' ? [{user_id:'counterparty',display_name:'QA',username:'qa'}] : 'conversation-id', error:null }))
    render(<MemoryRouter><CounterpartyDirectory role={role}/></MemoryRouter>)
    fireEvent.click(screen.getByText(`Find an approved ${role === 'seller' ? 'Seller' : 'Creator'}`))
    fireEvent.change(screen.getByLabelText('Search by name'), {target:{value:'QA'}})
    fireEvent.click(screen.getByRole('button',{name:'Search approved accounts'}))
    fireEvent.click(await screen.findByRole('button',{name:'Open business conversation'}))
    expect(await screen.findByRole('link',{name:'Continue to conversation'})).toHaveAttribute('href',path+'?conversation=conversation-id')
  })
  it.each([['placed',['confirmed','cancelled']],['confirmed',['processing','cancelled']],['processing',['shipped','cancelled']],['shipped',['out_for_delivery']],['out_for_delivery',['delivered']],['delivered',[]],['cancelled',[]]] as const)('preserves %s transitions', (status,next)=>expect(fulfillmentNext({status,payment_method:'cod',payment_status:'cod_pending'})).toEqual(next))
  it('does not offer fulfillment before external payment capture',()=>expect(fulfillmentNext({status:'placed',payment_method:'external',payment_status:'pending'})).toEqual([]))
  it('uses atomic fulfillment RPC, not independent order/ledger writes',async()=>{await repo().fulfill({orderId:'order',status:'shipped',carrier:' Carrier ',trackingNumber:' QA ',packageReference:'',customerNote:'note'});expect(mocks.rpc).toHaveBeenCalledWith('seller_update_creator_commerce_fulfillment',{p_order_id:'order',p_status:'shipped',p_carrier:'Carrier',p_tracking_number:'QA',p_package_reference:'',p_customer_note:'note',p_packing_evidence_path:null});expect(mocks.from).not.toHaveBeenCalled()})
  it.each(['approved','rejected','under_review'] as const)('uses return service for %s',async decision=>{await repo().reviewReturn('return',decision,' note ');expect(mocks.rpc).toHaveBeenCalledWith('seller_review_creator_commerce_return',{p_return_request_id:'return',p_decision:decision,p_reason:'note'})})
  it('propagates operation errors',async()=>{mocks.rpc.mockResolvedValue({data:null,error:{message:'Invalid transition'}});await expect(repo().reviewReturn('return','approved','')).rejects.toThrow('Invalid transition')})
  it('uses approved counterparty search and canonical opening',async()=>{await repo().counterparties('seller',' QA ');await repo().openCounterparty('seller-id','seller');expect(mocks.rpc).toHaveBeenCalledWith('search_creator_seller_counterparties',{p_role:'seller',p_query:'QA',p_limit:20});expect(mocks.rpc).toHaveBeenCalledWith('open_creator_seller_conversation',{target_user:'seller-id',p_role:'seller'})})
  it('does not execute return approval before explicit confirmation',async()=>{render(<ReturnReview id="return" status="submitted" onSaved={vi.fn()}/>);fireEvent.change(screen.getByLabelText('Return decision'),{target:{value:'approved'}});fireEvent.click(screen.getByRole('button',{name:'Review decision'}));expect(mocks.rpc).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('reverses related commissions');fireEvent.click(screen.getByRole('button',{name:'Cancel decision'}));expect(mocks.rpc).not.toHaveBeenCalled()})
  it('confirms an order update and surfaces the expected result callback',async()=>{const saved=vi.fn();render(<FulfillmentEditor order={{id:'order',status:'confirmed',payment_method:'cod',payment_status:'cod_pending',order_fulfillments:null} as Order} onSaved={saved}/>);fireEvent.click(screen.getByRole('button',{name:'Review order update'}));expect(mocks.rpc).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm order update'}));await waitFor(()=>expect(saved).toHaveBeenCalledTimes(1))})
})
