import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BusinessLogin, BusinessWork } from '../pages/BusinessWork'
const m=vi.hoisted(()=>({invoke:vi.fn(),user:null as null|{id:string;app_metadata:Record<string,string>}}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({functions:{invoke:m.invoke}})}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:m.user,loading:false})}))
beforeEach(()=>{vi.clearAllMocks();m.user=null})
describe('work activation UI',()=>{
 function mount(){render(<MemoryRouter><BusinessLogin activate/></MemoryRouter>)}
 function fill(password='FixtureOnly-ABC123'){fireEvent.change(screen.getByLabelText('Business login ID'),{target:{value:'qa.agent'}});fireEvent.change(screen.getByLabelText('One-time activation code'),{target:{value:'FIXTURE'}});fireEvent.change(screen.getByLabelText('Create password'),{target:{value:password}});fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:password}});fireEvent.click(screen.getByRole('button',{name:'Create work password'}))}
 it('retains input and surfaces server rejection',async()=>{m.invoke.mockResolvedValue({data:null,error:new Error('Code expired')});mount();fill();expect(await screen.findByRole('alert')).toHaveTextContent('Code expired');expect(screen.getByLabelText('Business login ID')).toHaveValue('qa.agent')})
 it('clears secrets after activation without claiming approval',async()=>{m.invoke.mockResolvedValue({data:{activated:true},error:null});mount();fill();expect(await screen.findByText(/Owner approval is still required/)).toBeInTheDocument();expect(screen.queryByLabelText('Create password')).not.toBeInTheDocument();await waitFor(()=>expect(m.invoke).toHaveBeenCalledWith('business-work-auth',expect.objectContaining({body:expect.objectContaining({loginId:'qa.agent'})})))})
 it('rejects weak passwords without invoking activation',async()=>{mount();fill('short');expect(await screen.findByRole('alert')).toHaveTextContent('10–128');expect(m.invoke).not.toHaveBeenCalled()})
 it('does not let a personal owner impersonate work identity',()=>{m.user={id:'owner',app_metadata:{}};render(<MemoryRouter><BusinessWork/></MemoryRouter>);expect(screen.getByText('Work identity required')).toBeInTheDocument();expect(m.invoke).not.toHaveBeenCalled()})
})
