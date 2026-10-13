import { useState, type ReactNode } from 'react'
import { BarChart3, Boxes, ChevronDown, CircleDollarSign, CircleUserRound, ClipboardCheck, Handshake, HeartPulse, LayoutDashboard, Menu, PackageCheck, PanelLeftClose, RefreshCcw, RotateCcw, Search, Settings2, ShieldCheck, ShoppingBag, Store, Truck, Users, WalletCards, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { PartnerRole } from '../domain/models'
import { announcePreviewAction } from '../utils/preview'
import { Brand } from './Brand'

export interface NavItem { label: string; path: string; icon: ReactNode }

const sellerNav: NavItem[] = [
  { label: 'Overview', path: '/seller', icon: <LayoutDashboard size={19} /> },
  { label: 'Orders', path: '/seller/orders', icon: <ShoppingBag size={19} /> },
  { label: 'Returns', path: '/seller/returns', icon: <RotateCcw size={19} /> },
  { label: 'Products', path: '/seller/products', icon: <Boxes size={19} /> },
  { label: 'Logistics', path: '/seller/logistics', icon: <Truck size={19} /> },
  { label: 'Finance', path: '/seller/finance', icon: <WalletCards size={19} /> },
  { label: 'Team & verification', path: '/seller/team', icon: <Users size={19} /> },
  { label: 'Affiliate & creators', path: '/seller/affiliate', icon: <Handshake size={19} /> },
  { label: 'Analytics', path: '/seller/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Account health', path: '/seller/account-health', icon: <HeartPulse size={19} /> },
  { label: 'Storefront', path: '/seller/storefront', icon: <Store size={19} /> },
  { label: 'SEO & AI', path: '/seller/discoverability', icon: <Settings2 size={19} /> },
]

const creatorNav: NavItem[] = [
  { label: 'Overview', path: '/creator', icon: <LayoutDashboard size={19} /> },
  { label: 'Discover products', path: '/creator/discover', icon: <Search size={19} /> },
  { label: 'Promotions', path: '/creator/promotions', icon: <PackageCheck size={19} /> },
  { label: 'Affiliate links', path: '/creator/links', icon: <Handshake size={19} /> },
  { label: 'Earnings', path: '/creator/earnings', icon: <CircleDollarSign size={19} /> },
  { label: 'Analytics', path: '/creator/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Profile', path: '/creator/profile', icon: <CircleUserRound size={19} /> },
]

export function WorkspaceShell({ role, children }: { role: PartnerRole; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const nav = role === 'seller' ? sellerNav : creatorNav
  const name = role === 'seller' ? 'Arjun QA Store' : 'Maya Kapoor'
  return <div className={`workspace ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-brand"><Brand compact={collapsed} /><button aria-label="Close navigation" className="icon-button mobile-only" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <button className="workspace-switcher" type="button" aria-label="Switch workspace" onClick={() => announcePreviewAction('Workspace switching is not connected in this Phase 1 preview.')}><span className="avatar">{role === 'seller' ? 'A' : 'M'}</span>{!collapsed && <span className="workspace-switcher-copy"><strong>{name}</strong><span>{role === 'seller' ? 'Seller Studio' : 'Creator Center'}</span></span>}{!collapsed && <ChevronDown size={16} />}</button>
      <nav aria-label={`${role} workspace`}>
        {!collapsed && <span className="nav-label">Workspace</span>}
        {nav.map((item) => <NavLink key={item.path} to={item.path} end={item.path === `/${role}`} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined}>{item.icon}{!collapsed && <span>{item.label}</span>}</NavLink>)}
      </nav>
      <div className="sidebar-foot">
        <div className="secure-note"><ShieldCheck size={17} />{!collapsed && <span>Mock workspace<br /><small>No production data</small></span>}</div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} />{!collapsed && 'Collapse'}</button>
      </div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-main">
      <header className="topbar">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
        <button className="command-search" type="button" onClick={() => announcePreviewAction(`Global ${role} workspace search is not connected in this Phase 1 preview.`)}><Search size={18} /><span>Search {role === 'seller' ? 'orders, products, customers' : 'products, links, campaigns'}</span><kbd>⌘ K</kbd></button>
        <div className="top-actions"><button className="icon-button" aria-label="Refresh preview data" onClick={() => announcePreviewAction('Preview data is already up to date. No production request was made.')}><RefreshCcw size={18} /></button><button className="profile-chip" onClick={() => announcePreviewAction('Account settings are not connected in this Phase 1 preview.')}><span>{role === 'seller' ? 'AR' : 'MK'}</span><span className="profile-copy"><strong>{role === 'seller' ? 'Arjun Rao' : 'Maya Kapoor'}</strong><small>{role === 'seller' ? 'Owner' : 'Creator'}</small></span><ChevronDown size={15} /></button></div>
      </header>
      <main className="workspace-content">{children}</main>
    </div>
  </div>
}

export function RoleBadge({ role }: { role: PartnerRole }) {
  return <span className="role-badge"><ClipboardCheck size={15} />{role === 'seller' ? 'Seller workspace' : 'Creator workspace'}</span>
}
