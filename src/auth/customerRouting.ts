import { safeNext } from './routing'

/** A seller/admin entitlement must never make Customer login land in Partner. */
export function customerDestination(requested: string | null) {
  const next = safeNext(requested, '/account/social')
  return /^\/account(?:[/?#]|$)/.test(next) ? next : '/account/social'
}
