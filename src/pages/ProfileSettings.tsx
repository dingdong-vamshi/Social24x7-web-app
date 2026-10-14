import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import { CommerceResult, useCommerce } from '../components/LiveCommerce'
import { Button, SectionCard } from '../components/Ui'
import { requireSupabase } from '../lib/supabase'
import { AvatarOutcomeUnknown, profileSettingsRepository, type ProfileSettings } from '../repositories/profileSettings'
import './ProfileSettings.css'
export function ProfilePrivacy() {
  const { user } = useAuth()
  const userId = user?.id
  const load = useCallback(() => profileSettingsRepository(requireSupabase(), userId).load(), [userId])
  const result = useCommerce(load)
  if (!userId) return null
  return <CommerceResult result={result}>{settings => <SettingsForm key={`${userId}:${JSON.stringify(settings)}`} userId={userId} initial={settings} refresh={result.refresh}/>}</CommerceResult>
}
function SettingsForm({ initial, refresh, userId }: { initial: ProfileSettings; refresh: () => void; userId: string }) {
  const { refreshProfile } = useAuth()
  const [draft, setDraft] = useState(initial), [file, setFile] = useState<File | null>(null), [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('')
  const [avatarPath, setAvatarPath] = useState(initial.avatar_path), [uncertain, setUncertain] = useState(false), [imageRevision, setImageRevision] = useState(0)
  const [imageError, setImageError] = useState('')
  const pending = useRef(false), fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    if (avatarPath) void profileSettingsRepository(requireSupabase(), userId).avatarUrl(avatarPath).then(value => { if (active) { setUrl(value); setImageError('') } }).catch(() => { if (active) setImageError('Current profile image is unavailable. Refresh image to retry; your saved preferences are still available.') })
    const expiry = setTimeout(() => { if (active) setUrl('') }, 290000)
    return () => { active = false; clearTimeout(expiry) }
  }, [avatarPath, userId, imageRevision])
  async function save(event: FormEvent, image: boolean) {
    event.preventDefault(); if (pending.current || (image && (!file || uncertain))) return
    pending.current = true
    setBusy(true); setError(''); setNotice('')
    try { const repository = profileSettingsRepository(requireSupabase(), userId); if (image) { const path = await repository.upload(file!); setAvatarPath(path); setFile(null); if (fileInput.current) fileInput.current.value = '' } else await repository.save(draft); setNotice(image ? 'Profile image saved. Unsaved privacy preferences are unchanged.' : 'Privacy preferences saved.'); await refreshProfile() }
    catch (cause) { setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : 'Changes could not be saved.'); if (cause instanceof AvatarOutcomeUnknown) setUncertain(true) }
    finally { pending.current = false; setBusy(false) }
  }
  return <div className="profile-settings"><SectionCard title="Profile image & privacy" description="Existing shared-account settings, not Seller or Creator approval controls.">
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <form className="commerce-form" onSubmit={event => void save(event, true)}><fieldset disabled={busy}>
      {url && <img src={url} alt="Your profile" width={96} height={96} style={{ objectFit: 'cover', borderRadius: '50%' }} onError={() => { setUrl(''); setImageError('Profile image unavailable. Refresh image to retry.') }}/>}<label>New profile image<input ref={fileInput} disabled={uncertain} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] || null)}/></label><p>JPEG, PNG or WebP · up to 5 MiB. Changes appear across app and web.</p>{imageError && <p role="status">{imageError}</p>}<Button type="submit" disabled={busy || !file || uncertain}>Save profile image</Button>{avatarPath && <Button variant="secondary" onClick={() => { setUrl(''); setImageError(''); setImageRevision(v => v + 1) }}>Refresh image</Button>}
    </fieldset></form>
    <form className="commerce-form" onSubmit={event => void save(event, false)}><fieldset disabled={busy}>
      <label><input type="checkbox" checked={draft.phone_discoverable} onChange={event => setDraft({ ...draft, phone_discoverable: event.target.checked })}/>Allow discovery by registered phone</label>
      <label><input type="checkbox" checked={draft.username_discoverable} onChange={event => setDraft({ ...draft, username_discoverable: event.target.checked })}/>Allow discovery by username</label>
      <label><input type="checkbox" checked={draft.is_private} onChange={event => setDraft({ ...draft, is_private: event.target.checked })}/>Private profile</label>
      <p>Private profile limits normal profile and avatar reads to you and removes you from the app’s public profile search. Phone and username choices control the existing discovery flow, not encryption or deletion of profile fields. Existing conversations and retained copies are not deleted. Chats do not become end-to-end encrypted.</p><Button type="submit" disabled={busy}>Save privacy preferences</Button>
    </fieldset></form>
    <Button variant="secondary" disabled={busy} onClick={refresh}>Reload saved settings (discard unsaved changes)</Button>
  </SectionCard></div>
}
