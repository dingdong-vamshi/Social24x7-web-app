import { useEffect, useState } from 'react'

export function useRepository<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    loader().then((result) => { if (active) setData(result) }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loader])
  return { data, error, loading }
}
