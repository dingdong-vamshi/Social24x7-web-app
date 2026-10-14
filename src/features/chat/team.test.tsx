import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { createTeamChatRepository } from './teamRepository'
import { TeamChatMonitor } from './TeamChatMonitor'
import type { SupabaseClient } from '@supabase/supabase-js'

const mock = vi.hoisted(() => ({ rpc: vi.fn(), rows: [] as Record<string, unknown>[], error: null as null | {message:string} }))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({ rpc: mock.rpc }) }))
const row = { conversation_id:'chat-a', storefront_id:'store-a', customer_display_name:'QA Customer', last_message:'QA business request', last_message_at:'2026-10-14T08:00:00Z', work_status:'open', assignee_membership_id:'member-a', assignee_name:'QA Employee' }
const message = { message_id:'message-a', body:'QA business message', message_kind:'text', created_at:'2026-10-14T08:00:00Z', sender_type:'representative', sender_display_name:'QA Employee', sender_tagline:'Support', representative_verified:true }
const client = () => ({ rpc: mock.rpc }) as unknown as SupabaseClient
beforeEach(() => { mock.rows=[row]; mock.error=null; mock.rpc.mockReset(); mock.rpc.mockImplementation((name:string) => name === 'get_business_workspace_inbox' ? {eq:vi.fn().mockResolvedValue({data:mock.rows,error:mock.error})} : Promise.resolve({data:[message],error:mock.error})) })
describe('supervised customer chats', () => {
  it('filters returned rows to the selected storefront', async () => {
    mock.rows=[row,{...row,storefront_id:'other-store',conversation_id:'other-chat'}]
    expect(await createTeamChatRepository(client()).conversations('store-a')).toEqual([row])
  })
  it('denies a changed assignment before requesting messages', async () => {
    await expect(createTeamChatRepository(client()).messages('store-a','chat-a','other-member')).rejects.toThrow('no longer available')
    expect(mock.rpc).not.toHaveBeenCalledWith('get_business_workspace_messages',expect.anything())
  })
  it('propagates backend denial without treating it as an empty inbox', async () => {
    mock.error={message:'Access denied'}
    await expect(createTeamChatRepository(client()).conversations('store-a')).rejects.toThrow('Access denied')
  })
  it('shows business history, member empty state and no reply or mutation controls', async () => {
    render(<MemoryRouter><TeamChatMonitor storefrontId="store-a" members={[{id:'member-a',fullName:'QA Employee',roleName:'Support',status:'verified',identityKind:'work',permissions:[],jobTitle:'Agent'},{id:'removed',fullName:'Removed employee',roleName:'Support',status:'removed',identityKind:'work',permissions:[],jobTitle:'Agent'}]}/></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button',{name:/QA Customer/}))
    expect(await screen.findByText('QA business message')).toBeInTheDocument()
    expect(screen.getByText('Verified representative · recorded sender identity')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Employee'),{target:{value:'removed'}})
    expect(screen.queryByText('QA business message')).not.toBeInTheDocument()
    expect(screen.getByText('No chats assigned to this member')).toBeInTheDocument()
    expect(mock.rpc.mock.calls.every(([name])=>['get_business_workspace_inbox','get_business_workspace_messages'].includes(name))).toBe(true)
  })
  it('clears visible history after permissions fail on refresh', async () => {
    render(<MemoryRouter><TeamChatMonitor storefrontId="store-a" members={[]}/></MemoryRouter>)
    fireEvent.click(await screen.findByRole('button',{name:/QA Customer/}))
    await screen.findByText('QA business message')
    mock.error={message:'Permission revoked'}
    fireEvent.click(screen.getByRole('button',{name:'Refresh chats'}))
    await waitFor(()=>expect(screen.queryByText('QA business message')).not.toBeInTheDocument())
    expect(await screen.findByText('Permission revoked')).toBeInTheDocument()
  })
})
