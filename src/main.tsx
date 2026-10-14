import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { HostBoundary } from './components/HostBoundary'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <HostBoundary><App /></HostBoundary>
    </BrowserRouter>
  </StrictMode>,
)
