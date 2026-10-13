import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../auth/AuthContext'

const mocks=vi.hoisted(()=>({event:null as null|((event:string,session:unknown)=>void),verify:vi.fn(),signOut:vi.fn(),profile:vi.fn()}))
vi.mock('../lib/supabase',()=>{
  const session={user:{id:'qa-user',app_metadata:{}}}
  const client={auth:{getSession:vi.fn(async()=>({data:{session:null},error:null})),onAuthStateChange:vi.fn((callback:(event:string,session:unknown)=>void)=>{mocks.event=callback;return{data:{subscription:{unsubscribe:vi.fn()}}}}),signInWithPassword:vi.fn(async()=>{mocks.event?.('SIGNED_IN',session);return{data:{session,user:session.user},error:null}}),signOut:mocks.signOut},rpc:vi.fn((name:string)=>name==='verify_my_login_phone'?mocks.verify():Promise.resolve({data:{user_id:'qa-user',seller_status:'approved'},error:null})),from:vi.fn((name:string)=>({select:()=>({eq:()=>name==='profiles'?{maybeSingle:mocks.profile}:Promise.resolve({data:[],error:null})})}))}
  return{supabase:client,supabaseConfigured:true,requireSupabase:()=>client}
})
function Probe(){const auth=useAuth();return <><p>{auth.user?'Account released':'No account'}</p><p>{auth.access?.seller_status??'No permissions'}</p><button onClick={()=>void auth.signIn({email:'qa@example.com',phone:'+919876543210',password:'not-a-real-password'}).catch(()=>{})}>Verify credentials</button></>}
beforeEach(()=>{vi.clearAllMocks();mocks.event=null;mocks.signOut.mockResolvedValue({error:null});mocks.profile.mockResolvedValue({data:{id:'qa-user',display_name:'QA'},error:null})})
describe('credential verification and Auth event isolation',()=>{
  it('does not publish the SIGNED_IN session before the phone check succeeds',async()=>{
    let finish:((value:unknown)=>void)|undefined
    mocks.verify.mockImplementation(()=>new Promise(resolve=>{finish=resolve}))
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    await waitFor(()=>expect(mocks.verify).toHaveBeenCalled())
    expect(screen.getByText('No account')).toBeInTheDocument()
    await act(async()=>{finish?.({data:true,error:null})})
    expect(await screen.findByText('Account released')).toBeInTheDocument()
    expect(screen.getByText('approved')).toBeInTheDocument()
  })
  it('clears a failed phone-verification session without publishing account access',async()=>{
    mocks.verify.mockResolvedValue({data:false,error:null})
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    await waitFor(()=>expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'}))
    expect(screen.getByText('No account')).toBeInTheDocument()
    expect(screen.getByText('No permissions')).toBeInTheDocument()
  })
})
