import type { SupabaseClient } from '@supabase/supabase-js'

export interface SupervisedConversation {
  conversation_id: string; storefront_id: string; customer_display_name: string
  last_message: string; last_message_at: string; work_status: string
  assignee_membership_id: string | null; assignee_name: string | null
}
export interface SupervisedMessage {
  message_id: string; body: string; message_kind: string; created_at: string
  sender_type: string; sender_display_name: string; sender_tagline: string | null
  representative_verified: boolean
}

/** Reuse the mobile supervisor RPCs. No service key, impersonation or write operations. */
export function createTeamChatRepository(client: SupabaseClient) {
  async function conversations(storefrontId: string): Promise<SupervisedConversation[]> {
    const { data, error } = await client.rpc('get_business_workspace_inbox', { p_status: null }).eq('storefront_id', storefrontId)
    if (error) throw new Error(error.message)
    return ((data ?? []) as SupervisedConversation[]).filter(row => row.storefront_id === storefrontId)
  }
  return {
    conversations,
    async messages(storefrontId: string, conversationId: string, memberId: string): Promise<SupervisedMessage[]> {
      // Recheck current assignment/visibility before fetching history, including on refresh.
      const visible = await conversations(storefrontId)
      if (!visible.some(row => row.conversation_id === conversationId && (memberId === 'all' || (memberId === 'unassigned' ? !row.assignee_membership_id : row.assignee_membership_id === memberId)))) {
        throw new Error('This chat is no longer available in this team view. Refresh the conversation list.')
      }
      const { data, error } = await client.rpc('get_business_workspace_messages', { target_conversation: conversationId })
      if (error) throw new Error(error.message)
      return ((data ?? []) as SupervisedMessage[]).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.message_id.localeCompare(b.message_id))
    },
  }
}
