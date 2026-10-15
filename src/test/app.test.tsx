import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
const account = vi.hoisted(() => ({ user: null, profile: null, access: null, storefronts: [], loading: false, error: null, configured: true, refreshProfile: vi.fn(), signOut: vi.fn() }))
vi.mock('../auth/AuthContext', () => ({ AuthProvider: ({children}:{children:ReactNode})=>children, useAuth:()=>account }))
vi.mock('../lib/supabase', () => ({ supabase: null, supabaseConfigured: true, requireSupabase: ()=>{throw new Error('Network access is forbidden in this route test')} }))
import App from '../App'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>)
beforeEach(()=>{vi.spyOn(window,'scrollTo').mockImplementation(()=>{})})

describe('public navigation and real-account boundaries',()=>{
  it('renders the new independent commerce design and client-approved name',()=>{
    renderAt('/')
    expect(screen.getByRole('heading',{name:/Your next chapter\s*starts with a connection/})).toBeInTheDocument()
    expect(screen.getByRole('navigation',{name:'Main navigation'})).toBeInTheDocument()
    expect(screen.getByRole('link',{name:/^Start selling/})).toHaveAttribute('href','/partner/register?role=seller')
    expect(screen.queryByText(/₹18.6k/)).not.toBeInTheDocument()
  })
  it('opens keyboard-accessible navigation and routes to truthful Partner information',async()=>{
    const user=userEvent.setup();renderAt('/')
    await user.click(screen.getByRole('button',{name:'Open navigation'}))
    expect(screen.getByRole('button',{name:'Close navigation'})).toHaveAttribute('aria-expanded','true')
    await user.click(screen.getByRole('link',{name:'Partner'}))
    expect(screen.getByText(/separate agency or service-provider registration program is not currently available/)).toBeInTheDocument()
  })
  it('expands a useful onboarding FAQ',async()=>{
    const user=userEvent.setup();renderAt('/')
    const question=screen.getByText('What happens after I apply?')
    await user.click(question)
    expect(question.closest('details')).toHaveAttribute('open')
  })
  it.each(['/partner/seller/products','/seller/finance','/partner/creator/earnings','/creator/discover','/onboarding/seller','/application?role=creator'])('protects %s from anonymous access',async(path)=>{
    renderAt(path)
    expect(await screen.findByRole('heading',{name:/Welcome back|Sign in to your Seller account/})).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:/Preview approved/})).not.toBeInTheDocument()
  })
  it.each(['/web','/web/app/chats'])('offers password login separately while refusing forged QR state at %s',async(path)=>{
    localStorage.setItem('customer-paired','true')
    renderAt(path)
    expect(await screen.findByRole('link',{name:/Log in with your account/})).toHaveAttribute('href','/web/login')
    await userEvent.click(screen.getByRole('button',{name:'View QR linking options'}))
    expect(screen.getByRole('heading',{name:'QR linking cannot be completed yet'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:/Generate pairing QR/})).toBeDisabled()
  })
  it.each(['/web/login','/web/chats','/web/chat/00000000-0000-0000-0000-000000000000','/web/orders'])('requires authoritative account auth at %s',async(path)=>{
    localStorage.setItem('customer-paired','true')
    renderAt(path)
    expect(await screen.findByLabelText('Password')).toBeInTheDocument()
    expect(screen.queryByRole('log',{name:'Messages'})).not.toBeInTheDocument()
  })
  it('does not accept a forged local preview approval',async()=>{
    localStorage.setItem('social24:session',JSON.stringify({role:'seller',applicationStatus:'approved'}))
    renderAt('/seller?approved=true')
    expect(await screen.findByRole('heading',{name:/Welcome back|Sign in to your Seller account/})).toBeInTheDocument()
  })
  it('exposes genuine registration inputs and no unsupported SMS or OAuth buttons',()=>{
    renderAt('/partner/register')
    expect(screen.getByRole('heading',{name:'Create your account'})).toBeInTheDocument()
    expect(screen.getByLabelText(/Mobile number/)).toBeInTheDocument()
    expect(screen.getByText(/A special character/)).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:/Google|Apple|Send OTP/})).not.toBeInTheDocument()
  })
  it('shows a recoverable missing-page state',()=>{
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading',{name:'Let’s find your way back.'})).toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Go to homepage'})).toHaveAttribute('href','/')
  })
})
