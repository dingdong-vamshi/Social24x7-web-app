import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hostRedirect } from '../lib/domains'

function OtherOrigin({ destination }: { destination: string }) {
  useEffect(() => { window.location.replace(destination) }, [destination])
  return <main className="public-info" role="status"><h1>Opening the right workspace…</h1><a href={destination} referrerPolicy="no-referrer">Continue</a></main>
}
export function HostBoundary({ children }: { children: ReactNode }) {
  const location = useLocation()
  const destination = hostRedirect(window.location.hostname, location.pathname + location.search + location.hash)
  if (destination) return destination.startsWith('/') ? <Navigate to={destination} replace /> : <OtherOrigin destination={destination} />
  return children
}
