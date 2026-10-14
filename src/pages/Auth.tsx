import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { PublicNav } from '../components/PublicNav'
import { Button } from '../components/Ui'
import { requireSupabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { loginDestination, normalizePhone } from '../auth/routing'
import './auth.css'
function AuthForm({ register = false }: { register?: boolean }) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const auth = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const consumer = location.pathname.startsWith('/web')
  const requestedRole = params.get('role')
  const requested = params.get('next') || (requestedRole === 'seller' || requestedRole === 'creator' ? `/partner/onboarding/${requestedRole}` : null)
  const next = auth.user ? loginDestination(auth.user.id, auth.access, requested) : requested
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(''); setNotice('')
    const normalizedPhone = normalizePhone(phone)
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) { setError('Enter your phone number with country code.'); return }
    if (register && (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))) { setError('Use at least 8 characters with a letter and a number.'); return }
    if (register && password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true)
    try {
      const client = requireSupabase()
      if (register) {
        const result = await client.auth.signUp({ email: email.trim().toLowerCase(), password, options: {
          data: { name: name.trim(), preferred_username: username.trim().toLowerCase(), phone_e164: normalizedPhone },
          emailRedirectTo: `${window.location.origin}/onboarding`,
        } })
        if (result.error) throw result.error
        if (result.data.user?.identities?.length === 0) { setNotice('If you already have an account, sign in using your existing details. Otherwise, check your email for confirmation.'); return }
        if (result.data.session) { await auth.refreshProfile() }
        else { setNotice('Check your email to confirm your account, then sign in. No Seller or Creator application has been submitted yet.'); setPassword(''); setConfirm('') }
      } else {
        await auth.signIn({ email, phone: normalizedPhone, password })
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to continue. Please try again.') }
    finally { setBusy(false) }
  }
  if (auth.loading && !busy) return <div className="route-loading" role="status">Restoring your account…</div>
  if (auth.user && !auth.loading && !auth.error && !busy) return <Navigate to={next!} replace />
  return <div className="connected-auth"><PublicNav /><main id="main-content" className="auth-hero">
    <section className="auth-promotion"><div className="eyebrow">{consumer ? 'Your everyday connections' : 'SOCIAL 24-7 Partner'}</div><h1>{consumer ? <>Your conversations.<br /><em>Now on the web.</em></> : <>Your next chapter<br />starts with<br /><em>SOCIAL 24-7.</em></>}</h1><p>{consumer ? 'Continue with the account you already use on the app.' : 'Build your business presence and bring your products and creativity together.'}</p><ul>{(consumer ? ['Keep your existing account', 'Open your authorized conversations', 'Follow your order history'] : ['Manage your products and orders', 'Connect your content with commerce', 'One account across app and web']).map(item => <li key={item}><CheckCircle2 size={20} />{item}</li>)}</ul></section>
    <section className="auth-white-card" aria-labelledby="auth-title"><div className="auth-kicker"><LockKeyhole size={16} /> {register ? 'One SOCIAL 24-7 account' : 'Your existing SOCIAL 24-7 account'}</div><h2 id="auth-title">{register ? 'Create your account' : 'Welcome back'}</h2><p>{register ? 'Already using the app? Sign in below to keep all your activity together.' : 'Use the same email, phone and password you use in the app.'}</p>
      {!auth.configured && <div className="form-error" role="alert">Account services are not configured for this deployment.</div>}
      {auth.error && <div className="form-error" role="alert">{auth.error}</div>}
      {auth.user && !busy && error && <div className="form-error" role="alert">{error}</div>}
      {auth.user && !busy && <div className="auth-signed-in"><button type="button" onClick={() => void auth.refreshProfile().catch(cause => setError(cause.message))}>Retry account access</button><button type="button" onClick={() => void auth.signOut().catch(cause => setError(cause.message))}>Use another account</button></div>}
      {(!auth.user || busy) && <form className="auth-form" onSubmit={submit}>
        {register && <div className="auth-form-row"><label>Display name<input value={name} onChange={event => setName(event.target.value)} autoComplete="name" maxLength={80} required /></label><label>Username<input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" pattern="[A-Za-z0-9_]{3,30}" title="3–30 letters, numbers or underscores" required /></label></div>}
        <label>Mobile number<input aria-label="Mobile number" type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" placeholder="+91 98765 43210" required /><small>{register ? 'Use the mobile number you want to register.' : 'Use the number registered to your account.'}</small></label>
        <label>Email address<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required /></label>
        <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={register ? 'new-password' : 'current-password'} required maxLength={128} /></label>
        {register && <label>Confirm password<input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" required maxLength={128} /></label>}
        {error && <div className="form-error" role="alert">{error}</div>}{notice && <div className="auth-notice" role="status">{notice}</div>}
        <Button type="submit" disabled={busy || auth.loading || !auth.configured}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={17} /></Button>
      </form>}
      <p className="auth-alternative">{register ? 'Already have an account?' : 'New to SOCIAL 24-7?'} <Link to={`${consumer ? '/web' : '/partner'}/${register ? 'login' : 'register'}${requested ? `?next=${encodeURIComponent(requested)}` : ''}`}>{register ? 'Sign in' : 'Create account'}</Link></p><div className="auth-security"><ShieldCheck size={17} /><span>SMS sign-in is not currently available. Your existing email and password connect to the same account as the app.</span></div>
    </section></main>
    {!consumer && <section className="auth-how"><h2>From first step to your workspace</h2><div>{['Create or sign in to your account', 'Choose Seller or Creator', 'Submit your details for review', 'Open your approved workspace'].map((item, index) => <article key={item}><span>0{index + 1}</span><h3>{item}</h3></article>)}</div><p>Creating an account does not automatically approve a business or professional credential.</p></section>}
  </div>
}
export function Login() { return <AuthForm /> }
export function Register() { return <AuthForm register /> }
