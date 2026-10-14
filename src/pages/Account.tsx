import { ProfileEditor } from './ProfileEditor'
import { useAuth } from '../auth/AuthContext'
import { PublicNav } from '../components/PublicNav'
import { Button } from '../components/Ui'

export function Account() {
  const { profile, access } = useAuth()
  return <><PublicNav/><main id="main-content" className="account-page"><h1>My account</h1><p>Your identity and workspace access are shared with the SOCIAL 24-7 app.</p><dl><div><dt>Display name</dt><dd>{profile?.display_name || 'Not provided'}</dd></div><div><dt>Username</dt><dd>{profile?.username || 'Not provided'}</dd></div>{access?.admin_access && <div><dt>Admin</dt><dd>Authorized</dd></div>}{(['seller', 'creator'] as const).map(role => <div key={role}><dt>{role === 'seller' ? 'Seller' : 'Creator'}</dt><dd>{(access?.[`${role}_status`] || 'not_applied').replaceAll('_', ' ')}</dd></div>)}</dl><ProfileEditor/><Button to="/onboarding">My workspaces</Button></main></>
}
