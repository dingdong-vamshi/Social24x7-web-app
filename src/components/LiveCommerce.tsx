import { useEffect, useState, type ReactNode } from 'react'
import { EmptyState, ErrorState, LoadingState, Button } from './Ui'

// Kept beside the async boundary so stale account data cannot flash during a loader change.
// eslint-disable-next-line react-refresh/only-export-components
export function useCommerce<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{ load: () => Promise<T>; data?: T; error?: string }>({ load })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    load().then((data) => { if (active) setState({ load, data }) }).catch((cause: unknown) => { if (active) setState({ load, error: cause instanceof Error ? cause.message : 'Unable to load your records.' }) })
    return () => { active = false }
  }, [load, revision])
  function refresh() { setState({ load }); setRevision((value) => value + 1) }
  return { data: state.load === load ? state.data : undefined, error: state.load === load ? state.error : undefined, refresh }
}

export function CommerceResult<T>({ result, children }: { result: ReturnType<typeof useCommerce<T>>; children: (data: T) => ReactNode }) {
  if (result.error) return <div role="alert"><ErrorState message={result.error} /><Button variant="secondary" onClick={result.refresh}>Try again</Button></div>
  if (result.data === undefined) return <div role="status"><LoadingState /></div>
  return <>{children(result.data)}</>
}

export function CommerceEmpty({ title = 'No records yet', description = 'Records from your account will appear here when available.' }: { title?: string; description?: string }) {
  return <EmptyState title={title} description={description} />
}

export function CommerceNote({ children }: { children: ReactNode }) { return <p className="commerce-note">{children}</p> }
