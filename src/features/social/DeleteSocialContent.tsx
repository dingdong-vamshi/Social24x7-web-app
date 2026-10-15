import { useState } from 'react'
import { SocialDialog } from './SocialDialog'

/** Ownership is checked by callers for presentation and by existing RLS on mutation. */
export function DeleteSocialContent({ kind, remove, removed, onOpenChange }: { kind: 'post' | 'comment' | 'story'; remove: () => Promise<void>; removed: () => void; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('')
  function close() { if (!busy) { setOpen(false); onOpenChange?.(false) } }
  async function confirm() {
    if (busy) return
    setBusy(true); setError('')
    try { await remove(); setOpen(false); onOpenChange?.(false); removed() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Deletion failed. Nothing was confirmed deleted. Please retry.') }
    finally { setBusy(false) }
  }
  return <><button type="button" className="social-delete" onClick={() => { setError(''); setOpen(true); onOpenChange?.(true) }}>Delete {kind}</button>{open && <SocialDialog title={`Delete ${kind}?`} close={close}><p>This permanently deletes your {kind}. This action cannot be undone.</p>{error && <p role="alert">{error}</p>}<div className="social-card-actions"><button type="button" className="button secondary" disabled={busy} onClick={close}>Cancel</button><button type="button" className="button danger" disabled={busy} onClick={() => void confirm()}>{busy ? 'Deleting…' : `Permanently delete ${kind}`}</button></div></SocialDialog>}</>
}
