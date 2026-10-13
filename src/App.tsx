import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ApplicationStatusPage } from './pages/ApplicationStatus'
import { Login, Register } from './pages/Auth'
import { Landing } from './pages/Landing'
import { OnboardingWizard, RoleSelection } from './pages/Onboarding'
import { announcePreviewAction, PREVIEW_NOTICE_EVENT } from './utils/preview'

const SellerStudio = lazy(() => import('./pages/SellerStudio').then((module) => ({ default: module.SellerStudio })))
const CreatorCenter = lazy(() => import('./pages/CreatorCenter').then((module) => ({ default: module.CreatorCenter })))

export default function App() {
  const [notice, setNotice] = useState('')
  useEffect(() => {
    let timeout: number | undefined
    const handleNotice = (event: Event) => {
      setNotice((event as CustomEvent<string>).detail)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setNotice(''), 4000)
    }
    window.addEventListener(PREVIEW_NOTICE_EVENT, handleNotice)
    const handlePreviewControl = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest('.row-action, .evidence-button, .shipment-timeline button, .health-grid button')
      if (target && !(target as HTMLButtonElement).disabled) announcePreviewAction('This control is a Phase 1 interaction preview. No production record was changed.')
    }
    document.addEventListener('click', handlePreviewControl)
    return () => { window.removeEventListener(PREVIEW_NOTICE_EVENT, handleNotice); document.removeEventListener('click', handlePreviewControl); window.clearTimeout(timeout) }
  }, [])
  return <><Suspense fallback={<div className="route-loading" role="status">Loading workspace…</div>}><Routes>
    <Route path="/" element={<Landing/>}/>
    <Route path="/login" element={<Login/>}/>
    <Route path="/register" element={<Register/>}/>
    <Route path="/onboarding" element={<RoleSelection/>}/>
    <Route path="/onboarding/:role" element={<OnboardingWizard/>}/>
    <Route path="/application" element={<ApplicationStatusPage/>}/>
    <Route path="/seller/*" element={<SellerStudio/>}/>
    <Route path="/creator/*" element={<CreatorCenter/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></Suspense>{notice && <div className="preview-toast" role="status" aria-live="polite">{notice}</div>}</>
}
