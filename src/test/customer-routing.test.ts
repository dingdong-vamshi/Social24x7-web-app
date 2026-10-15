import { describe, expect, it } from 'vitest'
import { customerDestination } from '../auth/customerRouting'

describe('Customer login stays in the consumer surface regardless of business entitlement', () => {
  it.each([null, '/partner/seller', '/partner/creator', '/admin', '//evil.test', 'https://evil.test', '/accounting'])('defaults safely for %s', value => {
    expect(customerDestination(value)).toBe('/account/social')
  })
  it.each(['/account/social', '/account/chat/123', '/account/orders?status=paid', '/account'])('preserves a consumer deep link: %s', value => {
    expect(customerDestination(value)).toBe(value)
  })
})
