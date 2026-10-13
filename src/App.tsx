import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ApplicationStatusPage } from './pages/ApplicationStatus'
import { Login, Register } from './pages/Auth'
import { Landing } from './pages/Landing'
import { OnboardingWizard, RoleSelection } from './pages/Onboarding'

const SellerStudio = lazy(() => import('./pages/SellerStudio').then((module) => ({ default: module.SellerStudio })))
const CreatorCenter = lazy(() => import('./pages/CreatorCenter').then((module) => ({ default: module.CreatorCenter })))

export default function App() {
  return <Suspense fallback={<div className="route-loading" role="status">Loading workspace…</div>}><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/onboarding" element={<RoleSelection/>}/>
    <Route path="/onboarding/:role" element={<OnboardingWizard/>}/>
    <Route path="/application" element={<ApplicationStatusPage/>}/>
    <Route path="/seller/*" element={<SellerStudio/>}/>
    <Route path="/creator/*" element={<CreatorCenter/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Suspense>
}
