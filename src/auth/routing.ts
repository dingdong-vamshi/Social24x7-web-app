export function safeNext(value: string | null, fallback = '/onboarding') {
  return value?.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/^\/(partner\/|web\/)?(login|register)(\/|\?|$)/.test(value) ? value : fallback
}
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return digits.length === 10 ? `+91${digits}` : `+${digits}`
}

type Access = { admin_access?: boolean; seller_status?: string; creator_status?: string } | null
export type Workspace = 'admin' | 'seller' | 'creator' | 'consumer'
export const workspacePath = (workspace: Workspace) => workspace === 'consumer' ? '/web/chats' : `/partner/${workspace}`
export function allowedWorkspace(workspace: string | null, access: Access): workspace is Workspace {
  return workspace === 'consumer' || (workspace === 'admin' ? access?.admin_access === true : (workspace === 'seller' || workspace === 'creator') && access?.[`${workspace}_status`] === 'approved')
}
export function rememberWorkspace(userId: string, workspace: Workspace) {
  try { sessionStorage.setItem(`workspace:${userId}`, workspace) } catch { /* Storage is optional. */ }
}
export function forgetWorkspace(userId: string | null) {
  if (userId) try { sessionStorage.removeItem(`workspace:${userId}`) } catch { /* Storage is optional. */ }
}
export function defaultDestination(userId: string, access: Access) {
  if (access?.admin_access) return '/partner/admin'
  let preferred: string | null = null
  try { preferred = sessionStorage.getItem(`workspace:${userId}`) } catch { /* Storage is optional. */ }
  if (allowedWorkspace(preferred, access)) return workspacePath(preferred)
  const seller = access?.seller_status === 'approved', creator = access?.creator_status === 'approved'
  if (seller && creator) return '/onboarding'
  if (seller || creator) return `/partner/${seller ? 'seller' : 'creator'}`
  const pending = (['seller', 'creator'] as const).filter(role => access?.[`${role}_status`] && access[`${role}_status`] !== 'not_applied')
  return pending.length === 1 ? `/application?role=${pending[0]}` : pending.length > 1 ? '/onboarding' : '/web/chats'
}
export function loginDestination(userId: string, access: Access, requested: string | null) {
  const fallback = defaultDestination(userId, access)
  const next = safeNext(requested, fallback)
  const workspace = next.match(/^\/partner\/(admin|seller|creator)(?:\/|\?|$)/)?.[1]
  return workspace && !allowedWorkspace(workspace, access) ? fallback : next
}
