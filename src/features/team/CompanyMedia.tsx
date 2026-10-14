import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '../../lib/supabase'
import { companyMediaUrl, type CompanyMediaReference } from './companyMediaRepository'

export function CompanyMedia({ reference, alt, video = false }: { reference: CompanyMediaReference; alt: string; video?: boolean }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const load = useCallback(() => companyMediaUrl(requireSupabase(), { bucket: reference.bucket, path: reference.path }), [reference.bucket, reference.path])
  useEffect(() => {
    let active = true
    load().then(value => { if (active) { setUrl(value); setError('') } }).catch(cause => {
      if (active) { setUrl(''); setError(cause instanceof Error ? cause.message : 'Media could not be loaded.') }
    })
    const timer = reference.bucket === 'product-media' ? window.setTimeout(() => {
      if (active) { setUrl(''); setRevision(value => value + 1) }
    }, 240000) : undefined
    return () => { active = false; if (timer) window.clearTimeout(timer) }
  }, [load, revision, reference.bucket])
  if (error) return <div className="company-media-fallback"><p>{error}</p><button type="button" onClick={() => { setError(''); setUrl(''); setRevision(value => value + 1) }}>Retry media</button></div>
  if (!url) return <p className="company-media-fallback" role="status">Loading media…</p>
  return video ? <video className="company-feed-media" src={url} controls preload="metadata" aria-label={alt} onError={() => { setUrl(''); setError('This video is unavailable. Please retry.') }} /> : <img className="company-feed-media" src={url} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => { setUrl(''); setError('This image is unavailable. Please retry.') }} />
}
