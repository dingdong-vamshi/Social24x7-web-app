import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Post, SocialRepository } from './repository';
import { storyBackgrounds, validateSocialMedia, type Story } from './extendedRepository';

const errorMessage = (error: unknown) => error instanceof Error ? error.message : (error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Unable to complete this action. Please retry.');
function useSocialResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      void load().then(value => { if (active) setData(value); }).catch(cause => { if (active) setError(errorMessage(cause)); }).finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [load, revision]);
  return { data, error, loading, reload };
}
function ResourceState({ resource }: { resource: { loading: boolean; error: string; reload: () => void } }) {
  return <>{resource.loading && <p role="status">Loading…</p>}{resource.error && <p role="alert">{resource.error} <button className="button secondary" onClick={resource.reload}>Retry</button></p>}</>;
}
export function ShareButton({ path, title }: { path: string; title: string }) {
  const [notice, setNotice] = useState('');
  async function share() {
    const url = new URL(path, window.location.origin).href;
    try {
      if (navigator.share) { await navigator.share({ title, url }); setNotice('Share sheet opened.'); }
      else { await navigator.clipboard.writeText(url); setNotice('Link copied. Paste it into your personal conversation.'); }
    } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setNotice('Sharing is unavailable. Copy the link below.'); }
  }
  return <span className="social-share"><button type="button" className="button secondary" onClick={() => void share()}>Share</button>{notice && <small role="status">{notice} <Link to={path}>Open link</Link></small>}</span>;
}
export function SocialMediaPreview({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement & HTMLVideoElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <figure className="social-media-preview">{file.type.startsWith('video/') ? <video ref={ref} controls playsInline preload="metadata" /> : <img ref={ref} alt="Selected media preview, not yet published" />}<figcaption>{file.name} · selected, not yet published</figcaption></figure>;
}

function StoryViewer({ stories, initial, base, close }: { stories: Story[]; initial: number; base: string; close: () => void }) {
  const [index, setIndex] = useState(initial), [now, setNow] = useState(() => Date.now());
  const story = stories[index];
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    function key(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') setIndex(value => Math.min(value + 1, stories.length - 1));
      if (event.key === 'ArrowLeft') setIndex(value => Math.max(value - 1, 0));
    }
    document.addEventListener('keydown', key);
    return () => { clearInterval(timer); document.removeEventListener('keydown', key); };
  }, [close, stories.length]);
  if (!story) return null;
  const expired = new Date(story.expires_at).getTime() <= now;
  return <section className="social-card story-viewer" aria-label="Story viewer">
    <header className="social-list-header"><Link to={base + '?profile=' + story.author_id} onClick={close}>{story.author?.display_name || 'Social member'}</Link><button autoFocus className="button secondary" onClick={close}>Close story</button></header>
    <div className={'story-stage story-' + (storyBackgrounds.includes(story.background_style as typeof storyBackgrounds[number]) ? story.background_style : 'forest')}>
      {expired ? <p>This story has expired.</p> : story.unavailable ? <p>This story’s media is no longer available.</p> : story.content_type === 'text' ? <p>{story.text_content}</p> : story.media_type === 'video' ? <video key={story.id} src={story.mediaUrl || undefined} controls playsInline preload="metadata" onEnded={() => index + 1 < stories.length && setIndex(index + 1)} /> : <img src={story.mediaUrl || undefined} alt={'Story by ' + (story.author?.display_name || 'Social member')} />}
    </div>
    <div className="social-card-actions"><button className="button secondary" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous story</button><span>{index + 1} / {stories.length}</span><button className="button secondary" disabled={index === stories.length - 1} onClick={() => setIndex(index + 1)}>Next story</button></div>
    <small>Expires {new Date(story.expires_at).toLocaleString()}</small>
  </section>;
}

export function Stories({ repository, base, authorId }: { repository: SocialRepository; base: string; authorId?: string }) {
  const load = useCallback(() => repository.stories(), [repository]);
  const resource = useSocialResource(load);
  const [viewer, setViewer] = useState<number | null>(null), [compose, setCompose] = useState(false), [text, setText] = useState(''), [background, setBackground] = useState<string>('forest'), [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [inputKey, setInputKey] = useState(0);
  const stories = (resource.data || []).filter(story => !authorId || story.author_id === authorId);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { await repository.createStory(text, background, file); setCompose(false); setText(''); setFile(undefined); setInputKey(value => value + 1); setNotice('Your story has been published.'); resource.reload(); }
    catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }
  return <section aria-label="Stories">
    <div className="social-list-header"><h2>{authorId ? 'Current stories' : 'Stories'}</h2>{(!authorId || authorId === repository.viewerId) && <button className="button secondary" aria-expanded={compose} onClick={() => setCompose(!compose)}>Add story</button>}</div>
    <ResourceState resource={resource} />
    {!resource.loading && !resource.error && !stories.length && <p className="social-muted">No active stories. Stories expire after 24 hours.</p>}
    <div className="story-tray">{stories.map((story, index) => <button className="story-bubble" key={story.id} onClick={() => setViewer(index)}><span>{story.content_type === 'text' ? 'Aa' : story.media_type === 'video' ? '▶' : '◉'}</span><strong>{story.author?.display_name || 'Social member'}</strong><small>{story.content_type === 'text' ? 'Text story' : story.media_type === 'video' ? 'Video story' : 'Photo story'}</small></button>)}</div>
    {notice && <p role="status">{notice}</p>}
    {compose && <form className="social-card" onSubmit={submit}><h3>Create a story</h3><p>Public story · disappears after 24 hours. Choose media or write a text story.</p><label htmlFor="story-file">Photo or video (up to 50 MB)</label><input key={inputKey} id="story-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" disabled={busy} onChange={event => { setError(''); const selected = event.target.files?.[0]; try { if (selected) validateSocialMedia(selected); setFile(selected); } catch (cause) { setFile(undefined); event.target.value = ''; setError(errorMessage(cause)); } }} />
      {file ? <><SocialMediaPreview file={file} /><button type="button" className="button secondary" disabled={busy} onClick={() => { setFile(undefined); setInputKey(value => value + 1); }}>Remove media</button></> : <><label htmlFor="story-text">Story text</label><textarea id="story-text" maxLength={500} value={text} onChange={event => setText(event.target.value)} required disabled={busy} /><label htmlFor="story-background">Background</label><select id="story-background" value={background} onChange={event => setBackground(event.target.value)} disabled={busy}>{storyBackgrounds.map(value => <option key={value}>{value}</option>)}</select></>}
      {error && <p role="alert">{error}</p>}<div className="social-card-actions"><button className="button primary" disabled={busy || (!file && !text.trim())}>{busy ? 'Publishing…' : 'Publish story'}</button><button type="button" className="button secondary" disabled={busy} onClick={() => setCompose(false)}>Cancel</button></div></form>}
    {viewer !== null && <StoryViewer key={viewer} stories={stories} initial={viewer} base={base} close={() => setViewer(null)} />}
  </section>;
}

export function RichProfile({ id, viewerId, repository, base, renderPost }: { id: string; viewerId: string; repository: SocialRepository; base: string; renderPost: (post: Post) => ReactNode }) {
  const load = useCallback(async () => {
    const profile = await repository.profile(id);
    if (!profile) return null;
    const [stats, following, avatar] = await Promise.all([repository.profileStats(id), repository.following(id), repository.avatar(profile.avatar_path)]);
    return { profile, stats, following, avatar };
  }, [repository, id]);
  const resource = useSocialResource(load), [tab, setTab] = useState('Posts'), [connections, setConnections] = useState<'followers' | 'following' | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function follow() { if (!resource.data || busy) return; setBusy(true); setError(''); try { await repository.follow(id, !resource.data.following); resource.reload(); } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); } }
  return <><section className="social-card social-profile"><ResourceState resource={resource} />{!resource.loading && !resource.error && !resource.data && <h2>Profile unavailable</h2>}{resource.data && <>
    <div className="social-profile-heading">{resource.data.avatar ? <img className="social-profile-avatar" src={resource.data.avatar} alt={resource.data.profile.display_name} /> : <span className="social-profile-avatar avatar">{resource.data.profile.display_name.slice(0, 1)}</span>}<div><h2>{resource.data.profile.display_name}</h2><p>@{resource.data.profile.username}</p>{resource.data.profile.verified_professional && <p>Verified professional</p>}</div></div><p className="post-body">{resource.data.profile.bio || 'No biography yet.'}</p>
    <div className="social-profile-counts"><span><strong>{resource.data.stats.posts}</strong> posts</span><button onClick={() => setConnections('followers')}><strong>{resource.data.stats.followers}</strong> followers</button><button onClick={() => setConnections('following')}><strong>{resource.data.stats.following}</strong> following</button></div>
    <div className="social-card-actions">{id === viewerId ? <Link className="button primary" to="/account">Edit profile</Link> : <><button className="button primary" disabled={busy} onClick={() => void follow()}>{resource.data.following ? 'Unfollow' : 'Follow'}</button><Link to="/account/chats" className="button secondary">Personal chats</Link></>}<ShareButton path={base + '?profile=' + id} title={resource.data.profile.display_name} /></div>
  </>}{error && <p role="alert">{error}</p>}</section>
    {resource.data && <>{connections && <Connections repository={repository} id={id} kind={connections} base={base} close={() => setConnections(null)} />}
      <Stories repository={repository} base={base} authorId={id} />
      <nav className="social-tabs" aria-label="Profile sections">{['Posts', 'Reels', 'Recommended', 'Reviews', 'Reposts', 'Highlights'].map(value => <button className="button secondary" aria-pressed={tab === value} key={value} onClick={() => setTab(value)}>{value}</button>)}</nav>
      {tab === 'Highlights' ? <div className="social-empty"><h3>Saved highlights</h3><p>Saved highlights were a preview in the original app. Creating, editing and deleting highlights is not available. Your active stories remain available above.</p></div> : <ProfileContent key={tab} repository={repository} profile={resource.data.profile} tab={tab} renderPost={renderPost} />}
    </>}
  </>;
}
function Connections({ repository, id, kind, base, close }: { repository: SocialRepository; id: string; kind: 'followers' | 'following'; base: string; close: () => void }) {
  const load = useCallback(() => repository.connections(id, kind), [repository, id, kind]), resource = useSocialResource(load);
  return <section className="social-card"><div className="social-list-header"><h2>{kind === 'followers' ? 'Followers' : 'Following'}</h2><button className="button secondary" onClick={close}>Close people list</button></div><ResourceState resource={resource} />{resource.data?.map(profile => <Link className="social-result" to={base + '?profile=' + profile.id} key={profile.id}><strong>{profile.display_name}</strong> @{profile.username}</Link>)}{resource.data?.length === 0 && <p>No {kind} yet.</p>}<small>Up to 200 authorized profiles.</small></section>;
}
function ProfileContent({ repository, profile, tab, renderPost }: { repository: SocialRepository; profile: NonNullable<Awaited<ReturnType<SocialRepository['profile']>>>; tab: string; renderPost: (post: Post) => ReactNode }) {
  const [page, setPage] = useState(0);
  const load = useCallback(async () => {
    if (tab === 'Recommended') return { posts: [], reviews: [], recommendations: await repository.recommendations(profile.id), loaded: 0 };
    const posts = await repository.profilePosts(profile, page * 20);
    const reviews = tab === 'Reviews' ? (await Promise.all(posts.slice(0, 6).map(post => repository.comments(post.id)))).flat().slice(0, 8) : [];
    return { posts: posts.filter(post => tab === 'Reels' ? post.media_type === 'video' : tab === 'Reposts' ? post.body.toLowerCase().includes('repost') : true), reviews, recommendations: [], loaded: posts.length };
  }, [repository, profile, tab, page]);
  const resource = useSocialResource(load);
  return <section aria-label={tab}><h2>{tab}</h2><ResourceState resource={resource} />{tab === 'Reviews' && <p className="social-muted">Community feedback on this profile’s posts, as in the original Social profile. These are not product ratings.</p>}{tab === 'Reposts' && <p className="social-muted">Legacy posts whose captions include “repost”, matching the original app. No separate repost action is supported.</p>}
    {resource.data && (tab === 'Recommended' ? resource.data.recommendations.length ? resource.data.recommendations.map(item => <article className="social-card" key={item.promotion_id}><h3>{item.product_title}</h3><p>{item.storefront_name} · ₹{(Number(item.price_minor) / 100).toLocaleString('en-IN')}</p><a className="button secondary" href={'https://vamshi-superapp-drchirag-social24x7.vercel.app/store/' + encodeURIComponent(item.storefront_slug) + '/product/' + encodeURIComponent(item.product_slug) + '?ref=' + encodeURIComponent(item.tracking_code)} target="_blank" rel="noopener noreferrer">View recommended product</a></article>) : <p>No recommended products yet.</p> : tab === 'Reviews' ? resource.data.reviews.length ? resource.data.reviews.map(review => <article className="social-card" key={review.id}><strong>{review.profiles?.display_name || 'Social member'}</strong><p>{review.body}</p></article>) : <p>No reviews yet.</p> : resource.data.posts.length ? resource.data.posts.map(renderPost) : <p>No {tab.toLowerCase()} on this page.</p>)}
    {tab !== 'Recommended' && <div className="social-pagination"><button className="button secondary" disabled={page === 0 || resource.loading} onClick={() => setPage(page - 1)}>Previous profile page</button><span>Page {page + 1}</span><button className="button secondary" disabled={resource.loading || resource.data?.loaded !== 20} onClick={() => setPage(page + 1)}>Next profile page</button></div>}
  </section>;
}
