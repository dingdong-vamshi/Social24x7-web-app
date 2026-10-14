import type { SupabaseClient } from '@supabase/supabase-js'
import { verifiedDisplayNames } from '../../auth/publicIdentity'
export interface PersonalContact { id: string; username: string; display_name: string; request_state: 'none' | 'incoming' | 'outgoing' | 'accepted' }
export function createPersonalDiscovery(client: SupabaseClient) {
  async function contacts(name: string, args?: Record<string, string>): Promise<PersonalContact[]> {
    const result = await client.rpc(name, args)
    if (result.error) throw new Error('Profiles could not be loaded. Wait a moment and retry.')
    const rows = (result.data || []) as PersonalContact[]
    const names = await verifiedDisplayNames(client, rows.map(row => row.id))
    return rows.map(row => ({ ...row, display_name: names[row.id] || row.display_name }))
  }
  return {
    async searchUsernames(query: string) {
      const normalized = query.trim().replace(/^@/, '').toLowerCase()
      if (!/^[a-z0-9_]{3,30}$/.test(normalized)) throw new Error('Enter 3–30 username characters: letters, numbers or underscores.')
      return contacts('search_partner_chat_usernames', { p_query: normalized })
    },
    incomingRequests: () => contacts('list_partner_chat_requests'),
    async requestPersonalChat(id: string, action: 'request' | 'accept' | 'decline') {
      if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid profile.')
      const { data, error } = await client.rpc('partner_chat_request', { p_target: id, p_action: action })
      if (error || !data || data.state === 'rate_limited') throw new Error('This request is unavailable. Wait a moment and refresh to check access.')
      if (data.state === 'accepted' && (typeof data.conversation_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(data.conversation_id))) throw new Error('Conversation could not be confirmed. Refresh before retrying.')
      return data as { state: 'accepted' | 'incoming' | 'outgoing' | 'declined'; conversation_id?: string }
    },
  }
}
