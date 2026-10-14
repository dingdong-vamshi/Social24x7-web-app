import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from '../auth/AuthContext'

const mocks=vi.hoisted(()=>({event:null as null|((event:string,session:unknown)=>void),signIn:vi.fn(),invoke:vi.fn(),setSession:vi.fn(),signOut:vi.fn(),profile:vi.fn()}))
vi.mock('../lib/supabase',()=>{
  const client={auth:{getSession:vi.fn(async()=>({data:{session:null},error:null})),onAuthStateChange:vi.fn((callback:(event:string,session:unknown)=>void)=>{mocks.event=callback;return{data:{subscription:{unsubscribe:vi.fn()}}}}),signInWithPassword:mocks.signIn,setSession:mocks.setSession,signOut:mocks.signOut},functions:{invoke:mocks.invoke},rpc:vi.fn(()=>Promise.resolve({data:{user_id:'qa-user',seller_status:'approved'},error:null})),from:vi.fn((name:string)=>({select:()=>({eq:()=>name==='profiles'?{maybeSingle:mocks.profile}:Promise.resolve({data:[],error:null})})}))}
  return{supabase:client,supabaseConfigured:true,requireSupabase:()=>client}
})
function Probe({identifier='qa@example.com'}:{identifier?:string}){const auth=useAuth();return <><p>{auth.user?'Account released':'No account'}</p><p>{auth.profile?.display_name}</p><p>{auth.access?.seller_status??'No permissions'}</p><p>{auth.error}</p><button onClick={()=>void auth.signIn({identifier,password:'legacy-password'}).catch(()=>{})}>Verify credentials</button><button onClick={()=>void auth.signOut()}>Log out</button></>}
beforeEach(()=>{vi.clearAllMocks();mocks.event=null;mocks.signOut.mockResolvedValue({error:null});mocks.profile.mockResolvedValue({data:{id:'qa-user',display_name:'QA'},error:null});const session={user:{id:'qa-user',app_metadata:{}}};mocks.signIn.mockImplementation(async()=>{mocks.event?.('SIGNED_IN',session);return{data:{session,user:session.user},error:null}});mocks.setSession.mockImplementation(mocks.signIn);mocks.invoke.mockResolvedValue({data:{access_token:'synthetic-access',refresh_token:'synthetic-refresh'},error:null})})
describe('credential verification and Auth event isolation',()=>{
  it('clears old profile and capabilities immediately on account change',async()=>{
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    act(()=>mocks.event?.('SIGNED_IN',{user:{id:'qa-user',app_metadata:{}}}))
    expect(await screen.findByText('QA')).toBeInTheDocument()
    mocks.profile.mockImplementation(()=>new Promise(()=>{}))
    act(()=>mocks.event?.('SIGNED_IN',{user:{id:'new-qa',app_metadata:{}}}))
    await waitFor(()=>expect(screen.queryByText('QA')).not.toBeInTheDocument())
    expect(screen.getByText('No permissions')).toBeInTheDocument()
  })
  it('refreshes roles on token events and fails closed when refresh fails',async()=>{
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    const session={user:{id:'qa-user',app_metadata:{}}}
    act(()=>mocks.event?.('SIGNED_IN',session))
    expect(await screen.findByText('approved')).toBeInTheDocument()
    mocks.profile.mockResolvedValue({data:null,error:new Error('Refresh denied')})
    act(()=>mocks.event?.('TOKEN_REFRESHED',session))
    expect(await screen.findByText('Refresh denied')).toBeInTheDocument()
    expect(screen.queryByText('approved')).not.toBeInTheDocument()
    expect(screen.queryByText('QA')).not.toBeInTheDocument()
  })
  it('clears remembered workspace and private state after logout',async()=>{
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    act(()=>mocks.event?.('SIGNED_IN',{user:{id:'qa-user',app_metadata:{}}}))
    await screen.findByText('QA')
    sessionStorage.setItem('workspace:qa-user','seller')
    fireEvent.click(screen.getByText('Log out'))
    expect(await screen.findByText('No account')).toBeInTheDocument()
    expect(sessionStorage.getItem('workspace:qa-user')).toBeNull()
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'})
    expect(screen.queryByText('QA')).not.toBeInTheDocument()
  })
  it('does not publish a session before credential verification completes',async()=>{
    let finish:((value:unknown)=>void)|undefined
    const session={user:{id:'qa-user',app_metadata:{}}}
    mocks.signIn.mockImplementation(()=>{mocks.event?.('SIGNED_IN',session);return new Promise(resolve=>{finish=resolve})})
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    await waitFor(()=>expect(mocks.signIn).toHaveBeenCalled())
    expect(screen.getByText('No account')).toBeInTheDocument()
    await act(async()=>{finish?.({data:{session,user:session.user},error:null})})
    expect(await screen.findByText('Account released')).toBeInTheDocument()
    expect(screen.getByText('approved')).toBeInTheDocument()
  })
  it('rejects a Work identity without publishing personal account access',async()=>{
    const session={user:{id:'qa-user',app_metadata:{account_type:'business_employee'}}}
    mocks.signIn.mockResolvedValue({data:{session,user:session.user},error:null})
    render(<AuthProvider><Probe/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    await waitFor(()=>expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'}))
    expect(screen.getByText('No account')).toBeInTheDocument()
    expect(screen.getByText('No permissions')).toBeInTheDocument()
  })
  it.each(['qa_user','@QA_User','+919999999999'])('uses the password-verifying server endpoint for %s',async identifier=>{
    render(<AuthProvider><Probe identifier={identifier}/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    expect(await screen.findByText('Account released')).toBeInTheDocument()
    expect(mocks.invoke).toHaveBeenCalledWith('partner-login',{body:{identifier,password:'legacy-password'}})
    expect(mocks.setSession).toHaveBeenCalledWith({access_token:'synthetic-access',refresh_token:'synthetic-refresh'})
  })
  it('does not apply new-password rules to an existing email login',async()=>{
    render(<AuthProvider><Probe identifier=" QA@EXAMPLE.COM "/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    expect(await screen.findByText('Account released')).toBeInTheDocument()
    expect(mocks.signIn).toHaveBeenCalledWith({email:'qa@example.com',password:'legacy-password'})
    expect(mocks.invoke).not.toHaveBeenCalled()
  })
  it('fails closed on unknown or ambiguous identifier responses',async()=>{
    mocks.invoke.mockResolvedValue({data:null,error:{message:'Invalid credentials'}})
    render(<AuthProvider><Probe identifier="unknown_user"/></AuthProvider>)
    await waitFor(()=>expect(mocks.event).not.toBeNull())
    fireEvent.click(screen.getByText('Verify credentials'))
    await waitFor(()=>expect(mocks.invoke).toHaveBeenCalled())
    expect(mocks.setSession).not.toHaveBeenCalled()
    expect(screen.getByText('No permissions')).toBeInTheDocument()
  })
})
