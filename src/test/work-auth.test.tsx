import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../auth/AuthContext'

const m=vi.hoisted(()=>({event:null as null|((event:string,session:unknown)=>void),rpc:vi.fn(),from:vi.fn(),signIn:vi.fn(),signOut:vi.fn()}))
vi.mock('../lib/supabase',()=>{
  const client={auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:(cb:typeof m.event)=>{m.event=cb;return{data:{subscription:{unsubscribe:vi.fn()}}}},signInWithPassword:m.signIn,signOut:m.signOut},rpc:m.rpc,from:m.from}
  return{supabase:client,supabaseConfigured:true,requireSupabase:()=>client}
})
function Probe(){const a=useAuth();return <><p>{a.workContext?.status||'No work access'}</p><p>{a.access?'Personal permissions':'No personal permissions'}</p><p>{a.error}</p><button onClick={()=>void a.signInWork({loginId:' QA.Agent ',password:'fixture-only'}).catch(()=>{})}>Work login</button></>}
const user={id:'work-id',app_metadata:{account_type:'business_employee'}}
beforeEach(()=>{vi.clearAllMocks();m.event=null;m.signOut.mockResolvedValue({error:null});m.signIn.mockResolvedValue({data:{user,session:{user}},error:null});m.rpc.mockResolvedValue({data:{status:'verified',membershipId:'member'},error:null})})
describe('separate work identity boundary',()=>{
  it('uses synthetic work login and no personal profile/commerce query',async()=>{render(<AuthProvider><Probe/></AuthProvider>);await waitFor(()=>expect(m.event).not.toBeNull());fireEvent.click(screen.getByText('Work login'));expect(await screen.findByText('verified')).toBeInTheDocument();expect(m.signIn).toHaveBeenCalledWith({email:'qa.agent@work.social24x7.app',password:'fixture-only'});expect(m.from).not.toHaveBeenCalled();expect(m.rpc).toHaveBeenCalledWith('get_my_business_work_context');expect(screen.getByText('No personal permissions')).toBeInTheDocument()})
  it.each(['not_activated','awaiting_approval','suspended','removed'])('denies %s identities and clears session',async status=>{m.rpc.mockResolvedValue({data:{status},error:null});render(<AuthProvider><Probe/></AuthProvider>);await waitFor(()=>expect(m.event).not.toBeNull());fireEvent.click(screen.getByText('Work login'));await waitFor(()=>expect(m.signOut).toHaveBeenCalledWith({scope:'local'}));expect(screen.getByText('No work access')).toBeInTheDocument();expect(m.from).not.toHaveBeenCalled()})
  it('rejects user-controlled metadata without trusted app metadata',async()=>{const forged={id:'personal',app_metadata:{},user_metadata:{account_type:'business_employee'}};m.signIn.mockResolvedValue({data:{user:forged,session:{user:forged}},error:null});render(<AuthProvider><Probe/></AuthProvider>);await waitFor(()=>expect(m.event).not.toBeNull());fireEvent.click(screen.getByText('Work login'));await waitFor(()=>expect(m.signOut).toHaveBeenCalled());expect(screen.getByText('No work access')).toBeInTheDocument()})
  it('removes work permissions after a revocation event',async()=>{render(<AuthProvider><Probe/></AuthProvider>);await waitFor(()=>expect(m.event).not.toBeNull());act(()=>m.event?.('SIGNED_IN',{user}));await screen.findByText('verified');m.rpc.mockResolvedValue({data:{status:'suspended'},error:null});act(()=>m.event?.('TOKEN_REFRESHED',{user}));expect(await screen.findByText(/awaiting approval, suspended/)).toBeInTheDocument();expect(screen.getByText('No work access')).toBeInTheDocument()})
})
