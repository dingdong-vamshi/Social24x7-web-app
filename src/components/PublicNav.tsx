import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from './Brand'
import { useAuth } from '../auth/AuthContext'
import { AccountMenu } from './AccountMenu'
import '../public.css'

export function PublicNav() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const auth = useAuth()
  return <header className="public-header">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="announcement">Your community. Your business. One SOCIAL 24-7 account. <Link to="/info/about">Explore the platform <ArrowUpRight size={13}/></Link></div>
    <nav className="public-nav" aria-label="Main navigation"><Brand/>
      <button className="public-menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="public-links" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      <div id="public-links" className={`public-links ${open ? 'is-open' : ''}`}>
        {([['Seller', '/partner/register?role=seller'], ['Creator', '/partner/register?role=creator'], ['Partner', '/info/partners'], ['Customer', '/web'], ['About', '/info/about']] as const).map(([label,to]) => <Link key={label} to={to} onClick={() => setOpen(false)} aria-current={location.pathname===to?'page':undefined}>{label}</Link>)}
        <div className="public-nav-actions">{auth.loading ? <span role="status">Loading account…</span> : auth.user ? <AccountMenu/> : <><Link to="/partner/login" onClick={() => setOpen(false)}>Log in</Link><Link className="public-cta" to="/partner" onClick={() => setOpen(false)}>Join now <ArrowUpRight size={16}/></Link></>}</div>
      </div>
    </nav>
  </header>
}
export function PublicFooter() {
  return <footer className="public-footer"><div><Brand variant="footer"/><p>A place for people, products, and possibilities.</p></div><div><Link to="/info/seller">For sellers</Link><Link to="/info/creator">For creators</Link><Link to="/info/partners">Partner opportunities</Link><Link to="/web">Customer web</Link></div><p>© {new Date().getFullYear()} SOCIAL 24-7</p></footer>
}
