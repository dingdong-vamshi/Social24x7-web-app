import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import { validateRecoveryLink } from '../auth/recovery'
const mocks=vi.hoisted(()=>({exchange:vi.fn(),getUser:vi.fn(),update:vi.fn(),signOut:vi.fn(),reset:vi.fn()}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({auth:{exchangeCodeForSession:mocks.exchange,getUser:mocks.getUser,updateUser:mocks.update,signOut:mocks.signOut,resetPasswordForEmail:mocks.reset}})}))
import { ForgotPassword, ResetPassword } from '../pages/PasswordRecovery'
const recovered={user:{id:'synthetic',app_metadata:{}}}
beforeEach(()=>{vi.clearAllMocks();window.history.replaceState(null,'','/auth/reset-password?code=synthetic');mocks.exchange.mockResolvedValue({data:{session:recovered,redirectType:'recovery'},error:null});mocks.getUser.mockResolvedValue({data:{user:recovered.user},error:null});mocks.update.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null});mocks.reset.mockResolvedValue({error:null})})
it('does not authorize an empty reset URL using an existing session',async()=>{window.history.replaceState(null,'','/auth/reset-password');render(<MemoryRouter><ResetPassword/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('invalid');expect(mocks.update).not.toHaveBeenCalled();expect(mocks.exchange).not.toHaveBeenCalled()})
it.each(['expired','signup','employee'])('rejects the %s recovery case',async kind=>{
  if(kind==='expired') mocks.exchange.mockResolvedValue({data:{session:null},error:{message:'Expired'}})
  if(kind==='signup') mocks.exchange.mockResolvedValue({data:{session:recovered,redirectType:null},error:null})
  if(kind==='employee') mocks.getUser.mockResolvedValue({data:{user:{...recovered.user,app_metadata:{account_type:'business_employee'}}},error:null})
  render(<MemoryRouter><ResetPassword/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('invalid');expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
})
it('deduplicates the one-use code exchange for the same client',async()=>{const client={auth:{exchangeCodeForSession:mocks.exchange,getUser:mocks.getUser}} as unknown as SupabaseClient;await Promise.all([validateRecoveryLink(client,window.location.href),validateRecoveryLink(client,window.location.href)]);expect(mocks.exchange).toHaveBeenCalledTimes(1)})
it('validates matching strong passwords before updating a verified recovery session',async()=>{
  render(<StrictMode><MemoryRouter><ResetPassword/></MemoryRouter></StrictMode>)
  fireEvent.change(await screen.findByLabelText('New password'),{target:{value:'Synthetic1!'}})
  fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'Mismatch1!'}})
  fireEvent.click(screen.getByRole('button',{name:'Update password'}));expect(await screen.findByRole('alert')).toHaveTextContent('do not match');expect(mocks.update).not.toHaveBeenCalled()
  fireEvent.change(screen.getByLabelText('Confirm new password'),{target:{value:'Synthetic1!'}})
  fireEvent.click(screen.getByRole('button',{name:'Update password'}))
  expect(await screen.findByRole('heading',{name:'Password updated'})).toBeInTheDocument();expect(mocks.update).toHaveBeenCalledWith({password:'Synthetic1!'});expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'})
})
it('uses the current approved origin and a generic recovery response',async()=>{
  render(<MemoryRouter><ForgotPassword/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Registered email'),{target:{value:'QA@example.test'}});fireEvent.click(screen.getByRole('button',{name:'Send reset link'}));await waitFor(()=>expect(mocks.reset).toHaveBeenCalledWith('qa@example.test',{redirectTo:window.location.origin+'/auth/reset-password'}));expect(await screen.findByRole('status')).toHaveTextContent('If an eligible account')
})
