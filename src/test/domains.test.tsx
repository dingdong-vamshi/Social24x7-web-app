import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { hostRedirect, hostSurface, origins, surfaceHref } from '../lib/domains'
import { confirmationUrl } from '../auth/routing'
import { SurfaceLink } from '../components/SurfaceLink'

describe('official surface routing', () => {
  it.each([
    ['www.social24-7.com', '/', null],
    ['partner.social24-7.com', '/', '/partner'],
    ['web.social24-7.com', '/', '/web'],
    ['web.social24-7.com', '/web', null],
    ['social24x7-web-app.vercel.app', '/partner/seller/products', null],
    ['social24x7-web-app.vercel.app', '/partner/register?role=creator&code=secret', origins.partner + '/partner/register?role=creator'],
    ['social24x7-web-app.vercel.app', '/partner/forgot-password?role=seller#secret', origins.partner + '/partner/forgot-password?role=seller'],
    ['localhost', '/partner/seller/products', null],
    ['social24-7.com', '/', null],
    ['www.social24-7.com', '/partner/register?role=seller', origins.partner + '/partner/register?role=seller'],
    ['www.social24-7.com', '/partner/register?role=creator', origins.partner + '/partner/register?role=creator'],
    ['www.social24-7.com', '/partner/seller/products/qa-product', origins.partner + '/partner/seller/products/qa-product'],
    ['partner.social24-7.com', '/account/social', null],
    ['partner.social24-7.com', '/partner/seller/social', null],
    ['partner.social24-7.com', '/web', origins.customer + '/web'],
    ['partner.social24-7.com', '/info/about', origins.public + '/info/about'],
    ['web.social24-7.com', '/account/chats', '/web'],
    ['web.social24-7.com', '/web/chat/qa-conversation', '/web'],
    ['web.social24-7.com', '/web/login', '/web'],
    ['web.social24-7.com', '/web/app/feed', '/web'],
    ['www.social24-7.com', '/auth/callback/seller?code=secret#access_token=secret', origins.partner + '/partner/login?role=seller'],
    ['web.social24-7.com', '/auth/callback/creator?code=secret', origins.partner + '/partner/login?role=creator'],
    ['partner.social24-7.com', '/auth/callback/seller?code=secret', null],
  ])('%s %s resolves safely', (host, path, target) => expect(hostRedirect(host, path)).toBe(target))
  it('does not forward credentials, hashes or nested query parameters', () => {
    expect(surfaceHref('/partner/login?role=seller&code=secret&access_token=secret&next=%2Faccount%3Ftoken%3Dsecret#secret', 'www.social24-7.com')).toBe(origins.partner + '/partner/login?role=seller')
    expect(surfaceHref('/partner/login?next=%2Fpartner%2Fadmin', 'www.social24-7.com')).toBe(origins.partner + '/partner/login?next=%2Fpartner%2Fadmin')
  })
  it('keeps preview paths and does not claim unrelated hosts', () => {
    expect(surfaceHref('/partner/login?role=seller', 'social24x7-web-app.vercel.app')).toBe('/partner/login?role=seller')
    expect(hostSurface('social24-7.in')).toBe('preview')
  })
  it.each(['seller', 'creator', null] as const)('allows official callback for %s', role => {
    expect(confirmationUrl(origins.partner, role)).toBe(origins.partner + '/auth/callback/' + (role || 'partner'))
  })
  it.each([origins.public, origins.customer, 'https://partner.social24-7.com.evil.example', 'https://partner.social24-7.com/path', 'http://partner.social24-7.com'])('rejects non-Partner Auth origin %s', origin => expect(() => confirmationUrl(origin, 'seller')).toThrow())
  it('retains accessible link semantics on local previews', () => {
    render(<MemoryRouter><SurfaceLink to="/partner/register?role=seller">Seller</SurfaceLink></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Seller' })).toHaveAttribute('href', '/partner/register?role=seller')
  })
})
