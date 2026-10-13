import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, MessageSquareText, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { Button } from '../components/Ui'
import { repositories } from '../repositories/mock'

export function Login() {
  const [phone, setPhone] = useState('+91 ')
  const [challengeId, setChallengeId] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!challengeId) setChallengeId((await repositories.auth.requestOtp(phone)).challengeId)
      else { await repositories.auth.verifyOtp(challengeId, otp); navigate('/onboarding') }
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to continue.') }
    finally { setBusy(false) }
  }
  return <AuthShell>
    <div className="auth-kicker"><LockKeyhole size={16} /> Unified Social24 account</div>
    <h1>{challengeId ? 'Enter the verification code' : 'Welcome back'}</h1>
    <p>{challengeId ? `We sent a code to ${phone}.` : 'Sign in to continue to your seller or creator workspace.'}</p>
    <form onSubmit={submit} className="auth-form">
      {!challengeId ? <label>Phone number<input aria-label="Phone number" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 98765 43210" autoComplete="tel" /></label> : <label>6-digit OTP<input aria-label="6-digit OTP" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="• • • • • •" inputMode="numeric" autoFocus /><small>Local mock code: <strong>246810</strong></small></label>}
      {error && <div className="form-error" role="alert">{error}</div>}
      <Button type="submit" disabled={busy}>{busy ? 'Please wait…' : challengeId ? 'Verify & continue' : 'Send verification code'} <ArrowRight size={17} /></Button>
      {challengeId && <button className="text-button" type="button" onClick={() => { setChallengeId(''); setOtp('') }}><ArrowLeft size={15} /> Change phone number</button>}
    </form>
    <div className="auth-assurance"><ShieldCheck size={18} /><span><strong>Secure by design</strong><small>Phase 1 uses a local authentication adapter. No OTP or production account data is transmitted.</small></span></div>
  </AuthShell>
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="auth-page"><header><Brand /><Link to="/">Back to partner home</Link></header><main><section className="auth-panel">{children}</section><aside className="auth-story"><div className="auth-story-inner"><div className="eyebrow">Social24 Partner</div><h2>One account.<br />Two ways to grow.</h2><div className="auth-story-list"><div><CheckCircle2 /><span><strong>Seller Studio</strong><small>Catalog, orders, teams, finance and creator partnerships.</small></span></div><div><MessageSquareText /><span><strong>Creator Center</strong><small>Discover products, create promotions and track earnings.</small></span></div></div></div></aside></main></div>
}

export function Register() {
  return <AuthShell><div className="auth-kicker"><ShieldCheck size={16} /> Partner registration</div><h1>Create your Social24 partner profile</h1><p>Use your phone number to create or continue a unified account. You’ll choose a seller or creator path next.</p><div className="registration-options"><Link to="/login"><span className="option-icon">+91</span><span><strong>Continue with phone</strong><small>OTP verification</small></span><ArrowRight /></Link></div><p className="legal-copy">By continuing, you agree to complete the verification appropriate to your selected business role.</p></AuthShell>
}
