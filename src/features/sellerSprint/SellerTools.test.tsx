import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { OrderRangeFilters, PackingUpload, ProductSeoEditor } from './SellerTools'

const api = vi.hoisted(() => ({ productSeo: vi.fn(), saveProductSeo: vi.fn(), uploadPacking: vi.fn() }))
vi.mock('../../lib/supabase', () => ({ requireSupabase: () => ({}) }))
vi.mock('./repository', async importOriginal => ({ ...await importOriginal<typeof import('./repository')>(), sellerSprintRepository: () => api }))

describe('Seller sprint forms', () => {
  it('retains filters after invalid value range and applies only valid filters', () => {
    const onApply = vi.fn(); render(<OrderRangeFilters onApply={onApply}/>)
    fireEvent.change(screen.getByLabelText('Minimum order value'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply date and value filters', hidden: true }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a currency')
    expect(screen.getByLabelText('Minimum order value')).toHaveValue(10)
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText(/Order currency/), { target: { value: 'INR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply date and value filters', hidden: true }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ currency: 'INR', minimum: '10' }))
  })
  it('retains edited SEO fields when the server rejects the save', async () => {
    api.productSeo.mockResolvedValue({ brand: '', tags: [], search_keywords: [], seo_title: 'Original', seo_description: '', llm_summary: '', updated_at: 'version' })
    api.saveProductSeo.mockRejectedValue(new Error('Permission denied'))
    render(<ProductSeoEditor productId="product" storeId="store"/>)
    const title = await screen.findByLabelText('Product search title')
    fireEvent.change(title, { target: { value: 'Edited title' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save product search metadata' }))
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Permission denied'))
    expect(title).toHaveValue('Edited title')
    expect(screen.queryByText('Product search metadata saved.')).not.toBeInTheDocument()
  })
  it('does not claim success or reset the selected packing file after upload denial', async () => {
    api.uploadPacking.mockRejectedValue(new Error('Seller access required'))
    render(<PackingUpload orderId="order" onSaved={vi.fn()}/>)
    await userEvent.upload(screen.getByLabelText(/Packing evidence file/), new File(['x'], 'packing.png', { type: 'image/png' }))
    fireEvent.submit(screen.getByLabelText(/Packing evidence file/).closest('form')!)
    await waitFor(() => expect(screen.getByRole('alert', { hidden: true })).toHaveTextContent('Seller access required'))
    expect(screen.getByRole('button', { name: 'Upload packing evidence', hidden: true })).not.toBeDisabled()
  })
})
