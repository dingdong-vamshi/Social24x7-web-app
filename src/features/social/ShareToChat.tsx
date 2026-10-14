import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { requireSupabase } from '../../lib/supabase';
import { isUuid } from '../chat/repository';
import type { Post } from './repository';
import { createSocialShareRepository, type SocialShareRepository } from './shareRepository';

export function ShareToChat({ post, viewerId }: { post: Post; viewerId: string }) {
  const [open, setOpen] = useState(false);
  return <><button className="button secondary" onClick={() => setOpen(true)}>Share to chat</button>{open && <ConnectedSharePanel post={post} viewerId={viewerId} close={() => setOpen(false)} />}</>;
}
function ConnectedSharePanel({ post, viewerId, close }: { post: Post; viewerId: string; close: () => void }) {
  const repository = useMemo(() => createSocialShareRepository(requireSupabase(), viewerId), [viewerId]);
  return <ShareToChatPanel post={post} repository={repository} close={close} />;
}
export function ShareToChatPanel({ post, repository, close }: { post: Post; repository: SocialShareRepository; close: () => void }) {
  const [page, setPage] = useState(0), [revision, setRevision] = useState(0), [data, setData] = useState<Awaited<ReturnType<SocialShareRepository['conversations']>> | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [selected, setSelected] = useState(''), [busy, setBusy] = useState(false), [sent, setSent] = useState(false);
  const clientIds = useRef(new Map<string, string>()), pending = useRef(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { setLoading(true); setError(''); void repository.conversations(page).then(value => { if (active) setData(value); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Conversations could not be loaded.'); }).finally(() => { if (active) setLoading(false); }); }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [repository, page, revision]);
  async function send() {
    if (!selected || pending.current || sent) return;
    pending.current = true; setBusy(true); setError('');
    if (!clientIds.current.has(selected)) clientIds.current.set(selected, crypto.randomUUID());
    try { await repository.send(selected, post, clientIds.current.get(selected)!); setSent(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Share could not be confirmed. Retry safely.'); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className="social-share-panel social-card" aria-label="Share post to personal chat"><div className="social-list-header"><h3>Share to personal chat</h3><button className="button secondary" disabled={busy} onClick={close}>Close share</button></div><p>Choose one personal or group conversation. Business and employee conversations are not included. Nothing is sent until you confirm.</p><blockquote>{post.body || 'Media post'}<small>@{post.author_username}</small></blockquote>
    {loading && <p role="status">Loading your conversations…</p>}{error && <p role="alert">{error} <button className="button secondary" disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh conversations</button></p>}
    {!loading && data && !sent && <><label>Send to<select aria-label="Send to conversation" disabled={busy} value={selected} onChange={event => setSelected(event.target.value)}><option value="">Choose a conversation</option>{data.rows.map(row => <option value={row.id} key={row.id}>{row.name} · {row.kind}</option>)}</select></label>{!data.rows.length && <p>No personal or group conversations on this page. <Link to="/account/chats">Open personal chats</Link></p>}<div className="social-pagination"><button className="button secondary" disabled={page === 0 || busy} onClick={() => { setPage(page - 1); setSelected(''); }}>Previous chats</button><span>Page {page + 1}</span><button className="button secondary" disabled={!data.hasNext || busy} onClick={() => { setPage(page + 1); setSelected(''); }}>Next chats</button></div><button className="button primary" disabled={!selected || busy} onClick={() => void send()}>{busy ? 'Sharing…' : 'Send selected post'}</button></>}
    {sent && <p role="status">Post shared. <Link to={'/account/chat/' + selected}>Open conversation</Link></p>}
  </section>;
}
/** The original mobile message_kind=product + payload.post contract, rendered safely on web. */
export function SharedPostMessage({ payload }: { payload: Record<string, unknown> | null }) {
  const value = payload?.post;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const post = value as Record<string, unknown>;
  if (typeof post.id !== 'string' || !isUuid(post.id)) return <p>Shared post unavailable.</p>;
  return <Link className="social-shared-message" to={'/account/social?post=' + post.id}><strong>Shared post{typeof post.author === 'string' ? ' · @' + post.author : ''}</strong>{typeof post.caption === 'string' && <p>{post.caption}</p>}<span>Open post</span></Link>;
}
