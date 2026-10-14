import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
const mocks=vi.hoisted(()=>({signUp:vi.fn(),refreshProfile:vi.fn()}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:null,loading:false,error:null,configured:true,refreshProfile:mocks.refreshProfile})}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({auth:{signUp:mocks.signUp}})}))
import { Register } from '../pages/Auth'
beforeEach(()=>{vi.clearAllMocks();mocks.signUp.mockResolvedValue({data:{user:{identities:[{}]},session:null},error:null})})
it.each(['seller','creator'])('sends the exact %s callback and retains intent on the sign-in link',async role=>{
 render(<MemoryRouter initialEntries={['/partner/register?role='+role]}><Register/></MemoryRouter>)
 for(const [label,value] of [['Display name','Fictional QA'],['Username','fictional_qa'],['Mobile number','+12025550123'],['Email address','qa@example.test'],['Password','NotARealCredential123!'],['Confirm password','NotARealCredential123!']]) fireEvent.change(screen.getByLabelText(label,{exact:true}),{target:{value}})
 fireEvent.click(screen.getByRole('button',{name:'Create account'}))
 await waitFor(()=>expect(mocks.signUp).toHaveBeenCalledTimes(1))
 expect(mocks.signUp.mock.calls[0][0].options.emailRedirectTo).toBe(window.location.origin+'/auth/callback/'+role)
 expect(await screen.findByRole('status')).toHaveTextContent('Check your email')
 expect(screen.getByRole('link',{name:'Sign in'})).toHaveAttribute('href','/partner/login?role='+role)
 expect(mocks.refreshProfile).not.toHaveBeenCalled()
})
