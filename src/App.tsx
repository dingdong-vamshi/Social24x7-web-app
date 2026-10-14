import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ApplicationStatusPage } from './pages/ApplicationStatus'
import { Login, Register } from './pages/Auth'
import { InformationPage, Landing, PartnerEntry } from './pages/Landing'
import { OnboardingFlow, RoleSelection } from './pages/Onboarding'
import { AuthProvider } from './auth/AuthContext'
import { RequireAuth } from './auth/RequireAuth'
import { PublicNav, PublicFooter } from './components/PublicNav'
import { WorkspaceShell } from './components/WorkspaceShell'
import { Account } from './pages/Account'

const BusinessLogin = lazy(() => import('./pages/BusinessWork').then(module => ({ default: module.BusinessLogin })))
const BusinessWork = lazy(() => import('./pages/BusinessWork').then(module => ({ default: module.BusinessWork })))
const SellerStudio = lazy(() => import('./pages/SellerStudio').then(module => ({ default: module.SellerStudio })))
const CreatorCenter = lazy(() => import('./pages/CreatorCenter').then(module => ({ default: module.CreatorCenter })))
const ConsumerWeb = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.ConsumerWeb })))
const ConsumerOrders = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.ConsumerOrders })))
const BusinessChat = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.BusinessChat })))
const AdminDashboard = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminDashboard })))

function LegacyRoute({from,to}:{from:string;to:string}){const location=useLocation();return <Navigate to={location.pathname.replace(from,to)+location.search+location.hash} replace/>}
function Home(){const host=window.location.hostname;return host==='partner.social24-7.com'?<Navigate to="/partner" replace/>:host==='web.social24-7.com'?<Navigate to="/web" replace/>:<Landing/>}
function RouteEffects(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0);document.title=`${pathname.startsWith('/partner/admin')?'Admin Dashboard':pathname.includes('/seller')?'Seller Studio':pathname.includes('/creator')?'Creator Center':pathname.startsWith('/web')?'Customer web':pathname.includes('register')?'Create your account':pathname.includes('login')?'Sign in':'People, products, possibilities'} | SOCIAL 24-7`;const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';if(pathname.startsWith('/partner/admin'))document.head.appendChild(robots);return()=>robots.remove()},[pathname]);return null}
class AppBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return{failed:true}}render(){return this.state.failed?<main className="public-info"><h1>This page could not load.</h1><p>Refresh the page to try again. Your saved account data is still on the server.</p><button className="public-cta" onClick={()=>window.location.reload()}>Reload page</button></main>:this.props.children}}
function NotFound(){return <div className="public-site"><PublicNav/><main id="main-content" className="public-info"><p className="public-kicker">PAGE NOT FOUND</p><h1>Let’s find your way back.</h1><p className="info-lead">This page may have moved. Your account and workspaces are available from the main navigation.</p><Link className="public-cta" to="/">Go to homepage</Link></main><PublicFooter/></div>}

export default function App(){return <AppBoundary><AuthProvider><RouteEffects/><Suspense fallback={<div className="route-loading" role="status">Loading your workspace…</div>}><Routes>
  <Route path="/business-login" element={<BusinessLogin/>}/><Route path="/business-activate" element={<BusinessLogin activate/>}/><Route path="/business-workspace" element={<BusinessWork/>}/>
  <Route path="/" element={<Home/>}/><Route path="/info/:kind" element={<InformationPage/>}/><Route path="/partner" element={<PartnerEntry/>}/>
  <Route path="/partner/login" element={<Login/>}/><Route path="/partner/register" element={<Register/>}/><Route path="/web/login" element={<Login/>}/><Route path="/web/register" element={<Register/>}/>
  <Route path="/login" element={<LegacyRoute from="/login" to="/partner/login"/>}/><Route path="/register" element={<LegacyRoute from="/register" to="/partner/register"/>}/>
  <Route element={<RequireAuth/>}>
    <Route path="/account" element={<Account/>}/>
    <Route path="/onboarding" element={<RoleSelection/>}/><Route path="/onboarding/:role" element={<OnboardingFlow/>}/><Route path="/partner/onboarding" element={<RoleSelection/>}/><Route path="/partner/onboarding/:role" element={<OnboardingFlow/>}/>
    <Route path="/application" element={<ApplicationStatusPage/>}/><Route path="/partner/application" element={<ApplicationStatusPage/>}/>
    <Route path="/web" element={<Navigate to="/web/chats" replace/>}/><Route path="/web/chats" element={<ConsumerWeb/>}/><Route path="/web/chat/:id" element={<ConsumerWeb/>}/><Route path="/web/orders" element={<ConsumerOrders/>}/>
  </Route>
  <Route element={<RequireAuth role="admin"/>}><Route path="/partner/admin" element={<AdminDashboard/>}/><Route path="/partner/admin/application/:kind/:id" element={<AdminDashboard/>}/><Route path="/partner/admin/*" element={<AdminDashboard/>}/></Route>
  <Route element={<RequireAuth role="seller"/>}><Route path="/partner/seller/chat" element={<WorkspaceShell role="seller"><BusinessChat/></WorkspaceShell>}/><Route path="/partner/seller/*" element={<SellerStudio/>}/></Route>
  <Route element={<RequireAuth role="creator"/>}><Route path="/partner/creator/chat" element={<WorkspaceShell role="creator"><BusinessChat/></WorkspaceShell>}/><Route path="/partner/creator/*" element={<CreatorCenter/>}/></Route>
  <Route path="/seller/*" element={<LegacyRoute from="/seller" to="/partner/seller"/>}/><Route path="/creator/*" element={<LegacyRoute from="/creator" to="/partner/creator"/>}/>
  <Route path="*" element={<NotFound/>}/>
</Routes></Suspense></AuthProvider></AppBoundary>}
