/** One application, three first-party surfaces. This is navigation, not authorization. */
export const origins = {
  public: 'https://www.social24-7.com',
  partner: 'https://partner.social24-7.com',
  customer: 'https://web.social24-7.com',
  preview: 'https://social24x7-web-app.vercel.app',
} as const
export type Surface = 'public' | 'partner' | 'customer' | 'preview'
export function hostSurface(hostname: string): Surface {
  if (hostname === 'www.social24-7.com') return 'public'
  if (hostname === 'partner.social24-7.com') return 'partner'
  if (hostname === 'web.social24-7.com') return 'customer'
  // Apex redirect belongs to Vercel. Local and Vercel previews keep path routing.
  return 'preview'
}
export function pathSurface(pathname: string): Exclude<Surface, 'preview'> {
  if (/^\/web(?:\/|$)/.test(pathname)) return 'customer'
  if (/^\/(?:partner|account|onboarding|application|seller|creator|login|register|auth)(?:\/|$)/.test(pathname) || /^\/business-(?:login|activate|workspace)$/.test(pathname)) return 'partner'
  return 'public'
}
// Cross-origin navigation carries only non-secret routing intent, never arbitrary
// query parameters, callback codes, tokens, or fragments (including nested next).
function routeQuery(search: string) {
  const input = new URLSearchParams(search), output = new URLSearchParams()
  const role = input.get('role')
  if (role === 'seller' || role === 'creator') output.set('role', role)
  const next = input.get('next')
  if (next && /^\/(?:partner|account)(?:\/[a-zA-Z0-9_-]+)*$/.test(next)) output.set('next', next)
  return output.size ? `?${output}` : ''
}
export function surfaceHref(path: string, hostname = window.location.hostname): string {
  if (!path.startsWith('/') || path.startsWith('//') || /[\\\s]/.test(path)) return path
  const current = hostSurface(hostname), url = new URL(path, origins.public)
  const target = pathSurface(url.pathname)
  if (current === 'preview' || current === target) return path
  // Auth codes belong to the initiating origin. Never transfer them to another.
  if (url.pathname.startsWith('/auth/')) {
    const intent = url.pathname.split('/')[3]
    return `${origins.partner}/partner/login${intent === 'seller' || intent === 'creator' ? `?role=${intent}` : ''}`
  }
  return `${origins[target]}${url.pathname}${routeQuery(url.search)}`
}
export function hostRedirect(hostname: string, path: string): string | null {
  const surface = hostSurface(hostname), pathname = path.split(/[?#]/)[0]
  if (surface === 'preview') return null
  // Customer grants are not implemented: private/legacy paths stay fail-closed.
  if (surface === 'customer' && (pathname === '/' || /^\/(?:web|account)(?:\/|$)/.test(pathname))) return pathname === '/web' ? null : '/web'
  if (pathname === '/' && surface === 'partner') return '/partner'
  const destination = surfaceHref(path, hostname)
  return destination === path ? null : destination
}
export function isAuthOrigin(origin: string, development = false) {
  return origin === origins.partner || origin === origins.preview ||
    (development && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
}
