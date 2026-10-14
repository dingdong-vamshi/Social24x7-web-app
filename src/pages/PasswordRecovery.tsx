import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button } from '../components/Ui'
import { PasswordInput } from '../components/PasswordInput'
import { requireSupabase } from '../lib/supabase'
import { isAuthOrigin } from '../lib/domains'
import { partnerIntent } from '../auth/routing'
import { passwordPolicyMessage, validNewPassword } from '../auth/passwordPolicy'
import { validateRecoveryLink } from '../auth/recovery'
import './auth.css'

export function ForgotPassword() {
  const [params] = useSearchParams()
  const role = partnerIntent(params.get('role'))
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      if (!isAuthOrigin(window.location.origin, import.meta.env.DEV)) throw new Error('Use the official Partner website to reset your password.')
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${window.location.origin}/auth/reset-password` })
      // A generic response is identical for registered and unknown addresses.
      if (error && (error.status === 429 || error.status === 0 || (error.status ?? 0) >= 500)) throw new Error('The request could not be completed. Please wait a minute and retry.')
      setSent(true)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Check your connection and try again.') }
    finally { setBusy(false) }
  }
  return <main className="auth-white-card recovery-card"><Brand/><h1>Forgot password?</h1><p>Enter your registered email. Recovery uses email verification, even when you normally sign in with a mobile number or username.</p>
    {sent ? <p className="auth-notice" role="status">If an eligible account uses that email, you’ll receive a password-reset link. Open it in this browser to continue securely.</p> : <form className="auth-form" onSubmit={submit}><label>Registered email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" maxLength={254}/></label>{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button></form>}
    <p><Link to={`/partner/login${role ? `?role=${role}` : ''}`}>Back to sign in</Link></p>
  </main>
}

export function ResetPassword() {
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [recoveryUser, setRecoveryUser] = useState('')
  const recoveryHref = useRef(window.location.href)
  useEffect(() => {
    let active = true
    const client = requireSupabase()
    void (async () => {
      try {
        const userId = await validateRecoveryLink(client, recoveryHref.current)
        if (active) { setRecoveryUser(userId); setState('ready') }
      } catch { if (active) setState('invalid') }
      finally { window.history.replaceState(null, '', window.location.pathname) }
    })()
    return () => { active = false }
  }, [])
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || state !== 'ready') return
    if (!validNewPassword(password)) { setError(passwordPolicyMessage); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true); setError('')
    try {
      const client = requireSupabase()
      const current = await client.auth.getUser()
      if (current.error || current.data.user?.id !== recoveryUser) { setState('invalid'); return }
      const { error } = await client.auth.updateUser({ password })
      if (error) throw new Error('The password could not be updated. The link may have expired, or the password may not meet the account policy. Request a new link and try again.')
      setPassword(''); setConfirm(''); setState('done')
      await client.auth.signOut({ scope: 'local' })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update your password.') }
    finally { setBusy(false) }
  }
  return <main className="auth-white-card recovery-card"><Brand/><h1>{state === 'done' ? 'Password updated' : 'Set a new password'}</h1>
    {state === 'checking' && <p role="status">Checking your secure reset link…</p>}
    {state === 'invalid' && <><p role="alert">This reset link is invalid, expired, already used, or was opened in a different browser. Request a new link and open it in the browser where you requested it.</p><Link to="/partner/forgot-password">Request a new reset link</Link></>}
    {state === 'ready' && <form className="auth-form" onSubmit={submit}><PasswordInput label="New password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" maxLength={128} showRequirements required/><PasswordInput label="Confirm new password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" maxLength={128} required/>{error && <p role="alert" className="form-error">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button></form>}
    {state === 'done' && <><p role="status">Your password was updated. Sign in with your new password to return to your authorized workspace.</p><Link to="/partner/login">Sign in</Link></>}
  </main>
}
