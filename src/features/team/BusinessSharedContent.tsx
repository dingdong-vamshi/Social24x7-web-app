import { useEffect, useState } from 'react'
import { requireSupabase } from '../../lib/supabase'
import { label } from '../../repositories/commerce'
import { readBusinessSharedContent, type BusinessSharedContent as SharedContent } from './businessContentRepository'

export function BusinessSharedContent({ storefrontId, conversationId, messageId }: { storefrontId: string; conversationId: string; messageId: string }) {
  const [content, setContent] = useState<SharedContent | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (content?.type !== 'attachment') return
    const timer = window.setTimeout(() => { setContent(null); setError('Secure link expired. Open the content again to recheck access.') }, 55000)
    return () => window.clearTimeout(timer)
  }, [content])
  async function open() {
    if (busy) return
    setBusy(true); setError(''); setContent(null)
    try { setContent(await readBusinessSharedContent(requireSupabase(), storefrontId, conversationId, messageId)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Shared content could not be opened.') }
    finally { setBusy(false) }
  }
  return <div className="business-shared-content">
    {!content && <button type="button" className="button secondary" disabled={busy} onClick={() => void open()}>{busy ? 'Checking access…' : 'View shared content'}</button>}
    {error && <p role="status">{error}</p>}
    {content?.type === 'attachment' && <>
      {content.media === 'image' ? <img src={content.url} alt={content.filename} referrerPolicy="no-referrer" onError={() => { setContent(null); setError('This image is unavailable. Please retry.') }}/>
        : content.media === 'video' ? <video src={content.url} controls preload="metadata" aria-label={content.filename}/>
        : content.media === 'audio' ? <audio src={content.url} controls preload="metadata" aria-label={content.filename}/>
        : <a href={content.url} target="_blank" rel="noreferrer">Open {content.filename}</a>}
    </>}
    {content?.type === 'product' && <><strong>{content.title}</strong><p>{(content.priceMinor / 100).toLocaleString('en-IN', { style: 'currency', currency: /^[A-Z]{3}$/.test(content.currency) ? content.currency : 'INR' })}</p><small>Current company product · viewing does not place an order.</small></>}
    {content?.type === 'order' && <><strong>Order #{content.id.slice(0, 8).toUpperCase()}</strong><p>{label(content.status)}</p>{content.items.map((item, index) => <p key={index}>{item.title} · Quantity {item.quantity}</p>)}<small>Order snapshot recorded in this conversation. No payment or return action is performed.</small></>}
    {content?.type === 'post' && <><strong>Shared post</strong><p>{content.caption || 'Shared company conversation content'}</p></>}
  </div>
}
