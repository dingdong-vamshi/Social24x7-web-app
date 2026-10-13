import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingFlow } from '../pages/Onboarding'
const mocks=vi.hoisted(()=>({user:{id:'qa-test-user'},load:vi.fn(),save:vi.fn(),refresh:vi.fn()}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:mocks.user,refreshProfile:mocks.refresh})}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({})}))
vi.mock('../auth/onboardingRepository',()=>({getMySellerApplication:mocks.load,getMyCreatorApplication:vi.fn(),getMyProfessionalRequest:vi.fn(),saveCommerceOnboardingDraft:mocks.save,submitSellerApplication:vi.fn(),submitCreatorApplication:vi.fn(),submitProfessionalVerification:vi.fn(),uploadCommerceEvidence:vi.fn()}))
function mount(){return render(<MemoryRouter initialEntries={['/partner/onboarding/seller']}><Routes><Route path="/partner/onboarding/:role" element={<OnboardingFlow/>}/><Route path="/application" element={<div>Current review state</div>}/></Routes></MemoryRouter>)}
beforeEach(()=>{vi.clearAllMocks();mocks.load.mockResolvedValue(null);mocks.save.mockResolvedValue({})})
describe('connected onboarding state',()=>{
  it('loads a submitted application into its status page instead of editable forms',async()=>{mocks.load.mockResolvedValue({status:'submitted'});mount();expect(await screen.findByText('Current review state')).toBeInTheDocument();expect(mocks.save).not.toHaveBeenCalled()})
  it('preserves entered fields and the current step when saving fails',async()=>{
    mount();await screen.findByRole('heading',{name:'Seller type'});fireEvent.click(screen.getByRole('button',{name:/Save & continue/}));await screen.findByRole('heading',{name:'Business'});
    fireEvent.change(screen.getByLabelText(/Legal identity/),{target:{value:'QA Business Owner'}})
    mocks.save.mockRejectedValueOnce(new Error('Network unavailable'))
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    expect(await screen.findByRole('alert')).toHaveTextContent('Network unavailable')
    expect(screen.getByLabelText(/Legal identity/)).toHaveValue('QA Business Owner')
    expect(screen.getByRole('heading',{name:'Business'})).toBeInTheDocument()
  })
  it('persists through the existing draft RPC and restores values after Back',async()=>{
    mount();await screen.findByRole('heading',{name:'Seller type'});fireEvent.click(screen.getByRole('button',{name:/Save & continue/}));await screen.findByRole('heading',{name:'Business'});
    fireEvent.change(screen.getByLabelText(/Legal identity/),{target:{value:'QA Business Owner'}})
    fireEvent.click(screen.getByRole('button',{name:'Back'}));await screen.findByRole('heading',{name:'Seller type'});
    await waitFor(()=>expect(mocks.save).toHaveBeenLastCalledWith({},'seller',expect.objectContaining({legalName:'QA Business Owner',currentStep:0})))
    fireEvent.click(screen.getByRole('button',{name:/Save & continue/}));await screen.findByRole('heading',{name:'Business'});expect(screen.getByLabelText(/Legal identity/)).toHaveValue('QA Business Owner')
  })
})
