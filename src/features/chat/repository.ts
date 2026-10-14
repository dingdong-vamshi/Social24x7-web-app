import type { SupabaseClient } from '@supabase/supabase-js'
import { createConsumerExtensions } from './consumerExtensions'
import { createPersonalDiscovery } from './personalDiscovery'
import { verifiedDisplayNames } from '../../auth/publicIdentity'

export type ConversationKind = 'personal' | 'group' | 'business'
export interface Participant { user_id: string; last_read_at: string | null; cleared_at: string | null; archived_at: string | null }
export interface Conversation {
  id: string; kind: ConversationKind; title: string | null; updated_at: string
  business_context: string | null; business_customer_id: string | null; storefront_id: string | null
  conversation_participants: Participant[]; name: string; names: Record<string, string>; storeName: string | null
}
export interface Message {
  id: string; conversation_id: string; sender_id: string | null; kind: string; body: string | null
  payload: Record<string, unknown> | null; client_id: string | null; created_at: string
  edited_at: string | null; deleted_at: string | null; expires_at: string | null
}
export interface Attachment { id: string; storage_path: string; original_filename: string; attachment_type: string; mime_type: string; bytes: number }
export interface CustomerOrder {
  id: string; status: string; currency: string; total_minor: number; payment_status: string; created_at: string
  order_items: { id: string; product_title_snapshot: string; storefront_name_snapshot: string; quantity: number; subtotal_minor: number }[]
  order_fulfillments: { status: string; carrier: string | null; tracking_number: string | null; customer_note: string | null } | null
}

const fields = 'id,conversation_id,sender_id,kind,body,payload,client_id,created_at,edited_at,deleted_at,expires_at'
const conversationFields = 'id,kind,title,updated_at,business_context,business_customer_id,storefront_id,conversation_participants(user_id,last_read_at,cleared_at,archived_at)'
export const PAGE_SIZE = 50
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export const text = (value: unknown) => typeof value === 'string' ? value : ''
export const visibleMessages = (messages: Message[], clearedAt?: string | null, now = Date.now()) => messages.filter(message => !message.deleted_at && (!message.expires_at || Date.parse(message.expires_at) > now) && (!clearedAt || message.created_at > clearedAt))
export function mergeMessages(...pages: Message[][]): Message[] {
  const messages = new Map<string, Message>()
  for (const page of pages) for (const message of page) messages.set(message.id, message)
  return [...messages.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
}
export function mayCompose(conversation: Conversation, userId: string) {
  // Store owners can monitor customer chats, but replying requires the established
  // work identity/assignment flow. Do not bypass that flow with a personal session.
  return conversation.conversation_participants.some(p => p.user_id === userId) &&
    !(conversation.kind === 'business' && conversation.business_context === 'buyer_seller' && conversation.business_customer_id !== userId)
}

export function createChatRepository(client: SupabaseClient, userId: string) {
  async function decorate(rows: Omit<Conversation, 'name' | 'names' | 'storeName'>[]): Promise<Conversation[]> {
    const ids = [...new Set(rows.flatMap(row => row.conversation_participants.map(p => p.user_id)))]
    const storeIds = [...new Set(rows.flatMap(row => row.storefront_id ? [row.storefront_id] : []))]
    const [profiles, stores] = await Promise.all([
      ids.length ? client.from('profiles').select('id,display_name,username').in('id', ids) : { data: [], error: null },
      storeIds.length ? client.from('storefronts').select('id,name').in('id', storeIds) : { data: [], error: null },
    ])
    if (profiles.error || stores.error) throw new Error('Conversation names could not be loaded. Please retry.')
    const names: Record<string, string> = Object.fromEntries((profiles.data ?? []).map(p => [p.id, p.display_name || p.username || 'Member']))
    Object.assign(names, await verifiedDisplayNames(client, ids))
    return rows.map(row => {
      const storeName = stores.data?.find(store => store.id === row.storefront_id)?.name ?? null
      const others = row.conversation_participants.filter(p => p.user_id !== userId).map(p => names[p.user_id] || 'Member')
      const customerName = row.business_customer_id && row.business_customer_id !== userId ? names[row.business_customer_id] || 'Customer' : null
      const businessName = customerName ? [customerName, storeName].filter(Boolean).join(' · ') : storeName
      return { ...row, names, storeName, name: row.title || (row.kind === 'business' ? businessName : null) || others.join(', ') || (row.kind === 'group' ? 'Group conversation' : 'Conversation') }
    })
  }
  async function getConversation(id: string, businessOnly = false) {
    if (!isUuid(id)) return null
    let query = client.from('conversations').select(conversationFields).eq('id', id).in('kind', businessOnly ? ['business'] : ['personal', 'group', 'business'])
    if (!businessOnly) query = query.or(`kind.neq.business,business_customer_id.eq.${userId},business_context.eq.creator_seller`)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error('This conversation could not be loaded. Please retry.')
    if (!data || !data.conversation_participants.some(p => p.user_id === userId)) return null
    return (await decorate([data as Omit<Conversation, 'name' | 'names' | 'storeName'>]))[0]
  }
  function messageQuery(conversation: Conversation) {
    const clearedAt = conversation.conversation_participants.find(p => p.user_id === userId)?.cleared_at
    let query = client.from('messages').select(fields).eq('conversation_id', conversation.id).is('deleted_at', null)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    if (clearedAt) query = query.gt('created_at', clearedAt)
    return query
  }
  async function listMessages(conversation: Conversation, before?: Message) {
    let query = messageQuery(conversation)
    if (before) {
      if (!isUuid(before.id) || !Number.isFinite(Date.parse(before.created_at))) throw new Error('Invalid history cursor.')
      query = query.or(`created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id})`)
    }
    const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE_SIZE)
    if (error) throw new Error('Messages could not be loaded. Please retry.')
    return mergeMessages((data ?? []) as Message[])
  }
  return {
    ...createConsumerExtensions(client, userId),
    ...createPersonalDiscovery(client),
    getConversation,
    async listConversations(businessOnly = false, page = 0) {
      let query = client.from('conversations').select(conversationFields).in('kind', businessOnly ? ['business'] : ['personal', 'group', 'business'])
      if (!businessOnly) query = query.or(`kind.neq.business,business_customer_id.eq.${userId},business_context.eq.creator_seller`)
      const { data, error } = await query.order('updated_at', { ascending: false }).order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw new Error('Conversations could not be loaded. Please retry.')
      // RLS remains authoritative. The explicit membership filter prevents accidentally
      // rendering a differently authorized role's conversations in this consumer view.
      return decorate(((data ?? []) as Omit<Conversation, 'name' | 'names' | 'storeName'>[]).filter(row => row.conversation_participants.some(p => p.user_id === userId)))
    },
    listMessages,
    async reconcile(conversation: Conversation, current: Message[]) {
      let latest = await listMessages(conversation)
      // Catch up every page after an offline gap, not just the latest 50 rows.
      const lastKnown = current.at(-1)
      let page = latest
      while (lastKnown && page.length === PAGE_SIZE && page[0].created_at >= lastKnown.created_at && !page.some(message => message.id === lastKnown.id)) {
        page = await listMessages(conversation, page[0])
        latest = mergeMessages(page, latest)
      }
      const recentIds = new Set(latest.map(m => m.id))
      const oldIds = current.filter(m => !recentIds.has(m.id)).map(m => m.id)
      const older: Message[] = []
      for (let i = 0; i < oldIds.length; i += 100) {
        const { data, error } = await messageQuery(conversation).in('id', oldIds.slice(i, i + 100))
        if (error) throw new Error('Message history could not be refreshed. Please retry.')
        older.push(...((data ?? []) as Message[]))
      }
      return mergeMessages(older, latest)
    },
    async send(conversation: Conversation, body: string, clientId: string) {
      if (!mayCompose(conversation, userId)) throw new Error('This conversation is read-only in this workspace.')
      if (!body.trim() || body.trim().length > 2000) throw new Error('Enter a message between 1 and 2,000 characters.')
      // A retry keeps the same client_id. Reconcile an uncertain network response
      // before sending, and recover the canonical row after a unique-key conflict.
      async function findExisting() {
        const { data, error } = await client.from('messages').select(fields).eq('conversation_id', conversation.id).eq('sender_id', userId).eq('client_id', clientId).maybeSingle()
        if (error) throw new Error('Could not verify delivery. Check your connection and retry.')
        return data as Message | null
      }
      const existing = await findExisting()
      if (existing) return existing
      const { data, error } = await client.rpc('send_personal_message', { target_conversation: conversation.id, message_body: body.trim(), message_kind: 'text', message_payload: {}, message_client_id: clientId })
      if (error) {
        if (error.code === '23505') { const delivered = await findExisting(); if (delivered) return delivered }
        throw new Error(error.code === '42501' ? 'Sending is not permitted. The conversation or your assignment may have changed.' : 'Delivery could not be confirmed. Retry to check and send safely.')
      }
      return data as Message
    },
    async markRead(id: string) {
      const { error } = await client.rpc('mark_personal_conversation_read', { target_conversation: id })
      if (error) throw new Error('Read status could not be updated.')
    },
    async openAttachment(conversationId: string, attachmentId: string): Promise<{ attachment: Attachment; url: string }> {
      if (!isUuid(attachmentId)) throw new Error('Attachment is unavailable.')
      const { data, error } = await client.from('chat_attachments').select('id,storage_path,original_filename,attachment_type,mime_type,bytes').eq('id', attachmentId).eq('conversation_id', conversationId).maybeSingle()
      if (error || !data) throw new Error('This attachment is unavailable or you no longer have access.')
      const signed = await client.storage.from('chat-media').createSignedUrl(data.storage_path, 60, { download: data.original_filename })
      if (signed.error || !signed.data?.signedUrl) throw new Error('This attachment could not be opened. Please retry.')
      return { attachment: data as Attachment, url: signed.data.signedUrl }
    },
    subscribe(onChange: () => void, onStatus: (connected: boolean) => void) {
      const channel = client.channel(`web-chat:${userId}:${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${userId}` }, onChange)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests', filter: `recipient_id=eq.${userId}` }, onChange)
        .subscribe(status => { onStatus(status === 'SUBSCRIBED'); if (status === 'SUBSCRIBED') onChange() })
      return () => { void client.removeChannel(channel) }
    },
    async listOrders(page = 0) {
      const { data, error } = await client.from('orders').select('id,status,currency,total_minor,payment_status,created_at,order_items(id,product_title_snapshot,storefront_name_snapshot,quantity,subtotal_minor),order_fulfillments(status,carrier,tracking_number,customer_note)').eq('customer_id', userId).order('created_at', { ascending: false }).order('id').range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (error) throw new Error('Your orders could not be loaded. Please retry.')
      return (data ?? []) as unknown as CustomerOrder[]
    },
  }
}
export type ChatRepository = ReturnType<typeof createChatRepository>
