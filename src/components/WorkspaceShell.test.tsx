import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WorkspaceShell } from './WorkspaceShell'
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ profile: { id: 'qa', display_name: 'QA' }, access: { seller_status: 'approved', creator_status: 'approved' } }) }))
vi.mock('./AccountMenu', () => ({ AccountMenu: () => null }))
vi.mock('../pages/Social', () => ({ WorkspaceNotifications: () => <button>Notifications</button> }))
beforeEach(() => localStorage.clear())
describe('original-depth workspace navigation', () => {
  it('opens an already-expanded group with one click from collapsed navigation', async () => {
    render(<MemoryRouter initialEntries={['/partner/seller/returns']}><WorkspaceShell role="seller">QA</WorkspaceShell></MemoryRouter>)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse navigation' }))
    expect(screen.getByRole('button', { name: 'Orders submenu' })).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'Orders submenu' }))
    expect(screen.getByRole('link', { name: 'Manage Returns' })).toBeVisible()
  })
  it('expands Orders for a return deep link and remembers toggles', async () => {
    render(<MemoryRouter initialEntries={['/partner/seller/returns']}><WorkspaceShell role="seller">QA</WorkspaceShell></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Orders submenu' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Manage Returns' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Return Settings' })).toHaveAttribute('href', '/partner/seller/orders/return-settings')
    await userEvent.click(screen.getByRole('button', { name: 'Orders submenu' }))
    expect(screen.queryByRole('link', { name: 'Manage Returns' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('social24.navigation.seller.qa')!)).toEqual({ '/partner/seller/orders': false })
  })
  it('keeps Social directly after Business Chat and labels original Soon items', async () => {
    render(<MemoryRouter><WorkspaceShell role="seller">QA</WorkspaceShell></MemoryRouter>)
    const links = screen.getAllByRole('link').map(link => link.textContent)
    expect(links[links.indexOf('Business Chat') + 1]).toBe('Social')
    expect(links[links.indexOf('Social') + 1]).toBe('Team & verification')
    await userEvent.click(screen.getByRole('button', { name: 'Products submenu' }))
    expect(screen.getByRole('link', { name: 'Product Ratings Soon' })).toHaveAttribute('href', '/partner/seller/products/ratings')
  })
  it('gives Creators direct Social, collaboration and payment-status access', () => {
    render(<MemoryRouter><WorkspaceShell role="creator">QA</WorkspaceShell></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Social' })).toHaveAttribute('href', '/partner/creator/social')
    expect(screen.getByRole('link', { name: 'Collaborations' })).toHaveAttribute('href', '/partner/creator/collab')
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/partner/creator/payments')
  })
})
