import type { SupabaseClient } from '@supabase/supabase-js'
import { isUuid, mayCompose, type Conversation, type Message } from './repository'

export const CHAT_ATTACHMENT_LIMIT = 104_857_600
export const CHAT_ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
export interface GroupContact { id: string; name: string; username: string; role?: 'admin' | 'member' }
export interface AttachmentDraft { file: File; storagePath: string; uploaded: boolean }
export class GroupCreationError extends Error {
  readonly uncertain: boolean
  constructor(message: string, uncertain: boolean) { super(message); this.name = 'GroupCreationError'; this.uncertain = uncertain }
}

export function validateChatFile(file: File) {
  if (!file.size || file.size > CHAT_ATTACHMENT_LIMIT) throw new Error('Choose a non-empty attachment up to 100 MiB.')
  if (!CHAT_ATTACHMENT_TYPES.includes(file.type)) throw new Error('Supported files: JPEG, PNG, WebP, MP4, MOV, WebM, PDF, plain text, DOC or DOCX.')
  if (!file.name.trim() || file.name.length > 180) throw new Error('Use a filename between 1 and 180 characters.')
}
export function newAttachmentDraft(file: File, conversationId: string, userId: string): AttachmentDraft {
  validateChatFile(file)
  if (!isUuid(conversationId) || !isUuid(userId)) throw new Error('A valid signed-in conversation is required.')
  const extension = file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1].toLowerCase() || 'bin'
  return { file, storagePath: `${conversationId}/${userId}/${crypto.randomUUID()}.${extension}`, uploaded: false }
}

const contacts = (rows: Record<string, unknown>[]): GroupContact[] => rows.map(row => ({
  id: String(row.id), name: String(row.display_name || row.username || 'Member'), username: String(row.username || ''),
  ...(row.member_role ? { role: row.member_role === 'admin' ? 'admin' as const : 'member' as const } : {}),
}))

export function createConsumerExtensions(client: SupabaseClient, userId: string) {
  return {
    async listGroupContacts(): Promise<GroupContact[]> {
      const { data, error } = await client.rpc('list_group_eligible_contacts')
      if (error) throw new Error('Accepted contacts could not be loaded. Please retry.')
      return contacts((data ?? []) as Record<string, unknown>[]).filter(contact => contact.id !== userId)
    },
    async createGroup(name: string, memberIds: string[]): Promise<string> {
      const members = [...new Set(memberIds)].filter(id => id !== userId)
      if (name.trim().length < 2 || name.trim().length > 80 || members.length < 2 || members.some(id => !isUuid(id))) {
        throw new GroupCreationError('Use a name of 2–80 characters and select at least two accepted contacts.', false)
      }
      try {
        const { data, error } = await client.rpc('create_group_conversation', { group_name: name.trim(), member_ids: members })
        if (error) {
          // A PostgreSQL error confirms transaction rollback; network/HTTP failures do not.
          if (error.code && /^[0-9A-Z]{5}$/.test(error.code)) throw new GroupCreationError(error.message, false)
          throw new GroupCreationError('Creation could not be confirmed. Refresh your conversations before starting another group; this request will not be sent again automatically.', true)
        }
        if (typeof data !== 'string' || !isUuid(data)) throw new GroupCreationError('The group may have been created, but its ID was not returned. Check your conversations before creating another.', true)
        return data
      } catch (cause) {
        if (cause instanceof GroupCreationError) throw cause
        throw new GroupCreationError('Creation could not be confirmed. Check your conversations before creating another group.', true)
      }
    },
    async listGroupMembers(conversation: Conversation): Promise<GroupContact[]> {
      if (conversation.kind !== 'group' || !conversation.conversation_participants.some(p => p.user_id === userId)) throw new Error('Group membership is required.')
      const { data, error } = await client.rpc('get_group_members', { target_conversation: conversation.id })
      if (error || !data?.length) throw new Error('Group members are unavailable or your access has changed.')
      return contacts(data as Record<string, unknown>[])
    },
    async sendAttachment(conversation: Conversation, draft: AttachmentDraft, onStage?: (stage: string) => void): Promise<Message> {
      if (!mayCompose(conversation, userId)) throw new Error('This conversation is read-only in this workspace.')
      validateChatFile(draft.file)
      if (!draft.storagePath.startsWith(`${conversation.id}/${userId}/`) || !/^[a-f0-9-]+\.[a-z0-9]{1,8}$/.test(draft.storagePath.split('/')[2] || '') || draft.storagePath.split('/').length !== 3) throw new Error('Invalid upload identity. Select the file again.')
      async function existing(): Promise<Message | null> {
        const { data, error } = await client.from('chat_attachments').select('id,status')
          .eq('conversation_id', conversation.id).eq('sender_id', userId).eq('storage_path', draft.storagePath).maybeSingle()
        if (error) throw new Error('Attachment delivery could not be checked. Retry when connected; no new upload was started.')
        if (!data) return null
        if (data.status !== 'finalized') throw new Error('This attachment is no longer available. Refresh the conversation.')
        const result = await client.from('messages').select('*').eq('conversation_id', conversation.id).eq('sender_id', userId).eq('payload->>attachment_id', data.id).maybeSingle()
        if (result.error || !result.data) throw new Error('The attachment exists but message delivery could not be confirmed. Refresh and check the conversation; do not send a second copy.')
        return result.data as Message
      }
      onStage?.('Checking delivery…')
      const delivered = await existing()
      if (delivered) return delivered
      if (!draft.uploaded) {
        onStage?.('Uploading attachment…')
        const upload = await client.storage.from('chat-media').upload(draft.storagePath, draft.file, { contentType: draft.file.type, upsert: false })
        // The same high-entropy path is retained for every retry. A conflict means a
        // previous upload completed; the RPC still validates owner, MIME and byte size.
        if (upload.error && String(upload.error.statusCode) !== '409' && upload.error.message !== 'The resource already exists') {
          throw new Error('Upload could not be confirmed. Retry this same draft to check safely.')
        }
        draft.uploaded = true
      }
      onStage?.('Finalizing attachment…')
      try {
        const { data, error } = await client.rpc('send_chat_attachment', {
          target_conversation: conversation.id, target_storage_path: draft.storagePath,
          target_filename: draft.file.name, target_mime_type: draft.file.type, target_bytes: draft.file.size,
          target_width: null, target_height: null, target_duration_ms: null,
          target_source: draft.file.type.startsWith('image/') || draft.file.type.startsWith('video/') ? 'gallery' : 'document_picker',
        })
        if (error || !data?.id) throw new Error('Attachment delivery could not be confirmed. Retry this same draft to check safely.')
        return data as Message
      } catch (cause) {
        // Never delete an object after an ambiguous response: the message may have
        // committed. storage_path uniqueness makes repeated finalization safe.
        const confirmed = await existing()
        if (confirmed) return confirmed
        throw cause
      }
    },
  }
}
