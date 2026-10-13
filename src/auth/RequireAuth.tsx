import { useState, type ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Button, ErrorState, LoadingState } from '../components/Ui'

export function RequireAuth({ children, role }: { children?: ReactNode; role?: 'seller' | 'creator' }) {
  const auth = useAuth()
  const location = useLocation()
  const [actionError, setActionError] = useState('')
  const run = (action: () => Promise<void>) => { setActionError(''); void action().catch(cause => setActionError(cause instanceof Error ? cause.message : 'Unable to continue. Please retry.')) }
  if (auth.loading) return <LoadingState />
  if (!auth.user) return <Navigate to={`${location.pathname.startsWith('/web') ? '/web/login' : '/partner/login'}?next=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (auth.error) return <main className="status-page"><ErrorState message={actionError || auth.error} /><Button onClick={() => run(auth.refreshProfile)}>Retry account access</Button></main>
  if (auth.user.app_metadata?.account_type === 'business_employee') return <main className="status-page"><ErrorState message={actionError || 'Business work identities use the existing mobile business workspace. Personal and owner workspaces are not available to this work account here.'} /><Button onClick={() => run(auth.signOut)}>Sign out</Button></main>
  if (role && auth.access?.[`${role}_status`] !== 'approved') return <Navigate to={`/application?role=${role}`} replace />
  return children ?? <Outlet />
}
