import { lazy, Suspense, useEffect } from 'react'
import { AppBoundary } from './components/AppBoundary'
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
import { AuthCallback } from './pages/AuthCallback'
import { ForgotPassword, ResetPassword } from './pages/PasswordRecovery'
import { CustomerLink } from './pages/CustomerLink'
import { pageTitle } from './lib/pageTitle'
const Social = lazy(() => import('./pages/Social').then(module => ({ default: module.Social })))

const BusinessLogin = lazy(() => import('./pages/BusinessWork').then(module => ({ default: module.BusinessLogin })))
const BusinessWork = lazy(() => import('./pages/BusinessWork').then(module => ({ default: module.BusinessWork })))
const SellerStudio = lazy(() => import('./pages/SellerStudio').then(module => ({ default: module.SellerStudio })))
const ProfessionalVerification = lazy(() => import('./pages/ProfessionalVerification').then(module => ({ default: module.ProfessionalVerification })))
const CreatorCenter = lazy(() => import('./pages/CreatorCenter').then(module => ({ default: module.CreatorCenter })))
const ConsumerWeb = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.ConsumerWeb })))
const ConsumerOrders = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.ConsumerOrders })))
const BusinessChat = lazy(() => import('./pages/ConsumerWeb').then(module => ({ default: module.BusinessChat })))
const AdminDashboard = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminDashboard })))

function LegacyRoute({from,to}:{from:string;to:string}){const location=useLocation();return <Navigate to={location.pathname.replace(from,to)+location.search+location.hash} replace/>}
function Home(){return <Landing/>}
function RouteEffects(){const {pathname}=useLocation();useEffect(()=>{window.scrollTo(0,0);document.title=`${pageTitle(pathname)} | SOCIAL 24-7`;const robots=document.createElement('meta');robots.name='robots';robots.content='noindex, nofollow';if(pathname.startsWith('/partner/admin'))document.head.appendChild(robots);return()=>robots.remove()},[pathname]);return null}
function NotFound(){return <div className="public-site"><PublicNav/><main id="main-content" className="public-info"><p className="public-kicker">PAGE NOT FOUND</p><h1>Let’s find your way back.</h1><p className="info-lead">This page may have moved. Your account and workspaces are available from the main navigation.</p><Link className="public-cta" to="/">Go to homepage</Link></main><PublicFooter/></div>}

export default function App(){return <AppBoundary><AuthProvider><RouteEffects/><Suspense fallback={<div className="route-loading" role="status">Loading your workspace…</div>}><Routes>
  <Route path="/business-login" element={<BusinessLogin/>}/><Route path="/business-activate" element={<BusinessLogin activate/>}/><Route path="/business-workspace" element={<BusinessWork/>}/>
  <Route path="/" element={<Home/>}/><Route path="/info/:kind" element={<InformationPage/>}/><Route path="/partner" element={<PartnerEntry/>}/>
  <Route path="/auth/callback/:intent" element={<AuthCallback/>}/><Route path="/partner/forgot-password" element={<ForgotPassword/>}/><Route path="/auth/reset-password" element={<ResetPassword/>}/><Route path="/web" element={<CustomerLink/>}/><Route path="/web/app/*" element={<CustomerLink/>}/>
  <Route path="/partner/login" element={<Login/>}/><Route path="/partner/register" element={<Register/>}/><Route path="/web/login" element={<Navigate to="/web" replace/>}/><Route path="/web/register" element={<Navigate to="/web" replace/>}/>
  <Route path="/login" element={<LegacyRoute from="/login" to="/partner/login"/>}/><Route path="/register" element={<LegacyRoute from="/register" to="/partner/register"/>}/>
  <Route element={<RequireAuth/>}>
    <Route path="/account" element={<Account/>}/>
    <Route path="/onboarding" element={<RoleSelection/>}/><Route path="/onboarding/:role" element={<OnboardingFlow/>}/><Route path="/partner/onboarding" element={<RoleSelection/>}/><Route path="/partner/onboarding/:role" element={<OnboardingFlow/>}/>
    <Route path="/application" element={<ApplicationStatusPage/>}/><Route path="/partner/application" element={<ApplicationStatusPage/>}/>
    <Route path="/account/chats" element={<ConsumerWeb/>}/><Route path="/account/chat/:id" element={<ConsumerWeb/>}/><Route path="/account/orders" element={<ConsumerOrders/>}/><Route path="/account/social/*" element={<Social/>}/>
    <Route path="/web/chats" element={<Navigate to="/account/chats" replace/>}/><Route path="/web/chat/:id" element={<LegacyRoute from="/web/chat/" to="/account/chat/"/>}/><Route path="/web/orders" element={<Navigate to="/account/orders" replace/>}/>
  </Route>
  <Route element={<RequireAuth role="admin"/>}><Route path="/partner/admin" element={<AdminDashboard/>}/><Route path="/partner/admin/application/:kind/:id" element={<AdminDashboard/>}/><Route path="/partner/admin/*" element={<AdminDashboard/>}/></Route>
  <Route element={<RequireAuth role="seller"/>}><Route path="/partner/seller/social/*" element={<WorkspaceShell role="seller"><Social seller/></WorkspaceShell>}/><Route path="/partner/seller/chat" element={<WorkspaceShell role="seller"><BusinessChat/></WorkspaceShell>}/><Route path="/partner/seller/creator-chat" element={<WorkspaceShell role="seller"><BusinessChat/></WorkspaceShell>}/><Route path="/partner/seller/*" element={<SellerStudio/>}/></Route>
  <Route element={<RequireAuth role="creator"/>}><Route path="/partner/creator/social/*" element={<WorkspaceShell role="creator"><Social creator/></WorkspaceShell>}/><Route path="/partner/creator/professional" element={<ProfessionalVerification/>}/><Route path="/partner/creator/chat" element={<WorkspaceShell role="creator"><BusinessChat/></WorkspaceShell>}/><Route path="/partner/creator/*" element={<CreatorCenter/>}/></Route>
  <Route path="/seller/*" element={<LegacyRoute from="/seller" to="/partner/seller"/>}/><Route path="/creator/*" element={<LegacyRoute from="/creator" to="/partner/creator"/>}/>
  <Route path="*" element={<NotFound/>}/>
</Routes></Suspense></AuthProvider></AppBoundary>}
