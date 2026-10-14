import type { SupabaseClient } from '@supabase/supabase-js'
export interface ProfileSettings { phone_discoverable: boolean; username_discoverable: boolean; is_private: boolean; avatar_path: string | null }
export function validateAvatar(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
  if (!Number.isSafeInteger(file.size) || file.size < 1 || file.size > 5 * 1024 * 1024) throw new Error('Choose an image of 1 byte to 5 MiB.')
}
export class AvatarOutcomeUnknown extends Error {}
export function profileSettingsRepository(client: SupabaseClient, expectedUserId?: string) {
  async function owner() { const { data, error } = await client.auth.getUser(); if (error || !data.user) throw new Error('Sign in again to edit your profile.'); if (expectedUserId && data.user.id !== expectedUserId) throw new Error('The signed-in account changed. Reload your profile before saving.'); return data.user.id }
  return {
    async load(): Promise<ProfileSettings> { const id = await owner(); const { data, error } = await client.from('profiles').select('phone_discoverable,username_discoverable,is_private,avatar_path').eq('id', id).single(); if (error) throw error; if (!data) throw new Error('Profile settings were not returned.'); return { phone_discoverable: data.phone_discoverable === true, username_discoverable: data.username_discoverable !== false, is_private: data.is_private === true, avatar_path: data.avatar_path } },
    async save(draft: Omit<ProfileSettings, 'avatar_path'>) { if (![draft.phone_discoverable, draft.username_discoverable, draft.is_private].every(v => typeof v === 'boolean')) throw new Error('Choose valid privacy preferences.'); const id = await owner(); const { data, error } = await client.from('profiles').update({ phone_discoverable: draft.phone_discoverable, username_discoverable: draft.username_discoverable, is_private: draft.is_private }).eq('id', id).select('id').single(); if (error) throw error; if (!data) throw new Error('Privacy update was not confirmed. Refresh before retrying.') },
    async avatarUrl(path: string) { const id = await owner(); if (!path.startsWith(id + '/') || path.split('/').some(segment => segment === '..' || segment === '.')) throw new Error('Invalid profile image location.'); const { data, error } = await client.storage.from('profile-media').createSignedUrl(path, 300); if (error) throw error; return data.signedUrl },
    async upload(file: File) {
      validateAvatar(file); const id = await owner()
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
      const path = `${id}/avatar-${crypto.randomUUID()}.${extension}`
      const bucket = client.storage.from('profile-media')
      const uploaded = await bucket.upload(path, file, { contentType: file.type, upsert: false }); if (uploaded.error) throw uploaded.error
      try {
        const saved = await client.from('profiles').update({ avatar_path: path }).eq('id', id).select('id').single()
        if (saved.error) throw saved.error
        if (!saved.data) throw new Error('No updated profile was returned.')
      } catch (cause) {
        // Dispatch can commit even if its response is lost. Preserve the new object;
        // deleting it could break a successfully saved profile reference.
        throw new AvatarOutcomeUnknown('Image uploaded, but profile update could not be confirmed. The file was preserved. Reload saved settings before uploading again.', { cause })
      }
      return path
    },
  }
}
