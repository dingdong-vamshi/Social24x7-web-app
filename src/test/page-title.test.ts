import { describe, expect, it } from 'vitest'
import { pageTitle } from '../lib/pageTitle'
describe('page titles match the current journey', () => {
  it.each([
    ['/partner/forgot-password', 'Forgot password'],
    ['/auth/reset-password', 'Reset password'],
    ['/auth/callback/seller', 'Account confirmation'],
    ['/auth/callback/creator', 'Account confirmation'],
    ['/partner/register', 'Create your account'],
    ['/partner/login', 'Sign in'],
    ['/application', 'Application status'],
    ['/partner/application', 'Application status'],
    ['/partner/onboarding/seller', 'Seller application'],
    ['/partner/onboarding/creator', 'Creator application'],
    ['/partner', 'Partner Web'],
    ['/partner/seller/products', 'Seller Studio'],
    ['/partner/creator', 'Creator Center'],
    ['/partner/admin', 'Admin Dashboard'],
    ['/web', 'Customer web'],
  ])('%s', (path, title) => expect(pageTitle(path)).toBe(title))
})
