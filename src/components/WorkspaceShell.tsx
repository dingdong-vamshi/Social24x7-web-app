import { lazy, Suspense, useState, type ReactNode } from 'react'
import { BarChart3, Boxes, CircleDollarSign, CircleUserRound, ClipboardCheck, Handshake, HeartPulse, LayoutDashboard, Megaphone, Menu, MessageCircle, PackageCheck, PanelLeftClose, Search, Settings2, ShieldCheck, ShoppingBag, Store, Truck, Users, Video, WalletCards, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { PartnerRole } from '../domain/models'
import { useAuth } from '../auth/AuthContext'
import { Brand } from './Brand'
import { roleAction, roleDestination } from '../auth/routing'
import { AccountMenu } from './AccountMenu'
import { WorkspaceNavigation } from './WorkspaceNavigation'
import '../commerce.css'
import './workspace-navigation.css'
const WorkspaceNotifications = lazy(() => import('../pages/Social').then(module => ({ default: module.WorkspaceNotifications })))

export interface NavItem { label: string; path: string; icon: ReactNode; children?: Array<{label: string; path: string; soon?: boolean}>; soon?: boolean }
const sellerChild = (label: string, path: string, soon = false) => ({ label, path: `/partner/seller/${path}`, soon })
const sellerNav: NavItem[] = [
  { label: 'Overview', path: '/partner/seller', icon: <LayoutDashboard size={19} /> },
  { label: 'Orders', path: '/partner/seller/orders', icon: <ShoppingBag size={19} />, children: [sellerChild('Manage Orders', 'orders'), sellerChild('Manage Returns', 'returns'), sellerChild('Return Settings', 'orders/return-settings')] },
  { label: 'Products', path: '/partner/seller/products', icon: <Boxes size={19} />, children: [sellerChild('Add Products', 'products/add'), sellerChild('Manage Products', 'products'), sellerChild('Product Ratings', 'products/ratings', true), sellerChild('Product Bundle', 'products/bundle', true), sellerChild('Sales Accelerator', 'products/accelerator', true), sellerChild('Product Opportunities', 'products/opportunities', true)] },
  { label: 'Logistics', path: '/partner/seller/logistics', icon: <Truck size={19} />, children: [sellerChild('Overview', 'logistics'), sellerChild('Fulfillment', 'logistics/fulfillment'), sellerChild('Shipping', 'logistics/shipping'), sellerChild('Warehouses', 'logistics/warehouses', true), sellerChild('Fulfilled by Social24', 'logistics/social24', true)] },
  { label: 'Marketing', path: '/partner/seller/marketing', icon: <Megaphone size={19} />, children: [sellerChild('Promotions', 'marketing/promotions', true), sellerChild('Campaigns', 'marketing/campaigns', true), sellerChild('Programs', 'marketing/programs', true), sellerChild('Shop Ads', 'marketing/ads', true), sellerChild('Shop Page', 'marketing/shop-page', true)] },
  { label: 'Affiliate', path: '/partner/seller/affiliate', icon: <Handshake size={19} />, children: [sellerChild('Products & creators', 'affiliate'), sellerChild('Automations', 'affiliate/automations', true)] },
  { label: 'LIVE & Video', path: '/partner/seller/live-video', icon: <Video size={19} />, soon: true },
  { label: 'Growth', path: '/partner/seller/growth', icon: <BarChart3 size={19} />, soon: true },
  { label: 'Apps & Partners', path: '/partner/seller/apps-partners', icon: <Boxes size={19} />, soon: true },
  { label: 'Finance', path: '/partner/seller/finance', icon: <WalletCards size={19} /> },
  { label: 'Business Chat', path: '/partner/seller/chat', icon: <MessageCircle size={19} /> },
  { label: 'Social', path: '/partner/seller/social', icon: <Users size={19} /> },
  { label: 'Team & verification', path: '/partner/seller/team', icon: <Users size={19} /> },
  { label: 'Creator Chats', path: '/partner/seller/creator-chat', icon: <MessageCircle size={19} /> },
  { label: 'Analytics', path: '/partner/seller/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Account health', path: '/partner/seller/account-health', icon: <HeartPulse size={19} /> },
  { label: 'Storefront', path: '/partner/seller/storefront', icon: <Store size={19} /> },
  { label: 'SEO & AI', path: '/partner/seller/discoverability', icon: <Settings2 size={19} /> },
  { label: 'Operations', path: '/partner/seller/operations', icon: <Settings2 size={19} /> },
]
const creatorNav: NavItem[] = [
  { label: 'Overview', path: '/partner/creator', icon: <LayoutDashboard size={19} /> },
  { label: 'Discover products', path: '/partner/creator/discover', icon: <Search size={19} /> },
  { label: 'Promotions', path: '/partner/creator/promotions', icon: <PackageCheck size={19} /> },
  { label: 'Affiliate links', path: '/partner/creator/links', icon: <Handshake size={19} /> },
  { label: 'Seller conversations', path: '/partner/creator/chat', icon: <MessageCircle size={19} /> },
  { label: 'Social', path: '/partner/creator/social', icon: <Users size={19} /> },
  { label: 'Collaborations', path: '/partner/creator/collab', icon: <Handshake size={19} /> },
  { label: 'Growth', path: '/partner/creator/growth', icon: <BarChart3 size={19} /> },
  { label: 'Earnings', path: '/partner/creator/earnings', icon: <CircleDollarSign size={19} /> },
  { label: 'Payments', path: '/partner/creator/payments', icon: <WalletCards size={19} /> },
  { label: 'Analytics', path: '/partner/creator/analytics', icon: <BarChart3 size={19} /> },
  { label: 'Profile', path: '/partner/creator/profile', icon: <CircleUserRound size={19} /> },
  { label: 'Professional verification', path: '/partner/creator/professional', icon: <ShieldCheck size={19} /> },
]

export function WorkspaceShell({ role, children }: { role: PartnerRole; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { profile, access } = useAuth()
  const { pathname } = useLocation()
  const name = profile?.display_name || profile?.username || 'Your account'
  const nav = role === 'seller' ? sellerNav : creatorNav
  // Social deliberately opens as its own application surface. Other workspaces
  // keep their existing shell, flyouts, account menu and notification ownership.
  if (pathname === `/partner/${role}/social` || pathname.startsWith(`/partner/${role}/social/`)) return <main className="partner-social-surface">{children}</main>
  return <div className={`workspace commerce-workspace ${collapsed ? 'nav-collapsed' : ''}`}>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`} aria-label="Workspace navigation">
      <div className="sidebar-brand"><Brand variant="sidebar" compact={collapsed} /><button aria-label="Close navigation" className="icon-button mobile-only" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <div className="workspace-switcher"><span className="avatar">{name.slice(0, 1).toUpperCase()}</span>{!collapsed && <span className="workspace-switcher-copy"><strong>{name}</strong><span>{role === 'seller' ? 'Seller Studio' : 'Creator Center'}</span></span>}</div>
      <nav aria-label={`${role} workspace`}>
        {!collapsed && <span className="nav-label">Workspace</span>}
        <WorkspaceNavigation key={`${role}:${profile?.id}:${pathname}:${collapsed}:${mobileOpen}`} items={nav} collapsed={collapsed} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
      </nav>
      <div className="sidebar-foot"><div className="secure-note"><ShieldCheck size={17} />{!collapsed && <span>Your connected account<br /><small>Authorized business records</small></span>}</div><button className="collapse-button" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => setCollapsed(!collapsed)}><PanelLeftClose size={18} />{!collapsed && 'Collapse'}</button></div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-main"><header className="topbar">
      <button className="icon-button mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
      <span className="commerce-topbar-title">{role === 'seller' ? 'Seller Studio' : 'Creator Center'}</span>
      <div className="top-actions"><Suspense fallback={null}><WorkspaceNotifications base={`/partner/${role}/social`}/></Suspense><Link className="workspace-role-action" to={roleDestination(role === 'seller' ? 'creator' : 'seller', access)}>{roleAction(role === 'seller' ? 'creator' : 'seller', access)}</Link><AccountMenu/></div>
    </header><main className="workspace-content">{children}<footer className="commerce-footer"><Link to="/">SOCIAL 24-7</Link><span>One account. Your authorized workspaces.</span></footer></main></div>
  </div>
}

export function RoleBadge({ role }: { role: PartnerRole }) { return <span className="role-badge"><ClipboardCheck size={15} />{role === 'seller' ? 'Seller workspace' : 'Creator workspace'}</span> }
