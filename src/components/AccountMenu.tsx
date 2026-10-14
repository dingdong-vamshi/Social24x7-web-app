import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SurfaceLink as Link } from './SurfaceLink'
import { useAuth } from '../auth/AuthContext'
import { roleAction, roleDestination, rememberWorkspace } from '../auth/routing'
import './account.css'

export function AccountMenu() {
  const auth = useAuth()
  const { pathname } = useLocation()
  return auth.user ? <UserMenu key={`${auth.user.id}:${pathname}`} /> : null
}
function UserMenu() {
  const { user, profile, access, loading, error: accessError, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && open) { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [open])
  const name = profile?.display_name || profile?.username || 'Your account'
  async function logout() {
    if (busy) return
    setBusy(true); setError('')
    try { await signOut(); setOpen(false); navigate('/', { replace: true }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to log out. Please retry.'); setBusy(false) }
  }
  const workspace = location.pathname.match(/^\/partner\/(seller|creator|admin)(?:\/|$)/)?.[1]
  const roles = (['seller', 'creator'] as const).filter(role => role !== workspace && (workspace !== 'admin' && !access?.admin_access || access?.[`${role}_status`] === 'approved'))
  return <div className="account-menu" ref={root}>
    <button ref={trigger} className="account-trigger" aria-label={`Account menu for ${name}`} aria-expanded={open} aria-controls="account-options" onClick={() => setOpen(!open)}><span className="avatar">{name.slice(0, 1)}</span><span className="account-name">{name}</span><ChevronDown size={16}/></button>
    {open && <nav id="account-options" className="account-options" aria-label="Account and workspaces" key={location.pathname} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false) }}>
      <strong>{name}</strong><Link to="/account">My account</Link>
      {!loading && !accessError && <>
        {!workspace && access?.admin_access && <Link to="/partner/admin" onClick={() => rememberWorkspace(user!.id, 'admin')}>Admin Dashboard</Link>}
        {roles.map(role => <Link key={role} to={roleDestination(role, access)} onClick={() => { if (access?.[`${role}_status`] === 'approved') rememberWorkspace(user!.id, role) }}>{roleAction(role, access)}</Link>)}
      </>}
      <button disabled={busy} onClick={() => void logout()}><LogOut size={16}/>{busy ? 'Logging out…' : 'Log out'}</button>
      {error && <p role="alert">{error}</p>}
    </nav>}
  </div>
}
