import { BuyerReturns } from '../features/buyerReturns/BuyerReturns'
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Download, LoaderCircle, MessageCircle, Package, RefreshCw, Search, Send, ShieldCheck, Users } from 'lucide-react'
import { Link, NavLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CounterpartyDirectory } from './CommerceOperations'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import { Brand } from '../components/Brand'
import { AccountMenu } from '../components/AccountMenu'
import { createChatRepository, mayCompose, mergeMessages, PAGE_SIZE, text, visibleMessages, type ChatRepository, type Conversation, type CustomerOrder, type Message } from '../features/chat/repository'
import '../features/chat/chat.css'
import { AttachmentComposer, GroupMembers, NewGroup } from '../features/chat/ConsumerChatTools'
import { NewPersonalChat } from '../features/chat/NewPersonalChat'
import { SharedPostMessage } from '../features/social/ShareToChat'

const displayDate = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const displayTime = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
const label = (value: string) => value.replaceAll('_', ' ')
const errorText = (error: unknown) => error instanceof Error ? error.message : 'Unable to load this view. Please retry.'

function ConsumerHeader() {
  return <header className="consumer-header"><Brand /><nav aria-label="Consumer navigation"><NavLink to="/account/chats"><MessageCircle size={18} />Chats</NavLink><NavLink to="/account/orders"><Package size={18} />Orders</NavLink></nav><AccountMenu/></header>
}

function SessionNotice() {
  const { loading, configured } = useAuth()
  return <div className="chat-state">{loading ? <><LoaderCircle className="spin" /><h2>Opening your account…</h2></> : <><ShieldCheck size={36} /><h2>{configured ? 'Sign in to your account' : 'Connection unavailable'}</h2><p>{configured ? 'Use your existing SOCIAL 24-7 account to open your conversations and orders.' : 'Account services have not been configured for this deployment.'}</p><Link className="button primary" to="/partner/login">Continue to sign in</Link></>}</div>
}

export function ConsumerWeb() {
  const { user, loading } = useAuth()
  const { id } = useParams()
  return <div className="consumer-page"><ConsumerHeader />{loading || !user || !supabase ? <SessionNotice /> : <ChatWorkspace key={`${user.id}:${id || ''}`} />}</div>
}

/** Mount inside the approved business workspace; never includes Personal/Group Chat. */
export function BusinessChat() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const creatorChannel = pathname.startsWith('/partner/creator') || pathname.endsWith('/creator-chat')
  return loading || !user || !supabase ? <SessionNotice /> : <><CounterpartyDirectory role={pathname.startsWith('/partner/creator') ? 'seller' : 'creator'}/><ChatWorkspace key={`${user.id}:${creatorChannel}:${params.get('conversation') || ''}`} businessOnly businessContext={creatorChannel ? 'creator_seller' : undefined} /></>
}

function ChatWorkspace({ businessOnly = false, businessContext }: { businessOnly?: boolean; businessContext?: 'creator_seller' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [newGroup, setNewGroup] = useState(false)
  const [newChat, setNewChat] = useState(false)
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const selectedId = businessOnly ? params.get('conversation') : id
  const selectionRef = useRef(selectedId)
  const repository = useMemo(() => createChatRepository(supabase!, user!.id), [user])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesRef = useRef<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [refresh, setRefresh] = useState(0)
  const [listPage, setListPage] = useState(0)
  const [moreConversations, setMoreConversations] = useState(false)
  const [moreMessages, setMoreMessages] = useState(false)
  const [olderBusy, setOlderBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [readError, setReadError] = useState('')
  const readAttempted = useRef('')
  const tick = useCallback(() => setRefresh(value => value + 1), [])
  const removeExpired = useCallback(() => {
    const next = visibleMessages(messagesRef.current)
    messagesRef.current = next
    setMessages(next)
  }, [])
  useEffect(() => {
    selectionRef.current = selectedId
    const unsubscribe = repository.subscribe(tick, setConnected)
    const onVisible = () => { if (document.visibilityState === 'visible') { removeExpired(); tick() } }
    const onOffline = () => { setOnline(false); setConnected(false) }
    const onOnline = () => { setOnline(true); tick() }
    // Reconcile when returning to the tab, reconnecting, and periodically in case
    // a socket event was missed. No durable browser message cache is created.
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    const timer = window.setInterval(onVisible, 30000)
    return () => { unsubscribe(); window.clearInterval(timer); window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); document.removeEventListener('visibilitychange', onVisible) }
  }, [repository, tick, selectedId, removeExpired])
  useEffect(() => {
    const deadlines = messages.flatMap(message => message.expires_at ? [Date.parse(message.expires_at)] : []).filter(Number.isFinite)
    if (!deadlines.length) return
    // Expiry must hide content without relying on network access or a socket event.
    const delay = Math.max(1, Math.min(Math.min(...deadlines) - Date.now() + 1, 2_147_483_647))
    const timer = window.setTimeout(removeExpired, delay)
    return () => window.clearTimeout(timer)
  }, [messages, removeExpired])
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [pages, selected] = await Promise.all([
          Promise.all(Array.from({ length: listPage + 1 }, (_, page) => repository.listConversations(businessOnly, page, businessContext))),
          selectedId ? repository.getConversation(selectedId, businessOnly, businessContext) : Promise.resolve(null),
        ])
        if (!alive) return
        const firstLoad = messagesRef.current.length === 0
        const history = selected ? await repository.reconcile(selected, messagesRef.current) : []
        if (!alive) return
        setConversations([...new Map(pages.flat().map(row => [row.id, row])).values()])
        setMoreConversations(pages.at(-1)?.length === PAGE_SIZE)
        setConversation(selected); messagesRef.current = history; setMessages(history)
        if (firstLoad) setMoreMessages(history.length === PAGE_SIZE)
        setError(selectedId && !selected ? 'This conversation is unavailable or you do not have access.' : '')
        const newest = history.at(-1)?.id
        if (selected && newest && readAttempted.current !== newest && document.visibilityState === 'visible') {
          readAttempted.current = newest
          repository.markRead(selected.id).then(() => { if (alive) setReadError('') }).catch(() => { if (alive) setReadError('Read status was not updated. Refresh to retry.'); readAttempted.current = '' })
        }
      } catch (error) {
        if (alive) { setError(errorText(error)); setConversations([]); setConversation(null); messagesRef.current = []; setMessages([]) }
      } finally { if (alive) setLoading(false) }
    }
    void load()
    return () => { alive = false }
  }, [repository, selectedId, businessOnly, businessContext, refresh, listPage])
  const showing = conversations.filter(row => (filter === 'all' || row.kind === filter) && row.name.toLowerCase().includes(search.trim().toLowerCase()))
  async function loadOlder() {
    if (!conversation || !messages[0]) return
    setOlderBusy(true)
    try {
      const older = await repository.listMessages(conversation, messages[0])
      if (selectionRef.current !== conversation.id) return
      messagesRef.current = mergeMessages(older, messagesRef.current)
      setMessages(messagesRef.current); setMoreMessages(older.length === PAGE_SIZE)
    } catch (error) { setError(errorText(error)) } finally { setOlderBusy(false) }
  }
  const selected = Boolean(selectedId)
  return <main className={`chat-workspace ${selected ? 'has-selection' : ''} ${businessOnly ? 'business-chat' : ''} ${newGroup || newChat ? 'creating-group' : ''}`}>
    <aside className="chat-sidebar" aria-label="Conversations">
      <div className="chat-sidebar-title"><div><span className="eyebrow">{businessOnly ? 'Business workspace' : 'Your conversations'}</span><h1>{businessContext ? 'Creator · Seller Chats' : businessOnly ? 'Business Chat' : 'Chats'}</h1></div><button className="chat-icon-button" type="button" onClick={tick} aria-label="Refresh conversations"><RefreshCw size={19} /></button></div>
      <p className={`chat-connection ${online && connected ? 'connected' : ''}`} role="status"><i />{!online ? 'Offline · reconnect to receive updates' : connected ? 'Connected' : 'Connecting · checking for updates'}</p>
      <label className="chat-search"><Search size={17} /><span className="sr-only">Search your conversations</span><input placeholder="Search conversations" value={search} onChange={event => setSearch(event.target.value)} /></label>
      {!businessOnly && <div className="chat-filters" aria-label="Filter conversations">{['all', 'personal', 'group', 'business'].map(value => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : label(value)}</button>)}</div>}
      {!businessOnly && user?.app_metadata?.account_type !== 'business_employee' && <><button type="button" className="chat-tools-toggle" onClick={() => { setNewChat(true); setNewGroup(false) }}>New chat</button><button type="button" className="chat-tools-toggle" onClick={() => { setNewGroup(true); setNewChat(false) }}>New group</button></>}
      <div className="chat-conversation-list">{loading && !conversations.length ? <p className="chat-list-notice" role="status">Loading conversations…</p> : showing.length ? showing.map(row => {
        const unread = row.conversation_participants.find(p => p.user_id === user!.id)?.last_read_at
        const content = <><span className="chat-avatar">{row.kind === 'group' ? <Users size={21} /> : row.name.slice(0, 1).toUpperCase()}</span><span className="chat-row-text"><strong>{row.name}</strong><small>{row.kind === 'business' ? row.business_context === 'creator_seller' ? 'Creator · Seller' : 'Customer support' : row.kind === 'group' ? 'Group conversation' : 'Personal conversation'}</small></span><span className="chat-row-meta"><time dateTime={row.updated_at}>{new Date(row.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</time>{(!unread || row.updated_at > unread) && <span className="chat-unread" aria-label="Updated conversation" />}</span></>
        return businessOnly ? <button key={row.id} type="button" className={`chat-row ${row.id === selectedId ? 'active' : ''}`} onClick={() => setParams({ conversation: row.id })}>{content}</button> : <Link key={row.id} className={`chat-row ${row.id === selectedId ? 'active' : ''}`} to={`/account/chat/${row.id}`} aria-current={row.id === selectedId ? 'page' : undefined}>{content}</Link>
      }) : <div className="chat-list-notice"><h3>{search || filter !== 'all' ? 'No matching conversations' : 'No conversations yet'}</h3><p>{search || filter !== 'all' ? 'Try another name or filter.' : 'Existing conversations from the app will appear here when this account has access.'}</p></div>}
      {moreConversations && <button className="chat-load-more" type="button" onClick={() => setListPage(value => value + 1)}>Load more conversations</button>}</div>
      <div className="chat-sidebar-foot"><ShieldCheck size={17} /><p>Signed in to your existing account. Only conversations you can access are shown.</p></div>
    </aside>
    <section className="chat-detail" aria-label="Selected conversation">
      {newChat ? <NewPersonalChat repository={repository} revision={refresh} opened={chatId => { setNewChat(false); navigate(`/account/chat/${chatId}`); tick() }} close={() => { setNewChat(false); tick() }}/> : newGroup ? <NewGroup repository={repository} created={groupId => { setNewGroup(false); navigate(`/account/chat/${groupId}`); tick() }} close={() => { setNewGroup(false); tick() }} /> : <>
      {selected && <div className="chat-mobile-back">{businessOnly ? <button type="button" onClick={() => setParams({})}><ArrowLeft size={18} />All conversations</button> : <Link to="/account/chats"><ArrowLeft size={18} />All conversations</Link>}</div>}
      {error && <div className="chat-alert" role="alert">{error}<button type="button" onClick={tick}>Retry</button></div>}
      {loading && selected ? <div className="chat-state" role="status"><LoaderCircle className="spin" /><p>Loading conversation…</p></div> : conversation ? <ChatThread key={conversation.id} conversation={conversation} messages={visibleMessages(messages)} repository={repository} userId={user!.id} refresh={tick} more={moreMessages} olderBusy={olderBusy} loadOlder={loadOlder} readError={readError} /> : <div className="chat-state"><div className="chat-welcome-icon"><MessageCircle size={40} /></div><h2>{selected ? 'Conversation unavailable' : businessOnly ? 'Your customer conversations' : 'Stay in the conversation'}</h2><p>{selected ? 'Choose a conversation from the list, or refresh to check your access.' : 'Open a conversation to see the same history as your SOCIAL 24-7 app.'}</p>{!selected && <small>Messages are protected by account access controls. End-to-end encryption is not currently available.</small>}</div>}
      </>}
    </section>
  </main>
}

function ChatThread({ conversation, messages, repository, userId, refresh, more, olderBusy, loadOlder, readError }: { conversation: Conversation; messages: Message[]; repository: ChatRepository; userId: string; refresh: () => void; more: boolean; olderBusy: boolean; loadOlder: () => void; readError: string }) {
  const [body, setBody] = useState('')
  const [pending, setPending] = useState<{ body: string; clientId: string } | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [membersOpen, setMembersOpen] = useState(false)
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const bottom = useRef<HTMLDivElement>(null)
  const newest = messages.at(-1)?.id
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'instant', block: 'end' }) }, [newest])
  const allowed = mayCompose(conversation, userId)
  async function send(event?: FormEvent) {
    event?.preventDefault()
    if (sending || !allowed) return
    const draft = pending ?? { body: body.trim(), clientId: crypto.randomUUID() }
    if (!draft.body || draft.body.length > 2000) return
    setSending(true); setError(''); setPending(draft)
    try { await repository.send(conversation, draft.body, draft.clientId); setPending(null); setBody(''); refresh() }
    catch (error) { setError(errorText(error)) }
    finally { setSending(false) }
  }
  return <><header className="chat-thread-header"><span className="chat-avatar">{conversation.kind === 'group' ? <Users size={22} /> : conversation.name.slice(0, 1).toUpperCase()}</span><div><h2>{conversation.name}</h2><p>{conversation.kind === 'group' ? `${conversation.conversation_participants.length} members` : conversation.kind === 'business' ? conversation.business_context === 'creator_seller' ? 'Creator · Seller conversation' : 'Business conversation' : 'Personal conversation'}</p></div>{conversation.kind === 'group' && <button className="chat-members-toggle" type="button" aria-expanded={membersOpen} onClick={() => setMembersOpen(value => !value)}>{membersOpen ? 'Hide members' : 'View members'}</button>}<button className="chat-icon-button" type="button" aria-label="Refresh message history" onClick={refresh}><RefreshCw size={18} /></button></header>
    {membersOpen && conversation.kind === 'group' && <GroupMembers conversation={conversation} repository={repository} />}
    {readError && <p role="status" className="chat-read-notice">{readError}</p>}
    <div className="chat-messages" role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions text">
      {more && <button className="chat-load-more" type="button" disabled={olderBusy} onClick={loadOlder}>{olderBusy ? 'Loading…' : 'Load earlier messages'}</button>}
      {!messages.length && <div className="chat-state"><MessageCircle /><p>No messages in this conversation yet.</p></div>}
      {messages.map((message, index) => <div key={message.id}>{(!index || displayDate(messages[index - 1].created_at) !== displayDate(message.created_at)) && <div className="chat-day">{displayDate(message.created_at)}</div>}<article className={`chat-message ${message.sender_id === userId ? 'own' : ''}`}><small className="chat-sender">{message.sender_id === userId ? 'You' : text((message.payload?.business_representative as Record<string, unknown> | undefined)?.name) || conversation.names[message.sender_id || ''] || (message.sender_id ? 'Member' : 'System')}</small><MessageBody key={text(message.payload?.attachment_id)} message={message} repository={repository} /><div className="chat-message-time"><time dateTime={message.created_at}>{displayTime(message.created_at)}</time>{message.edited_at && <span>edited</span>}{message.sender_id === userId && <Check size={12} aria-label="Saved" />}</div></article></div>)}<div ref={bottom} />
    </div>
    {!allowed ? <div className="chat-readonly"><ShieldCheck size={19} /><p>This conversation is read-only here. Customer replies are handled by the assigned representative in the Business Work account.</p></div> : <form className="chat-composer" onSubmit={send}>
      {error && <div className="chat-alert" role="alert">{error}<button type="button" disabled={sending} onClick={() => void send()}>Retry delivery</button><button type="button" disabled={sending} onClick={() => { setPending(null); setBody(''); setError(''); refresh() }}>Discard draft</button></div>}
      <label className="sr-only" htmlFor="chat-message-input">Message</label><textarea id="chat-message-input" placeholder="Write a message…" rows={2} maxLength={2000} value={body} disabled={sending || Boolean(pending)} onChange={event => setBody(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send() } }} /><button className="chat-send" type="submit" aria-label="Send message" disabled={sending || Boolean(pending) || !body.trim()}>{sending ? <LoaderCircle className="spin" size={20} /> : <Send size={20} />}</button><small>{body.length}/2,000 · Shift + Enter for a new line</small>
    </form>}
    {allowed && <><button className="chat-tools-toggle" type="button" aria-expanded={attachmentOpen} onClick={() => setAttachmentOpen(value => !value)}>{attachmentOpen ? 'Hide attachment' : 'Attach file'}</button><div hidden={!attachmentOpen}><AttachmentComposer repository={repository} conversation={conversation} userId={userId} disabled={sending || Boolean(pending)} sent={refresh} /></div></>}
  </>
}

function MessageBody({ message, repository }: { message: Message; repository: ChatRepository }) {
  const attachmentId = text(message.payload?.attachment_id)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (!attachmentUrl) return; const timer = window.setTimeout(() => setAttachmentUrl(''), 55000); return () => window.clearTimeout(timer) }, [attachmentUrl])
  async function open() {
    setBusy(true); setError(''); setAttachmentUrl('')
    try { const result = await repository.openAttachment(message.conversation_id, attachmentId); setAttachmentUrl(result.url) }
    catch (error) { setError(errorText(error)) } finally { setBusy(false) }
  }
  return <>{message.body && <p className="chat-message-body">{message.body}</p>}{attachmentId ? <div className="chat-attachment"><Download size={17} /><span>{text(message.payload?.filename) || 'Attachment'}</span>{attachmentUrl ? <a href={attachmentUrl} target="_blank" rel="noreferrer">Open file</a> : <button type="button" disabled={busy} onClick={open}>{busy ? 'Preparing…' : 'Get secure link'}</button>}{error && <small role="alert">{error}</small>}</div> : message.kind === 'product' && message.payload?.post ? <SharedPostMessage payload={message.payload}/> : message.kind !== 'text' && <p className="chat-content-note">{label(message.kind)} · Open in the mobile app for full details.</p>}</>
}

export function ConsumerOrders() {
  const { user, loading } = useAuth()
  return <div className="consumer-page"><ConsumerHeader />{loading || !user || !supabase ? <SessionNotice /> : <OrderHistory key={user.id} userId={user.id} />}</div>
}

function OrderHistory({ userId }: { userId: string }) {
  const repository = useMemo(() => createChatRepository(supabase!, userId), [userId])
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [more, setMore] = useState(false)
  useEffect(() => {
    let alive = true
    Promise.all(Array.from({ length: page + 1 }, (_, index) => repository.listOrders(index))).then(pages => {
      if (alive) { setOrders([...new Map(pages.flat().map(row => [row.id, row])).values()]); setMore(pages.at(-1)?.length === PAGE_SIZE); setError('') }
    }).catch(error => { if (alive) setError(errorText(error)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [repository, page, refresh])
  return <main className="consumer-orders"><header><div><span className="eyebrow">Your purchases</span><h1>Order history</h1><p>Track the orders placed with your SOCIAL 24-7 account.</p></div><button className="button secondary" type="button" disabled={loading} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} />Refresh</button></header>{error && <div role="alert" className="chat-alert">{error}<button type="button" onClick={() => setRefresh(value => value + 1)}>Retry</button></div>}{loading && !orders.length ? <div className="chat-state" role="status"><LoaderCircle className="spin" /><p>Loading your orders…</p></div> : !orders.length && !error ? <div className="chat-state"><Package size={38} /><h2>No orders yet</h2><p>Orders you place in SOCIAL 24-7 will appear here.</p><Link className="button secondary" to="/account/chats">Back to conversations</Link></div> : <div className="customer-order-grid">{orders.map(order => <article className="customer-order" key={order.id}><header><div><small>Order #{order.id.slice(0, 8).toUpperCase()}</small><h2>{order.order_items[0]?.storefront_name_snapshot || 'Order'}</h2><time dateTime={order.created_at}>{displayDate(order.created_at)}</time></div><span className="status-pill">{label(order.status)}</span></header><ul>{order.order_items.map(item => <li key={item.id}><span>{item.product_title_snapshot}<small>Quantity: {item.quantity}</small></span><strong>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency.trim() }).format(item.subtotal_minor / 100)}</strong></li>)}</ul><div className="customer-order-total"><span>Total · {label(order.payment_status)}</span><strong>{new Intl.NumberFormat(undefined, { style: 'currency', currency: order.currency.trim() }).format(order.total_minor / 100)}</strong></div>{order.order_fulfillments && <div className="customer-order-tracking"><Package size={18} /><div><strong>{label(order.order_fulfillments.status)}</strong>{order.order_fulfillments.carrier && <p>{order.order_fulfillments.carrier}</p>}{order.order_fulfillments.tracking_number && <p>Tracking: {order.order_fulfillments.tracking_number}</p>}{order.order_fulfillments.customer_note && <p>{order.order_fulfillments.customer_note}</p>}</div></div>}<BuyerReturns orderId={order.id} onChanged={() => setRefresh(value => value + 1)}/></article>)}</div>}{more && <button className="button secondary" type="button" disabled={loading} onClick={() => setPage(value => value + 1)}>{loading ? 'Loading…' : 'Load more orders'}</button>}</main>
}
