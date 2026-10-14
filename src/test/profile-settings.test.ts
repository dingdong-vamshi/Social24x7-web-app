import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AvatarOutcomeUnknown, profileSettingsRepository, validateAvatar } from '../repositories/profileSettings'
import { createElement } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ProfilePrivacy } from '../pages/ProfileSettings'

const ui = vi.hoisted(() => ({ user: { id: 'self' }, client: {} as unknown, refreshProfile: vi.fn(async () => {}) }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: ui.user, refreshProfile: ui.refreshProfile }) }))
vi.mock('../lib/supabase', () => ({ requireSupabase: () => ui.client }))

function uiClient() {
  ui.user = { id: 'self' }
  const storage = { upload: vi.fn(async () => ({ data: {}, error: null })), createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://example.test/private-avatar' }, error: null })) }
  ui.client = { auth: { getUser: async () => ({ data: { user: ui.user }, error: null }) }, storage: { from: () => storage }, from: () => {
    let writing = false
    const query = { select: vi.fn(), eq: vi.fn(), update: vi.fn(() => { writing = true; return query }), single: async () => ({ data: writing ? { id: ui.user.id } : { phone_discoverable: false, username_discoverable: true, is_private: false, avatar_path: null }, error: null }) }
    query.select.mockReturnValue(query); query.eq.mockReturnValue(query)
    return query
  } }
  return storage
}
describe('profile image and privacy safety', () => {
  it('accepts bounded raster images only', () => {
    expect(() => validateAvatar({ type: 'image/jpeg', size: 100 })).not.toThrow()
    for (const file of [{ type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 6 * 1024 * 1024 }]) expect(() => validateAvatar(file)).toThrow()
  })
  it('rejects unauthenticated changes before a database write', async () => {
    const from = vi.fn()
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: null }, error: null }) }, from } as unknown as SupabaseClient)
    await expect(repository.save({ is_private: true, phone_discoverable: false, username_discoverable: false })).rejects.toThrow('Sign in')
    expect(from).not.toHaveBeenCalled()
  })
  it('cannot sign another users image path', async () => {
    const storage = { from: vi.fn() }
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'self' } }, error: null }) }, storage } as unknown as SupabaseClient)
    await expect(repository.avatarUrl('someone-else/avatar.jpg')).rejects.toThrow('Invalid profile image')
    expect(storage.from).not.toHaveBeenCalled()
  })
  it('writes only privacy fields for the authenticated owner', async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => ({ data: { id: 'self' }, error: null })) }
    query.update.mockReturnValue(query); query.eq.mockReturnValue(query); query.select.mockReturnValue(query)
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'self' } }, error: null }) }, from: () => query } as unknown as SupabaseClient)
    await repository.save({ is_private: true, phone_discoverable: false, username_discoverable: true, avatar_path: 'injected', admin_access: true } as never)
    expect(query.update).toHaveBeenCalledWith({ is_private: true, phone_discoverable: false, username_discoverable: true })
    expect(query.eq).toHaveBeenCalledWith('id', 'self')
  })
  it('rejects a stale editor after switching accounts', async () => {
    const from = vi.fn()
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'new-user' } }, error: null }) }, from } as unknown as SupabaseClient, 'old-user')
    await expect(repository.save({ is_private: true, phone_discoverable: false, username_discoverable: false })).rejects.toThrow('account changed')
    expect(from).not.toHaveBeenCalled()
  })
  it('does not accept malformed privacy values or silently report a zero-row save', async () => {
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn(async () => ({ data: null, error: null })) }
    query.update.mockReturnValue(query); query.eq.mockReturnValue(query); query.select.mockReturnValue(query)
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'self' } }, error: null }) }, from: () => query } as unknown as SupabaseClient)
    await expect(repository.save({ is_private: 'yes', phone_discoverable: false, username_discoverable: true } as never)).rejects.toThrow('valid privacy')
    expect(query.update).not.toHaveBeenCalled()
    await expect(repository.save({ is_private: true, phone_discoverable: false, username_discoverable: true })).rejects.toThrow('not confirmed')
  })
  it('rejects path traversal even under the apparent owner prefix', async () => {
    const storage = { from: vi.fn() }
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'self' } }, error: null }) }, storage } as unknown as SupabaseClient)
    await expect(repository.avatarUrl('self/../another/avatar.jpg')).rejects.toThrow('Invalid profile image')
    expect(storage.from).not.toHaveBeenCalled()
  })
  it.each(['returned-error', 'lost-response'])('preserves a possibly committed avatar on %s instead of deleting it', async outcome => {
    const bucket = { upload: vi.fn(async () => ({ data: {}, error: null })), remove: vi.fn() }
    const query = { update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }
    query.update.mockReturnValue(query); query.eq.mockReturnValue(query); query.select.mockReturnValue(query)
    if (outcome === 'lost-response') query.single.mockRejectedValue(new Error('Network disconnected'))
    else query.single.mockResolvedValue({ data: null, error: { message: 'Unknown upstream result' } })
    const repository = profileSettingsRepository({ auth: { getUser: async () => ({ data: { user: { id: 'self' } }, error: null }) }, from: () => query, storage: { from: () => bucket } } as unknown as SupabaseClient)
    await expect(repository.upload(new File(['x'], 'image.png', { type: 'image/png' }))).rejects.toBeInstanceOf(AvatarOutcomeUnknown)
    expect(bucket.remove).not.toHaveBeenCalled()
    expect(bucket.upload).toHaveBeenCalledWith(expect.stringMatching(/^self\/avatar-.+\.png$/), expect.any(File), { contentType: 'image/png', upsert: false })
  })
})

describe('profile settings state isolation', () => {
  it('keeps unsaved privacy preferences when only the avatar is saved', async () => {
    uiClient()
    render(createElement(ProfilePrivacy))
    const privateToggle = await screen.findByLabelText('Private profile')
    fireEvent.click(privateToggle)
    const upload = screen.getByLabelText('New profile image')
    fireEvent.change(upload, { target: { files: [new File(['x'], 'avatar.png', { type: 'image/png' })] } })
    fireEvent.submit(upload.closest('form')!)
    await waitFor(() => expect(screen.getByText('Profile image saved. Unsaved privacy preferences are unchanged.')).toBeInTheDocument())
    expect(privateToggle).toBeChecked()
  })
  it('clears the previous account draft immediately when identity changes', async () => {
    uiClient()
    const view = render(createElement(ProfilePrivacy))
    fireEvent.click(await screen.findByLabelText('Private profile'))
    expect(screen.getByLabelText('Private profile')).toBeChecked()
    ui.user = { id: 'second-user' }
    view.rerender(createElement(ProfilePrivacy))
    expect(screen.queryByLabelText('Private profile')).not.toBeInTheDocument()
    expect(await screen.findByLabelText('Private profile')).not.toBeChecked()
  })
})
