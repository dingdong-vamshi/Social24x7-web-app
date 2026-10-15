import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DeleteSocialContent } from '../features/social/DeleteSocialContent'

describe('confirmed own-content deletion', () => {
  it.each(['post', 'comment', 'story'] as const)('never deletes a %s on menu opening or cancellation', kind => {
    const remove = vi.fn(), removed = vi.fn()
    render(<DeleteSocialContent kind={kind} remove={remove} removed={removed}/>)
    fireEvent.click(screen.getByRole('button', { name: `Delete ${kind}` }))
    expect(screen.getByRole('dialog', { name: `Delete ${kind}?` })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(remove).not.toHaveBeenCalled(); expect(removed).not.toHaveBeenCalled()
  })
  it('preserves failure, then confirms success only after an acknowledged mutation', async () => {
    const remove = vi.fn().mockRejectedValueOnce(new Error('Ownership denied')).mockResolvedValue(undefined), removed = vi.fn()
    render(<DeleteSocialContent kind="post" remove={remove} removed={removed}/>)
    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }))
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete post' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Ownership denied'); expect(removed).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Permanently delete post' }))
    await waitFor(() => expect(removed).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
