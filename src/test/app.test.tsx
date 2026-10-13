import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { requiresProfessionalVerification } from '../domain/creator-policy'
import { repositories } from '../repositories/mock'

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>)

describe('routing and role branching', () => {
  it('renders the partner landing entry', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: /Grow your business with Social24/i })).toBeInTheDocument()
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

  it('uses conditional professional creator rules', () => {
    expect(requiresProfessionalVerification('Content Creator')).toBe(false)
    expect(requiresProfessionalVerification('Doctor')).toBe(true)
    expect(requiresProfessionalVerification('Legal Consultation')).toBe(true)
  })

  it('shows approved workspace fixture from application status', async () => {
    const user = userEvent.setup()
    renderAt('/application?role=creator')
    const button = await screen.findByRole('button', { name: /Open Creator Center/ })
    await user.click(button)
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
})
