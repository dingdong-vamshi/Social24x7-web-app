import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from '../App'
import { requiresProfessionalVerification } from '../domain/creator-policy'
import { repositories } from '../repositories/mock'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>)

describe('routing and role branching', () => {
  it('renders the partner landing entry', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /Grow your business with Social 24x7/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Start selling/i }).length).toBeGreaterThan(0)
  })

  it('routes seller and creator navigation independently', async () => {
    const seller = renderAt('/seller')
    expect(await screen.findByRole('navigation', { name: 'seller workspace' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Products/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Discover products/ })).not.toBeInTheDocument()
    seller.unmount()

    renderAt('/creator')
    expect(await screen.findByRole('navigation', { name: 'creator workspace' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Discover products/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Orders$/ })).not.toBeInTheDocument()
  })

  it('deep routes remain renderable', async () => {
    renderAt('/seller/finance')
    expect(await screen.findByRole('heading', { name: 'Finance' })).toBeInTheDocument()
    expect(screen.getByText(/7-day settlement ledger/i)).toBeInTheDocument()
  })

  it('routes overview recommendations to the relevant seller workspace', async () => {
    const user = userEvent.setup()
    renderAt('/seller')
    await user.click(await screen.findByRole('link', { name: /Review health/ }))
    expect(await screen.findByRole('heading', { name: 'Account health' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Review' }))
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
  })

  it('labels disconnected workspace controls with specific preview feedback', async () => {
    const user = userEvent.setup()
    renderAt('/seller')
    await user.click(await screen.findByRole('button', { name: 'Switch workspace' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Workspace switching is not connected/)
  })
})

describe('workspace interactions', () => {
  it('filters and selects seller products locally', async () => {
    const user = userEvent.setup()
    renderAt('/seller/products')
    expect(await screen.findByText('Everyday Linen Shirt')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Search product, SKU, or category' }), 'Desk Focus')
    expect(screen.queryByText('Everyday Linen Shirt')).not.toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select Desk Focus Lamp' }))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bulk edit' })).toBeEnabled()
  })

  it('uses seller order tabs as real local filters', async () => {
    const user = userEvent.setup()
    renderAt('/seller/orders')
    expect(await screen.findByText('S24-845291')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Completed/ }))
    expect(screen.getByText('S24-844901')).toBeInTheDocument()
    expect(screen.queryByText('S24-845291')).not.toBeInTheDocument()
  })

  it('shows a useful empty state for creator discovery filters', async () => {
    const user = userEvent.setup()
    renderAt('/creator/discover')
    await screen.findByText('Everyday Linen Shirt')
    await user.type(screen.getByRole('textbox', { name: 'Search products or sellers' }), 'No such seller')
    expect(screen.getByRole('heading', { name: 'No matching products' })).toBeInTheDocument()
  })

  it('uses creator promotion tabs as real local filters', async () => {
    const user = userEvent.setup()
    renderAt('/creator/promotions')
    expect(await screen.findByText('Everyday Linen Shirt')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Completed/ }))
    expect(screen.getByText('Botanical Face Serum')).toBeInTheDocument()
    expect(screen.queryByText('Everyday Linen Shirt')).not.toBeInTheDocument()
  })

  it('renders catalog loading, empty, and error states through the repository boundary', async () => {
    const empty = vi.spyOn(repositories.sellerCatalog, 'list').mockResolvedValueOnce([])
    const emptyView = renderAt('/seller/products')
    expect(screen.getByText('Loading business data…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'No products yet' })).toBeInTheDocument()
    emptyView.unmount()
    empty.mockRestore()

    const failed = vi.spyOn(repositories.sellerCatalog, 'list').mockRejectedValueOnce(new Error('Fixture unavailable'))
    renderAt('/seller/products')
    expect(await screen.findByRole('heading', { name: 'Unable to load this view' })).toBeInTheDocument()
    expect(screen.getByText('Fixture unavailable')).toBeInTheDocument()
    failed.mockRestore()
  })
})

describe('onboarding', () => {
  it('validates and advances seller onboarding', async () => {
    const user = userEvent.setup()
    renderAt('/onboarding/seller')
    expect(screen.getByRole('heading', { name: 'Representative' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Save & continue/ }))
    expect(screen.getByRole('alert')).toHaveTextContent('Representative name')
    await user.type(screen.getByLabelText(/Representative name/), 'Arjun Rao')
    await user.type(screen.getByLabelText(/Business email/), 'arjun@example.com')
    await user.type(screen.getByLabelText(/Phone number/), '+91 9876543210')
    await user.click(screen.getByRole('button', { name: /Save & continue/ }))
    expect(await screen.findByRole('heading', { name: 'Business information' })).toBeInTheDocument()
  })

  it('preserves seller values when navigating back and forward', async () => {
    const user = userEvent.setup()
    renderAt('/onboarding/seller')
    await user.type(screen.getByLabelText(/Representative name/), 'Aarav QA')
    await user.type(screen.getByLabelText(/Business email/), 'aarav.qa@example.com')
    await user.type(screen.getByLabelText(/Phone number/), '+91 9000000001')
    await user.click(screen.getByRole('button', { name: /Save & continue/ }))
    expect(await screen.findByRole('heading', { name: 'Business information' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Back/ }))
    expect(screen.getByLabelText(/Representative name/)).toHaveValue('Aarav QA')
  })

  it('uses conditional professional creator rules', () => {
    expect(requiresProfessionalVerification('Content Creator')).toBe(false)
    expect(requiresProfessionalVerification('Doctor')).toBe(true)
    expect(requiresProfessionalVerification('Legal Consultation')).toBe(true)
  })

  it('shows approved workspace fixture from application status', async () => {
    const user = userEvent.setup()
    renderAt('/application?role=creator')
    await user.click(await screen.findByRole('button', { name: /Preview approved status/ }))
    expect(await screen.findByText('Approved')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Open Creator Center/ }))
    expect(await screen.findByRole('heading', { name: /Good morning, Maya/ })).toBeInTheDocument()
  })
})

describe('mock repositories', () => {
  it('rejects invalid local OTP and accepts the documented mock OTP', async () => {
    const { challengeId } = await repositories.auth.requestOtp('+91 98765 43210')
    await expect(repositories.auth.verifyOtp(challengeId, '111111')).rejects.toThrow(/246810/)
    await expect(repositories.auth.verifyOtp(challengeId, '246810')).resolves.toMatchObject({ role: 'seller' })
  })

  it('returns isolated typed fixtures', async () => {
    const first = await repositories.sellerCatalog.list()
    const second = await repositories.sellerCatalog.list()
    first[0].title = 'Changed in test'
    expect(second[0].title).toBe('Everyday Linen Shirt')
  })

  it('persists a submitted application locally', async () => {
    await repositories.creatorOnboarding.save(0, { creatorName: 'Maya Kapoor' })
    const submitted = await repositories.creatorOnboarding.submit()
    const restored = await repositories.applications.get('creator')
    expect(submitted.status).toBe('under_review')
    expect(restored.id).toBe(submitted.id)
  })

  it('keeps a created promotion inside the local mock repository', async () => {
    window.localStorage.removeItem('social24:creator:promotions')
    const created = await repositories.creatorPromotions.create('PRD-2048')
    const restored = await repositories.creatorPromotions.list()
    expect(restored[0]).toMatchObject({ id: created.id, productTitle: 'Everyday Linen Shirt', clicks: 0 })
  })
})
