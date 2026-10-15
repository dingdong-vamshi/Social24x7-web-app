import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Laptop, LogIn, QrCode, ShieldCheck, Smartphone } from 'lucide-react'
import { PublicNav, PublicFooter } from '../components/PublicNav'
import { useAuth } from '../auth/AuthContext'
import { hostSurface } from '../lib/domains'
import '../features/social/social.css'
import './customer.css'

export function CustomerLink() {
  const auth = useAuth()
  const [qr, setQr] = useState(false)
  const login = hostSurface(window.location.hostname) === 'customer' ? '/login' : '/web/login'
  const personal = auth.user && auth.user.app_metadata?.account_type !== 'business_employee'
  return <div className="public-site"><PublicNav/><main id="main-content" className="customer-entry">
    <section className="customer-intro"><span className="eyebrow">SOCIAL 24-7 · Customer Web</span><h1>Your world.<br/>Now on your computer.</h1><p>Social, personal conversations and your orders—with your existing SOCIAL 24-7 account.</p><div className="device-illustration" aria-hidden="true"><Smartphone size={42}/><Laptop size={70}/></div></section>
    <div className="customer-entry-options">
      <section className="customer-entry-card" aria-labelledby="customer-account-title"><LogIn size={28}/><span className="eyebrow">Option 1 · Available now</span><h2 id="customer-account-title">Log in with your account</h2><p>Use your email, phone number or username and password. No Seller or Creator approval is needed.</p>{personal ? <><p>Signed in as {auth.profile?.display_name || auth.profile?.username || 'your existing account'}.</p><Link className="button primary" to="/account/social">Open Customer Web <ArrowRight size={18}/></Link></> : <Link className="button primary" to={login}>Log in with your account <ArrowRight size={18}/></Link>}<small>Available: Social, personal chat, profiles, notifications and order history. This is not full mobile-app parity.</small></section>
      <section className="customer-entry-card" aria-labelledby="customer-qr-title"><QrCode size={28}/><span className="eyebrow">Option 2 · Mobile integration pending</span><h2 id="customer-qr-title">Link your phone with QR</h2><p>Pair this browser after you explicitly approve it from Linked Devices in the official mobile app.</p><button className="button secondary" type="button" aria-expanded={qr} onClick={() => setQr(!qr)}>{qr ? 'Hide linking details' : 'View QR linking options'}</button>{qr && <div className="customer-qr-status" role="status"><ShieldCheck size={24}/><h3>QR linking cannot be completed yet</h3><p>The compatible mobile scanner, approval flow and secure browser-session exchange are not connected. No live QR challenge or login token is issued here.</p><button type="button" disabled>Generate pairing QR · unavailable</button><p>Use account login now. A QR scan alone will never grant account access.</p></div>}</section>
    </div>
  </main><PublicFooter/></div>
}
