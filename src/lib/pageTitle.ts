export function pageTitle(path: string) {
  if (path.startsWith('/auth/callback/')) return 'Account confirmation'
  if (path.includes('/register')) return 'Create your account'
  if (path.includes('/login') || path === '/business-login') return 'Sign in'
  if (/^\/(?:partner\/)?application(?:\/|$)/.test(path)) return 'Application status'
  if (path.includes('/onboarding/seller')) return 'Seller application'
  if (path.includes('/onboarding/creator')) return 'Creator application'
  if (path.startsWith('/partner/admin')) return 'Admin Dashboard'
  if (path.startsWith('/partner/seller')) return 'Seller Studio'
  if (path.startsWith('/partner/creator')) return 'Creator Center'
  if (path.startsWith('/web')) return 'Customer web'
  if (path === '/partner') return 'Partner Web'
  return 'People, products, possibilities'
}
