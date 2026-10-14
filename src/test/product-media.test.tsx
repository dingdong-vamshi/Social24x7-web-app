import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductMediaEditor } from '../pages/ProductMediaEditor'
import type { Product } from '../repositories/commerce'
const m=vi.hoisted(()=>({save:vi.fn()}))
vi.mock('../repositories/commerce',()=>({commerce:{arrangeProductImages:m.save}}))
const product={id:'p',product_media:[{path:'a',position:0,storage_bucket:'product-media',original_filename:'First.jpg'},{path:'b',position:1,storage_bucket:'product-media',original_filename:'Second.jpg'}]} as Product
beforeEach(()=>{vi.clearAllMocks();m.save.mockResolvedValue(undefined)})
describe('product image controls',()=>{
 it('keeps changes local until explicit confirmation',async()=>{const saved=vi.fn();render(<ProductMediaEditor product={product} onSaved={saved}/>);fireEvent.click(screen.getByRole('button',{name:'Move image 2 earlier'}));expect(m.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Review image changes'}));expect(m.save).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Confirm image changes'}));await waitFor(()=>expect(saved).toHaveBeenCalled());expect(m.save).toHaveBeenCalledWith('p',['b','a'],['a','b'])})
 it('preserves at least one image and resets unsaved removal',()=>{render(<ProductMediaEditor product={product} onSaved={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Remove image 2'}));expect(screen.getByRole('button',{name:'Remove image 1'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'Reset image changes'}));expect(screen.getByRole('button',{name:'Remove image 2'})).toBeEnabled();expect(m.save).not.toHaveBeenCalled()})
 it('retains the editor after a rejected save',async()=>{m.save.mockRejectedValue(new Error('Image list changed'));render(<ProductMediaEditor product={product} onSaved={vi.fn()}/>);fireEvent.click(screen.getByRole('button',{name:'Review image changes'}));fireEvent.click(screen.getByRole('button',{name:'Confirm image changes'}));expect(await screen.findByRole('alert')).toHaveTextContent('Image list changed');expect(screen.getByText('First.jpg · Cover')).toBeInTheDocument()})
})
