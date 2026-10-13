import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '../auth/RequireAuth'
const { state } = vi.hoisted(() => ({ state: { user: null as null | { app_metadata?: Record<string,string>; user_metadata?: Record<string,string> }, loading: false, error: null as string|null, access: null as null | { seller_status: string }, refreshProfile: vi.fn(), signOut: vi.fn() } }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => state }))
function mount() { return render(<MemoryRouter initialEntries={['/partner/seller']}><Routes><Route path="/partner/seller" element={<RequireAuth role="seller"><div>Authorized seller workspace</div></RequireAuth>}/><Route path="/partner/login" element={<div>Real login required</div>}/><Route path="/application" element={<div>Application review</div>}/></Routes></MemoryRouter>) }
beforeEach(() => { state.user=null; state.loading=false; state.error=null; state.access=null })
describe('server-backed workspace guard', () => {
  it('requires authentication on direct deep links', () => { mount(); expect(screen.getByText('Real login required')).toBeInTheDocument() })
  it('ignores user-editable metadata approval', () => { state.user={user_metadata:{seller_status:'approved'}};mount();expect(screen.getByText('Application review')).toBeInTheDocument() })
  it('allows an approved server capability', () => {state.user={};state.access={seller_status:'approved'};mount();expect(screen.getByText('Authorized seller workspace')).toBeInTheDocument()})
  it('fails closed when permissions cannot be loaded', () => {state.user={};state.access={seller_status:'approved'};state.error='Access lookup failed';mount();expect(screen.getByText('Access lookup failed')).toBeInTheDocument();expect(screen.queryByText('Authorized seller workspace')).not.toBeInTheDocument()})
  it('does not mix a business employee work identity with personal/owner access', () => {state.user={app_metadata:{account_type:'business_employee'}};state.access={seller_status:'approved'};mount();expect(screen.queryByText('Authorized seller workspace')).not.toBeInTheDocument();expect(screen.getByText(/Business work identities use/)).toBeInTheDocument()})
})
