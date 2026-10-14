import type { SupabaseClient } from '@supabase/supabase-js';
import { createChatRepository, isUuid, mayCompose, type Conversation } from '../chat/repository';
import type { Post } from './repository';

export function createSocialShareRepository(client: SupabaseClient, viewerId: string) {
  const chats = createChatRepository(client, viewerId);
  const eligible = (conversation: Conversation) => ['personal', 'group'].includes(conversation.kind) && mayCompose(conversation, viewerId);
  return {
    async conversations(page: number) {
      const rows = await chats.listConversations(false, page);
      return { rows: rows.filter(eligible), hasNext: rows.length === 50 };
    },
    async send(conversationId: string, post: Post, clientId: string) {
      if (!isUuid(post.id) || !isUuid(conversationId) || !isUuid(clientId)) throw new Error('Invalid post or conversation.');
      const auth = await client.auth.getUser();
      if (auth.error || auth.data.user?.id !== viewerId || auth.data.user.app_metadata?.account_type === 'business_employee') throw new Error('Your personal account session changed. Reload before sharing.');
      const conversation = await chats.getConversation(conversationId);
      if (!conversation || !eligible(conversation)) throw new Error('Choose a personal or group conversation you can send to.');
      async function delivered() {
        const result = await client.from('messages').select('id').eq('conversation_id', conversationId).eq('sender_id', viewerId).eq('client_id', clientId).maybeSingle();
        if (result.error) throw new Error('Delivery could not be checked. Retry safely with this same share.');
        return result.data;
      }
      if (await delivered()) return;
      // Never turn visibility of an own private post into a caption leak to another account.
      const current = await client.from('posts').select('id,body,visibility').eq('id', post.id).eq('visibility', 'public').single();
      if (current.error || !current.data) throw new Error('This public post is no longer available for sharing.');
      const result = await client.rpc('send_personal_message', {
        target_conversation: conversationId,
        message_body: `Shared a post from ${post.author_username || post.author_display_name}`,
        message_kind: 'product',
        message_payload: { post: { id: current.data.id, author: post.author_username || post.author_display_name, caption: current.data.body || '' } },
        message_client_id: clientId,
      });
      if (result.error) {
        if (result.error.code === '23505' && await delivered()) return;
        throw new Error(result.error.code === '42501' ? 'Sending is no longer permitted for this conversation.' : 'Delivery could not be confirmed. Retry safely; the same share ID will be used.');
      }
    },
  };
}
export type SocialShareRepository = ReturnType<typeof createSocialShareRepository>;
