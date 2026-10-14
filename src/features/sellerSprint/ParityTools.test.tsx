import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AffiliateProduct, ReturnPerformance, ReturnSettings } from './ParityTools'
import { TrafficCharts } from './TrafficCharts'
import { SellerStudio } from '../../pages/SellerStudio'
import { productDraftKey } from './parity'
import type { Product } from '../../repositories/commerce'

const api = vi.hoisted(() => ({ setAffiliate: vi.fn(), storefronts: vi.fn(), products: vi.fn(), store: vi.fn(), saveProduct: vi.fn(), addProductImages: vi.fn(), productSeo: vi.fn(), saveProductSeo: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({}) }))
vi.mock('./repository', async original => ({ ...await original<typeof import('./repository')>(), sellerSprintRepository: () => api }))
vi.mock('../../repositories/commerce', async original => ({ ...await original<typeof import('../../repositories/commerce')>(), commerce: api }))
vi.mock('../../repositories/operations', async original => ({ ...await original<typeof import('../../repositories/operations')>(), createOperationsRepository: () => api }))
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'qa-owner' }, access: { seller_status: 'approved' }, loading: false }) }))
vi.mock('../../components/WorkspaceShell', () => ({ WorkspaceShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }))
vi.mock('../../pages/CommerceOperations', () => ({ StoreEditor: () => <p>Store editor</p>, ReturnReview: () => null, FulfillmentEditor: () => null, CounterpartyDirectory: () => null }))

const product = { id: 'product', storefront_id: 'store', title: 'Lamp', price_minor: 10000, currency: 'INR', inventory: 4, status: 'draft', product_approval_status: 'pending', creator_promotion_enabled: true, creator_commission_bps: 500, return_window_days: 7 } as Product
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear()
  api.storefronts.mockResolvedValue([{ id: 'store', name: 'QA Store', verification_status: 'approved' }])
  api.products.mockResolvedValue([product])
  api.store.mockResolvedValue({ support_email: 'support@example.test', support_phone: 'Not public' })
  api.productSeo.mockResolvedValue({ updated_at: 'current' })
  api.saveProductSeo.mockResolvedValue({ updated_at: 'new' })
})
describe('Seller parity UI', () => {
  it('renders accessible analytics chart/data without fabricating a positive empty bar', () => {
    render(<TrafficCharts rows={[{ date: '2026-10-14', views: 0, visitors: 0, orders: 0 }]} paymentMix={[{ label: 'Cash on delivery', value: 0 }]}/>)
    expect(screen.getByRole('img')).toHaveAccessibleName(/Exact values follow/)
    expect(screen.getByText('No qualifying orders in this reporting period.')).toBeInTheDocument()
    expect([...document.querySelectorAll('rect')].every(rect => rect.getAttribute('height') === '0')).toBe(true)
  })
  it('renders return product counts and does not label incomplete values as zero refunds', () => {
    render(<ReturnPerformance rows={[{ id: 'r', order_id: 'o', status: 'approved', reason: 'damaged', details: '', admin_note: null, requested_at: '2026-10-14', product_title: 'Lamp', product_category: 'Home', currency: null, item_subtotal: null }]}/>)
    expect(screen.getByText('Incomplete source data')).toBeInTheDocument()
    expect(screen.getByText(/not an approved refund/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Show fewest returns first' }))
    expect(screen.getByRole('button', { name: 'Show most returns first' })).toBeInTheDocument()
  })
  it('retains affiliate edits and displays server denial without false success', async () => {
    api.setAffiliate.mockRejectedValue(new Error('Permission denied'))
    render(<AffiliateProduct product={product} disabled={false} onSaved={vi.fn()}/>)
    fireEvent.change(screen.getByLabelText('Commission for Lamp (%)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save affiliate settings' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Permission denied'))
    expect(screen.getByLabelText('Commission for Lamp (%)')).toHaveValue(12)
    expect(screen.queryByText('Affiliate settings saved.')).not.toBeInTheDocument()
  })
  it('prevents duplicate affiliate RPCs and confirms only completed saves', async () => {
    let finish!: () => void
    api.setAffiliate.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const saved = vi.fn()
    render(<AffiliateProduct product={product} disabled={false} onSaved={saved}/>)
    const form = screen.getByRole('button', { name: 'Save affiliate settings' }).closest('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    expect(api.setAffiliate).toHaveBeenCalledTimes(1)
    finish()
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('status')).toHaveTextContent('Affiliate settings saved.')
  })
  it('keeps multi-store affiliate controls disabled', () => {
    render(<AffiliateProduct product={product} disabled onSaved={vi.fn()}/>)
    expect(screen.getByRole('button', { name: 'Save affiliate settings' })).toBeDisabled()
    fireEvent.submit(screen.getByRole('button').closest('form')!)
    expect(api.setAffiliate).not.toHaveBeenCalled()
  })
  it('renders actual product windows and existing support fields without new policy writes', async () => {
    render(<MemoryRouter><ReturnSettings storeId="store"/></MemoryRouter>)
    expect(await screen.findByText('7 days')).toBeInTheDocument()
    expect(screen.getByText('support@example.test')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit support details' })).toHaveAttribute('href', '/partner/seller/operations')
    expect(api.setAffiliate).not.toHaveBeenCalled()
  })
  it('loads Add Product deep link and resumes only the current account/store text draft', async () => {
    localStorage.setItem(productDraftKey('qa-owner', 'store'), JSON.stringify({ title: 'My resumed lamp', id: 'injected-id' }))
    const view = render(<MemoryRouter initialEntries={['/partner/seller/products/add']}><SellerStudio/></MemoryRouter>)
    expect(await screen.findByLabelText('Product title')).toHaveValue('My resumed lamp')
    fireEvent.change(screen.getByLabelText('Product title'), { target: { value: 'Edited lamp' } })
    view.unmount()
    render(<MemoryRouter initialEntries={['/partner/seller/products/add']}><SellerStudio/></MemoryRouter>)
    expect(await screen.findByLabelText('Product title')).toHaveValue('Edited lamp')
    expect(api.saveProduct).not.toHaveBeenCalled()
  })
  it('clears the local draft after backend creation even if later media attachment fails', async () => {
    api.saveProduct.mockResolvedValue({ id: 'saved-product' })
    api.addProductImages.mockRejectedValue(new Error('Storage denied'))
    render(<MemoryRouter initialEntries={['/partner/seller/products/add']}><SellerStudio/></MemoryRouter>)
    const title = await screen.findByLabelText('Product title')
    fireEvent.change(title, { target: { value: 'My lamp' } })
    fireEvent.change(screen.getByLabelText(/Add product images/), { target: { files: [new File(['x'], 'image.png', { type: 'image/png' })] } })
    fireEvent.submit(title.closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Product details were saved'))
    expect(localStorage.getItem(productDraftKey('qa-owner', 'store'))).toBeNull()
    expect(screen.getByText(/Product details are saved in your catalog/)).toBeInTheDocument()
  })
  it('persists initial product Brand/Tags/Keywords through the original second metadata step', async () => {
    api.saveProduct.mockResolvedValue({ id: 'saved-product' })
    render(<MemoryRouter initialEntries={['/partner/seller/products/add']}><SellerStudio/></MemoryRouter>)
    const brand = await screen.findByLabelText('Brand')
    fireEvent.change(brand, { target: { value: 'QA Brand' } })
    fireEvent.change(screen.getByLabelText(/Tags/), { target: { value: 'home, light, home' } })
    fireEvent.change(screen.getByLabelText(/Search keywords/), { target: { value: 'desk, reading' } })
    fireEvent.submit(brand.closest('form')!)
    await waitFor(() => expect(api.saveProductSeo).toHaveBeenCalledWith('saved-product', 'store', expect.objectContaining({ brand: 'QA Brand', tags: ['home', 'light'], search_keywords: ['desk', 'reading'], updated_at: 'current' })))
    expect(await screen.findByText('Product saved to your catalog.')).toBeInTheDocument()
  })
  it('reports metadata partial-save precisely and retries the same backend product, never a duplicate', async () => {
    api.saveProduct.mockResolvedValue({ id: 'saved-product' })
    api.saveProductSeo.mockRejectedValue(new Error('Metadata denied'))
    render(<MemoryRouter initialEntries={['/partner/seller/products/add']}><SellerStudio/></MemoryRouter>)
    const brand = await screen.findByLabelText('Brand')
    fireEvent.change(brand, { target: { value: 'Keep this brand' } })
    fireEvent.submit(brand.closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('search metadata could not be confirmed'))
    expect(brand).toHaveValue('Keep this brand')
    expect(screen.queryByText('Product saved to your catalog.')).not.toBeInTheDocument()
    fireEvent.submit(brand.closest('form')!)
    await waitFor(() => expect(api.saveProduct).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'saved-product' })))
  })
  it('preserves original placeholder status instead of presenting a fake campaign action', async () => {
    render(<MemoryRouter initialEntries={['/partner/seller/marketing/campaigns']}><SellerStudio/></MemoryRouter>)
    expect(await screen.findByText(/Coming Soon — this module is also a placeholder/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Create campaign/i })).not.toBeInTheDocument()
  })
})
