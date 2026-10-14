import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Brand } from './Brand'

afterEach(cleanup)

describe('official brand artwork', () => {
  it.each(['icon', 'compact', 'sidebar', 'footer'] as const)('uses the official icon for %s', variant => {
    render(<MemoryRouter><Brand variant={variant}/></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'SOCIAL 24-7 home' })
    expect(link).toHaveAttribute('href', '/')
    expect(link.querySelector('img')).toHaveAttribute('src', '/branding/social24-7-icon-v1.webp')
    expect(link.querySelector('img')).toHaveAttribute('alt', '')
    expect(link.querySelector('svg')).toBeNull()
    expect(link.querySelector('strong') !== null).toBe(variant !== 'icon')
  })

  it('preserves the stacked artwork and avoids a duplicate wordmark', () => {
    render(<MemoryRouter><Brand variant="full"/></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'SOCIAL 24-7 home' })
    expect(link.querySelector('img')).toHaveAttribute('src', '/branding/social24-7-logo-v1.webp')
    expect(link.querySelector('img')).toHaveAttribute('width', '724')
    expect(link.querySelector('img')).toHaveAttribute('height', '680')
    expect(link.querySelector('strong')).toBeNull()
  })

  it('keeps collapsed sidebar branding icon-only', () => {
    render(<MemoryRouter><Brand variant="sidebar" compact/></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'SOCIAL 24-7 home' })).toHaveClass('brand--icon')
  })
})
