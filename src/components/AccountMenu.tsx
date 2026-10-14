import { useEffect, useRef, useState } from 'react'
import { ChevronDown, LogOut } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SurfaceLink as Link } from './SurfaceLink'
import { useAuth } from '../auth/AuthContext'
import { allowedWorkspace, roleAction, roleDestination, rememberWorkspace, workspacePath, type Workspace } from '../auth/routing'
import './account.css'

export function AccountMenu() {
  const auth = useAuth()
  return auth.user ? <UserMenu key={auth.user.id} /> : null
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
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [])
  const name = profile?.display_name || profile?.username || 'Your account'
  async function logout(other = false) {
    if (busy) return
    setBusy(true); setError('')
    try { await signOut(); setOpen(false); navigate(other ? '/partner/login' : '/', { replace: true }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to log out. Please retry.'); setBusy(false) }
  }
  const workspaces: Array<[Workspace, string]> = [['admin', 'Admin Dashboard'], ['seller', 'Seller Studio'], ['creator', 'Creator Center'], ['consumer', 'Personal Chats']]
  return <div className="account-menu" ref={root}>
    <button ref={trigger} className="account-trigger" aria-label={`Account menu for ${name}`} aria-expanded={open} aria-controls="account-options" onClick={() => setOpen(!open)}><span className="avatar">{name.slice(0, 1)}</span><span className="account-name">{name}</span><ChevronDown size={16}/></button>
    {open && <nav id="account-options" className="account-options" aria-label="Account and workspaces" key={location.pathname} onClick={event => { if ((event.target as HTMLElement).closest('a')) setOpen(false) }}>
      <strong>{name}</strong><Link to="/account">My account</Link><Link to="/account/social">Social</Link><Link to="/web">Customer device linking</Link><Link to="/onboarding">My workspaces</Link>
      {!loading && !accessError && workspaces.filter(([key]) => allowedWorkspace(key, access)).map(([key, label]) => <Link key={key} to={workspacePath(key)} onClick={() => rememberWorkspace(user!.id, key)}>{label}</Link>)}
      <Link to="/account/orders">My Orders</Link>
      {!loading && !accessError && !access?.admin_access && (['seller', 'creator'] as const).filter(role => access?.[`${role}_status`] !== 'approved').map(role => <Link key={role} to={roleDestination(role, access)}>{roleAction(role, access)}</Link>)}
      <Link to="/">Visit website</Link><button disabled={busy} onClick={() => void logout(true)}>Use another account</button><button disabled={busy} onClick={() => void logout()}><LogOut size={16}/>{busy ? 'Logging out…' : 'Log out'}</button>
      {error && <p role="alert">{error}</p>}
    </nav>}
  </div>
}
