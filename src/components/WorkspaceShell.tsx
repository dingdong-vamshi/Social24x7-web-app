import { useState, type ReactNode } from 'react'
import { BarChart3, Boxes, CircleDollarSign, CircleUserRound, ClipboardCheck, Handshake, HeartPulse, LayoutDashboard, Menu, MessageCircle, PackageCheck, PanelLeftClose, RotateCcw, Search, Settings2, ShieldCheck, ShoppingBag, Store, Truck, Users, WalletCards, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import type { PartnerRole } from '../domain/models'
import { useAuth } from '../auth/AuthContext'
import { Brand } from './Brand'
import { AccountMenu } from './AccountMenu'
import '../commerce.css'

export interface NavItem { label: string; path: string; icon: ReactNode }
const sellerNav: NavItem[] = [
  { label: 'Overview', path: '/partner/seller', icon: <LayoutDashboard size={19} /> },
  { label: 'Orders', path: '/partner/seller/orders', icon: <ShoppingBag size={19} /> },
  { label: 'Returns', path: '/partner/seller/returns', icon: <RotateCcw size={19} /> },
  { label: 'Products', path: '/partner/seller/products', icon: <Boxes size={19} /> },
  { label: 'Logistics', path: '/partner/seller/logistics', icon: <Truck size={19} /> },
  { label: 'Finance', path: '/partner/seller/finance', icon: <WalletCards size={19} /> },
  { label: 'Business Chat', path: '/partner/seller/chat', icon: <MessageCircle size={19} /> },
  { label: 'Team & verification', path: '/partner/seller/team', icon: <Users size={19} /> },
  { label: 'Affiliate & creators', path: '/partner/seller/affiliate', icon: <Handshake size={19} /> },
  { label: 'Analytics', path: '/partner/seller/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Account health', path: '/partner/seller/account-health', icon: <HeartPulse size={19} /> },
  { label: 'Storefront', path: '/partner/seller/storefront', icon: <Store size={19} /> },
  { label: 'SEO & AI', path: '/partner/seller/discoverability', icon: <Settings2 size={19} /> },
]
const creatorNav: NavItem[] = [
  { label: 'Overview', path: '/partner/creator', icon: <LayoutDashboard size={19} /> },
  { label: 'Discover products', path: '/partner/creator/discover', icon: <Search size={19} /> },
  { label: 'Promotions', path: '/partner/creator/promotions', icon: <PackageCheck size={19} /> },
  { label: 'Affiliate links', path: '/partner/creator/links', icon: <Handshake size={19} /> },
  { label: 'Seller conversations', path: '/partner/creator/chat', icon: <MessageCircle size={19} /> },
  { label: 'Earnings', path: '/partner/creator/earnings', icon: <CircleDollarSign size={19} /> },
  { label: 'Analytics', path: '/partner/creator/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Profile', path: '/partner/creator/profile', icon: <CircleUserRound size={19} /> },
]

export function WorkspaceShell({ role, children }: { role: PartnerRole; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { profile } = useAuth()
  const name = profile?.display_name || profile?.username || 'Your account'
  const nav = role === 'seller' ? sellerNav : creatorNav
  return <div className={`workspace commerce-workspace ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Workspace navigation">
      <div className="sidebar-brand"><Brand variant="sidebar" compact={collapsed} /><button aria-label="Close navigation" className="icon-button mobile-only" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <div className="workspace-switcher"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span>{!collapsed && <span className="workspace-switcher-copy"><strong>{name}</strong><span>{role === 'seller' ? 'Seller Studio' : 'Creator Center'}</span></span>}</div>
      <nav aria-label={`${role} workspace`}>
        {!collapsed && <span className="nav-label">Workspace</span>}
        {nav.map((item) => <NavLink key={item.path} to={item.path} end={item.path === `/partner/${role}`} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>{item.icon}{!collapsed && <span>{item.label}</span>}</NavLink>)}
      </nav>
      <div className="sidebar-foot"><div className="secure-note"><ShieldCheck size={17} />{!collapsed && <span>Your connected account<br /><small>Authorized business records</small></span>}</div><button className="collapse-button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} />{!collapsed && 'Collapse'}</button></div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-main"><header className="topbar">
      <button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
      <span className="commerce-topbar-title">{role === 'seller' ? 'Seller Studio' : 'Creator Center'}</span>
      <div className="top-actions"><AccountMenu/></div>
    </header><main className="workspace-content">{children}<footer className="commerce-footer"><Link to="/">SOCIAL 24-7</Link><span>One account. Your authorized workspaces.</span></footer></main></div>
  </div>
}

export function RoleBadge({ role }: { role: PartnerRole }) { return <span className="role-badge"><ClipboardCheck size={15} />{role === 'seller' ? 'Seller workspace' : 'Creator workspace'}</span> }
