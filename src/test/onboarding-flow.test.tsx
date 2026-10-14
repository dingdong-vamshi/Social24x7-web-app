import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { OnboardingFlow } from '../pages/Onboarding'
const mocks=vi.hoisted(()=>({user:{id:'qa-test-user'},load:vi.fn(),save:vi.fn(),refresh:vi.fn()}))
vi.mock('../auth/AuthContext',()=>({useAuth:()=>({user:mocks.user,refreshProfile:mocks.refresh})}))
vi.mock('../lib/supabase',()=>({requireSupabase:()=>({})}))
vi.mock('../auth/onboardingRepository',()=>({getMySellerApplication:mocks.load,getMyCreatorApplication:mocks.load,getMyProfessionalRequest:vi.fn(),saveCommerceOnboardingDraft:mocks.save,submitSellerApplication:vi.fn(),submitCreatorApplication:vi.fn(),submitProfessionalVerification:vi.fn(),uploadCommerceEvidence:vi.fn()}))
function mount(role='seller'){return render(<MemoryRouter initialEntries={['/partner/onboarding/'+role]}><Routes><Route path="/partner/onboarding/:role" element={<OnboardingFlow/>}/><Route path="/application" element={<div>Current review state</div>}/></Routes></MemoryRouter>)}
beforeEach(()=>{vi.clearAllMocks();mocks.load.mockResolvedValue(null);mocks.save.mockResolvedValue({})})
describe('connected onboarding state',()=>{
  it.each(['seller','creator'])('saves and resumes %s LinkedIn through the existing account draft contract',async(role)=>{
    const linkedIn='https://www.linkedin.com/'+(role==='seller'?'company':'in')+'/synthetic'
    let stored:Record<string,unknown>={currentStep:role==='seller'?4:1}
    mocks.load.mockImplementation(async()=>({status:'draft',applicationPayload:stored,...(role==='creator'?{socialHandles:stored.socialHandles}: {})}))
    mocks.save.mockImplementation(async(_client,_role,payload)=>{stored=payload;return payload})
    const first=mount(role)
    if(role==='creator')fireEvent.click(await screen.findByLabelText('LinkedIn'))
    const input=await screen.findByLabelText(role==='seller'?'LinkedIn':'LinkedIn profile URL')
    expect(input).toHaveProperty('required',role==='creator')
    fireEvent.change(input,{target:{value:linkedIn}})
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith({},role,expect.objectContaining({linkedin:linkedIn,socialHandles:expect.objectContaining({linkedin:linkedIn})})))
    first.unmount();mount(role)
    expect(await screen.findByLabelText(role==='seller'?'LinkedIn':'LinkedIn profile URL')).toHaveValue(linkedIn)
  })
  it.each(['seller','creator'])('restores nested-only %s social links and displays them on Review',async(role)=>{
    const linkedin='https://linkedin.com/company/synthetic'
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:role==='seller'?5:3,socialHandles:{linkedin}}})
    mount(role)
    expect(await screen.findByText(linkedin)).toBeInTheDocument()
    expect(screen.getByText('Verification requires Admin review')).toBeInTheDocument()
  })
  it('renders all four requested Creator URLs only when selected, reports LinkedIn errors and clears deselected data on save',async()=>{
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:1}});mount('creator')
    await screen.findByRole('heading',{name:'Social presence'})
    for(const label of ['LinkedIn','Instagram','Facebook','TikTok']){
      expect(screen.queryByLabelText(label+' profile URL')).not.toBeInTheDocument()
      fireEvent.click(screen.getByLabelText(label));expect(screen.getByLabelText(label+' profile URL')).toBeRequired()
    }
    const input=screen.getByLabelText('LinkedIn profile URL')
    fireEvent.change(input,{target:{value:'https://linkedin.com.evil.test/in/synthetic'}});fireEvent.blur(input)
    expect(screen.getByRole('alert')).toHaveTextContent('official LinkedIn URL')
    expect(input).toHaveAttribute('aria-invalid','true')
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    expect(await screen.findByText('Use an official LinkedIn URL.',{selector:'.form-error'})).toBeInTheDocument()
    expect(mocks.save).not.toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('LinkedIn'));expect(screen.queryByLabelText('LinkedIn profile URL')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}))
    await waitFor(()=>expect(mocks.save).toHaveBeenLastCalledWith({},'creator',expect.objectContaining({linkedin:'',socialHandles:expect.objectContaining({linkedin:''})})))
  })
  it('reviews only selected Creator links and masks the normalized PAN',async()=>{
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:4,panNumber:'abcde1234f',selectedPlatforms:['youtube'],youtube:'https://youtube.com/@synthetic',instagram:'https://instagram.com/removed'}})
    mount('creator');await screen.findByText('Verification requires Admin review')
    expect(screen.getByText('https://youtube.com/@synthetic')).toBeInTheDocument()
    expect(screen.queryByText('https://instagram.com/removed')).not.toBeInTheDocument()
    expect(screen.getByText(/••••••234F/)).toBeInTheDocument()
    expect(screen.queryByText('ABCDE1234F')).not.toBeInTheDocument()
  })
  it('normalizes PAN and trade fields while preserving legal casing in a saved draft',async()=>{
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:1,sellerType:'non_gst'}});mount();await screen.findByRole('heading',{name:'Business'});
    fireEvent.change(screen.getByLabelText(/Legal identity/),{target:{value:'Exact LEGAL LLC'}})
    fireEvent.change(screen.getByLabelText(/Trade \/ business/),{target:{value:'rOHAN TEST BUSINESS'}});fireEvent.blur(screen.getByLabelText(/Trade \/ business/))
    fireEvent.change(screen.getByLabelText(/^PAN/),{target:{value:'abcde1234f'}})
    expect(screen.getByLabelText(/^PAN/)).toHaveValue('ABCDE1234F')
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith({},'seller',expect.objectContaining({legalName:'Exact LEGAL LLC',businessName:'Rohan Test Business',panNumber:'ABCDE1234F'})))
  })
  it('persists optional Seller verification links in the authoritative draft payload',async()=>{
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:4}});mount();await screen.findByLabelText('Business website')
    fireEvent.change(screen.getByLabelText('Business website'),{target:{value:'example.com'}});fireEvent.blur(screen.getByLabelText('Business website'))
    fireEvent.change(screen.getByLabelText('Instagram'),{target:{value:'instagram.com/synthetic'}})
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith({},'seller',expect.objectContaining({socialHandles:expect.objectContaining({website:'https://example.com/',instagram:'https://instagram.com/synthetic',facebook:''})})))
  })
  it('conditionally collects Creator URLs and preserves the self-declared Mid tier',async()=>{
    mocks.load.mockResolvedValue({status:'draft',applicationPayload:{currentStep:1}});mount('creator');await screen.findByRole('heading',{name:'Social presence'})
    expect(screen.queryByLabelText('Instagram profile URL')).not.toBeInTheDocument();fireEvent.click(screen.getByLabelText('Instagram'))
    fireEvent.change(screen.getByLabelText('Instagram profile URL'),{target:{value:'instagram.com/synthetic'}})
    fireEvent.change(screen.getByLabelText('Audience tier (self-declared)'),{target:{value:'Mid'}})
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await waitFor(()=>expect(mocks.save).toHaveBeenCalledWith({},'creator',expect.objectContaining({audienceTier:'Mid',selectedPlatforms:['instagram'],socialHandles:expect.objectContaining({instagram:'https://instagram.com/synthetic'})})))
    fireEvent.click(screen.getByLabelText('Instagram'));expect(screen.queryByLabelText('Instagram profile URL')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Save draft'}));await waitFor(()=>expect(mocks.save).toHaveBeenLastCalledWith({},'creator',expect.objectContaining({socialHandles:expect.objectContaining({instagram:''})})))
  })
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
