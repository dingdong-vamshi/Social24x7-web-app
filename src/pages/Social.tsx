import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  Bell,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  ArrowLeft,
  Bookmark,
  MoreHorizontal,
  Plus,
  UserPlus,
  Play,
  Users,
  Send,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { requireSupabase } from "../lib/supabase";
import { PublicNav } from "../components/PublicNav";
import {
  createSocialRepository,
  notificationDestination,
  type Post,
  type SocialRepository,
} from "../features/social/repository";
import "../features/social/social.css";
import {
  RichProfile,
  ShareButton,
  SocialMediaPreview,
  Stories,
} from "../features/social/ExpandedSocial";
import { validateSocialMedia } from "../features/social/extendedRepository";
import { ShareToChat } from "../features/social/ShareToChat";
import {
  AvailableMedia,
  SocialAvatar,
} from "../features/social/AvailableMedia";
import { SocialDialog } from "../features/social/SocialDialog";
import { DeleteSocialContent } from "../features/social/DeleteSocialContent";
import { SocialChat } from "./ConsumerWeb";
import "../features/social/original-social.css";

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Unable to load this view. Please retry.";
function useResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      void load()
        .then((value) => {
          if (active) setData(value);
        })
        .catch((e) => {
          if (active) setError(message(e));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load, revision]);
  return { data, error, loading, reload };
}
function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <>
      {loading && <p role="status">Loading your Social activity…</p>}
      {error && (
        <div className="form-error" role="alert">
          {error}
          <button type="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}
    </>
  );
}
export function Social({
  seller = false,
  creator = false,
}: {
  seller?: boolean;
  creator?: boolean;
}) {
  const auth = useAuth();
  if (!auth.user || auth.loading) return <p role="status">Loading account…</p>;
  if (
    auth.error ||
    auth.user.app_metadata?.account_type === "business_employee"
  )
    return (
      <p role="alert">
        A verified personal account session is required. Employee work accounts
        cannot access personal Social activity.
      </p>
    );
  return (
    <>
      {!seller && !creator && <PublicNav />}
      <SocialWorkspace
        key={auth.user.id}
        viewerId={auth.user.id}
        seller={seller}
        creator={creator}
      />
    </>
  );
}
function SocialWorkspace({
  viewerId,
  seller,
  creator,
}: {
  viewerId: string;
  seller: boolean;
  creator: boolean;
}) {
  const repository = useMemo(
    () => createSocialRepository(requireSupabase(), viewerId),
    [viewerId],
  );
  const [params, setParams] = useSearchParams(),
    [notifications, setNotifications] = useState(false);
  const embedded = seller || creator;
  const Content = embedded ? "section" : "main";
  const base = seller
    ? "/partner/seller/social"
    : creator
      ? "/partner/creator/social"
      : "/account/social";
  const notificationLoad = useCallback(
    () => repository.notifications(),
    [repository],
  );
  const inbox = useResource(notificationLoad);
  const reloadNotifications = inbox.reload;
  useEffect(() => {
    const unsub = repository.subscribe(reloadNotifications);
    const refresh = () => {
      if (document.visibilityState === "visible") reloadNotifications();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      unsub();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [repository, reloadNotifications]);
  const unread = inbox.data?.filter((n) => !n.readAt).length;
  const post = params.get("post"),
    profile = params.get("profile"),
    discover = params.get("view") === "discover",
    reels = params.get("view") === "reels",
    chats = params.get("view") === "chats";
  return (
    <section
      className={
        "original-social social-application" +
        (embedded ? " social-embedded" : "") +
        (profile ? " social-profile-screen" : "")
      }
    >
      {!embedded && <nav className="social-app-navigation" aria-label="Social navigation">
        <Link
          to={
            seller
              ? "/partner/seller"
              : creator
                ? "/partner/creator"
                : "/account"
          }
          aria-label={
            seller
              ? "Return to Seller Studio"
              : creator
                ? "Return to Creator Center"
                : "Return to account"
          }
        >
          <ArrowLeft size={22} />
          <span>
            {seller ? "Seller Studio" : creator ? "Creator Center" : "Account"}
          </span>
        </Link>
        <Link
          to={base}
          aria-current={
            !post && !profile && !discover && !reels ? "page" : undefined
          }
        >
          <Users size={22} />
          <span>Social</span>
        </Link>
        <Link
          to={base + "?view=reels"}
          aria-current={reels ? "page" : undefined}
        >
          <Play size={22} />
          <span>Reels</span>
        </Link>
        <Link
          to={base + "?profile=" + viewerId}
          aria-current={profile ? "page" : undefined}
        >
          <Users size={22} />
          <span>My profile</span>
        </Link>
        <Link to={base + "?view=chats"}>
          <MessageCircle size={22} />
          <span>My chats</span>
        </Link>
      </nav>}
      <div className="social-app-screen">
        {!profile && (
          <header className="original-social-header">
            <Link to={base}>
              <h1>social</h1>
            </Link>
            <Link
              className="original-social-search"
              to={base + "?view=discover"}
              aria-label="Search social"
            >
              <Search size={18} />
              <span>Search</span>
            </Link>
            <Link className="social-icon" to={base + "?view=chats"} aria-label="Social chats" aria-current={chats ? "page" : undefined}><MessageCircle size={24}/></Link>
            <Link className="social-icon" to={base + "?view=reels"} aria-label="Reels" aria-current={reels ? "page" : undefined}><Play size={24}/></Link>
            <button
              type="button"
              className="social-icon notification-bell"
              aria-expanded={notifications}
              aria-label={`Notifications${unread === undefined ? "" : ", " + unread + " unread in recent activity"}`}
              onClick={() => setNotifications((v) => !v)}
            >
              <Bell size={24} />
              {!!unread && <span>{unread > 99 ? "99+" : unread}</span>}
            </button>
            <ProfileEntry repository={repository} base={base} />
          </header>
        )}
        {notifications && (
          <SocialDialog
            title="Notifications"
            sheet
            close={() => setNotifications(false)}
          >
            <NotificationPanel
              repository={repository}
              base={base}
              inbox={inbox}
              close={() => setNotifications(false)}
              inDialog
            />
          </SocialDialog>
        )}
        <Content aria-label="Social content">
          {chats ? <SocialChat base={base}/> : post ? (
            <PostDetail
              key={post}
              id={post}
              repository={repository}
              base={base}
            />
          ) : profile ? (
            <RichProfile
              key={profile}
              id={profile}
              viewerId={viewerId}
              repository={repository}
              base={base}
              renderPost={(post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  repository={repository}
                  base={base}
                />
              )}
            />
          ) : discover ? (
            <Discovery
              repository={repository}
              close={() => setParams({})}
              select={(kind, id) =>
                setParams(kind === "post" ? { post: id } : { profile: id })
              }
            />
          ) : (
            <Feed
              key={reels ? "reels" : "feed"}
              repository={repository}
              base={base}
              reels={reels}
            />
          )}
        </Content>
      </div>
    </section>
  );
}
function ProfileEntry({
  repository,
  base,
}: {
  repository: SocialRepository;
  base: string;
}) {
  const load = useCallback(async () => {
    const profile = await repository.profile(repository.viewerId);
    return profile
      ? { profile, avatar: await repository.avatar(profile.avatar_path) }
      : null;
  }, [repository]);
  const resource = useResource(load);
  return (
    <Link
      to={base + "?profile=" + repository.viewerId}
      aria-label="Open my social profile"
    >
      <SocialAvatar
        className="original-header-avatar"
        src={resource.data?.avatar}
        name={resource.data?.profile.display_name || "My profile"}
      />
    </Link>
  );
}
function Feed({
  repository,
  base,
  reels = false,
}: {
  repository: SocialRepository;
  base: string;
  reels?: boolean;
}) {
  const [page, setPage] = useState(0),
    [composing, setComposing] = useState(false),
    [publishing, setPublishing] = useState(false);
  const load = useCallback(
    () => repository.feed(page * 20),
    [repository, page],
  );
  const resource = useResource(load);
  return (
    <>
      {!reels && <Stories repository={repository} base={base} />}
      <button
        type="button"
        className="original-social-fab"
        aria-label="Create a new post"
        onClick={() => setComposing(true)}
      >
        <Plus size={26} />
      </button>
      {composing && (
        <SocialDialog
          title="New post"
          close={() => {
            if (!publishing) setComposing(false);
          }}
        >
          <Composer
            repository={repository}
            onBusyChange={setPublishing}
            onPublished={() => {
              setPage(0);
              resource.reload();
            }}
          />
        </SocialDialog>
      )}
      <div className="original-feed-tools">
        {reels && <h2>Reels</h2>}
        <button
          type="button"
          className="button secondary"
          onClick={resource.reload}
          disabled={resource.loading}
        >
          <RefreshCw size={16} />
          <span className="sr-only">Refresh feed</span>
        </button>
      </div>
      <LoadState {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && resource.data?.length === 0 && (
        <div className="social-empty">
          <h3>No posts on this page</h3>
          <p>Discover people or share your first update.</p>
        </div>
      )}
      {reels &&
        resource.data &&
        !resource.loading &&
        !resource.error &&
        !resource.data.some((post) => post.media_type === "video") && (
          <p>
            No reels on this feed page. Try the next page or publish a video.
          </p>
        )}
      {resource.data
        ?.filter((post) => !reels || post.media_type === "video")
        .map((post) => (
          <PostCard
            key={post.id + post.liked_by_viewer + post.like_count}
            post={post}
            repository={repository}
            base={base}
            onDeleted={resource.reload}
          />
        ))}
      <div className="social-pagination">
        <button
          className="button secondary"
          disabled={page === 0 || resource.loading}
          onClick={() => setPage((v) => v - 1)}
        >
          Previous page
        </button>
        <span>Page {page + 1}</span>
        <button
          className="button secondary"
          disabled={resource.loading || resource.data?.length !== 20}
          onClick={() => setPage((v) => v + 1)}
        >
          Next page
        </button>
      </div>
    </>
  );
}
function Composer({
  repository,
  onPublished,
  onBusyChange,
}: {
  repository: SocialRepository;
  onPublished: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [body, setBody] = useState(""),
    [file, setFile] = useState<File>(),
    [inputKey, setInputKey] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      if (file) await repository.publishMedia(body, file);
      else await repository.publish(body);
      setBody("");
      setFile(undefined);
      setInputKey((value) => value + 1);
      setNotice("Your public post has been published.");
      onPublished();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      onBusyChange(false);
    }
  }
  return (
    <form className="social-card" onSubmit={submit}>
      <label htmlFor="social-compose">Share an update</label>
      <textarea
        id="social-compose"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={5000}
        placeholder="What would you like to share?"
        required={!file}
        disabled={busy}
      />
      <label htmlFor="social-media">
        Photo or video (optional, up to 50 MB)
      </label>
      <input
        key={inputKey}
        id="social-media"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        disabled={busy}
        onChange={(event) => {
          setError("");
          const selected = event.target.files?.[0];
          try {
            if (selected) validateSocialMedia(selected);
            setFile(selected);
          } catch (cause) {
            setFile(undefined);
            event.target.value = "";
            setError(message(cause));
          }
        }}
      />
      {file && <SocialMediaPreview file={file} />}
      {file && (
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => {
            setFile(undefined);
            setInputKey((value) => value + 1);
          }}
        >
          Remove media
        </button>
      )}
      <div className="social-card-actions">
        <small>Public post · text, photo or video</small>
        <button
          className="button primary"
          disabled={busy || (!body.trim() && !file)}
        >
          {busy ? "Publishing…" : "Publish post"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
function PostCard({
  post,
  repository,
  base,
  onDeleted,
  onComments,
}: {
  post: Post;
  repository: SocialRepository;
  base: string;
  onDeleted?: () => void;
  onComments?: () => void;
}) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(Boolean(post.liked_by_viewer)),
    [following, setFollowing] = useState(Boolean(post.following_author)),
    [count, setCount] = useState(Number(post.like_count || 0)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [more, setMore] = useState(false);
  async function like() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await repository.like(post.id, !liked);
      setLiked(!liked);
      setCount(result);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className="social-card social-post"
      aria-label={"Post by " + post.author_display_name}
    >
      <header>
        <SocialAvatar
          src={post.author_avatar_url}
          name={post.author_display_name || "Social member"}
        />
        <div>
          <Link to={base + "?profile=" + post.author_id}>
            <strong>{post.author_username}</strong>
            {post.author_verified_professional && (
              <span
                className="original-verified"
                aria-label="Verified professional"
              >
                ✓
              </span>
            )}
          </Link>
          <small>{post.author_display_name}</small>
        </div>
        {repository.viewerId !== post.author_id && (
          <button
            className={"original-follow" + (following ? " following" : "")}
            aria-label={following ? "Unfollow author" : "Follow author"}
            disabled={busy}
            onClick={() => {
              if (busy) return;
              setBusy(true);
              setError("");
              void repository
                .follow(post.author_id, !following)
                .then(() => setFollowing(!following))
                .catch((cause) => setError(message(cause)))
                .finally(() => setBusy(false));
            }}
          >
            <UserPlus size={15} />
            {following ? "Following" : "Follow"}
          </button>
        )}
        <button
          className="social-icon"
          aria-label="Post options"
          aria-expanded={more}
          onClick={() => setMore(!more)}
        >
          <MoreHorizontal size={25} />
        </button>
      </header>
      {more && (
        <div className="original-post-options">
          <ShareButton
            path={base + "?post=" + post.id}
            title={post.author_display_name + " on Social 24-7"}
          />
          {post.author_id === repository.viewerId && (
            <DeleteSocialContent kind="post" remove={() => repository.deletePost(post.id)} removed={() => { if (onDeleted) onDeleted(); else navigate(base); }}/>
          )}
          <p>
            Post editing and saving are not supported by the original Social
            workflow.
          </p>
        </div>
      )}
      {post.media_paths?.map((path) => (
        <div className="original-post-media" key={path}>
          <AvailableMedia
            src={repository.mediaUrl(path)}
            video={post.media_type === "video"}
            alt="Post attachment"
          />
        </div>
      ))}
      <div className="social-card-actions">
        <button
          className="social-icon"
          aria-label={(liked ? "Unlike" : "Like") + " · " + count}
          aria-pressed={liked}
          disabled={busy}
          onClick={() => void like()}
        >
          <Heart
            size={28}
            color={liked ? "#E7374F" : undefined}
            fill={liked ? "#E7374F" : "none"}
          />
        </button>
        <Link
          className="social-icon"
          to={base + "?post=" + post.id}
          onClick={onComments ? event => { event.preventDefault(); onComments(); } : undefined}
          aria-label={"Comments · " + (post.comment_count || 0)}
        >
          <MessageCircle size={28} />
        </Link>
        <ShareToChat post={post} viewerId={repository.viewerId} base={base}/>
        <span
          className="original-bookmark"
          title="Saved posts are not implemented in the original app"
          aria-label="Saved posts unavailable"
        >
          <Bookmark size={27} />
        </span>
      </div>
      <p className="original-post-likes">{count} likes</p>
      {post.body && (
        <p className="post-body">
          <strong>{post.author_username} </strong>
          <span>{post.body}</span>
        </p>
      )}
      <Link
        className="original-comments-preview"
        to={base + "?post=" + post.id}
        onClick={onComments ? event => { event.preventDefault(); onComments(); } : undefined}
      >
        View all {post.comment_count || 0} comments
      </Link>
      <time className="original-post-time" dateTime={post.created_at}>
        {socialAgo(post.created_at).toUpperCase()} AGO
      </time>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
function socialAgo(iso: string) {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
  );
  return minutes < 60
    ? `${minutes}m`
    : minutes < 1440
      ? `${Math.round(minutes / 60)}h`
      : `${Math.round(minutes / 1440)}d`;
}
function PostDetail({
  id,
  repository,
  base,
}: {
  id: string;
  repository: SocialRepository;
  base: string;
}) {
  const load = useCallback(
      () => Promise.all([repository.post(id), repository.comments(id)]),
      [repository, id],
    ),
    resource = useResource(load);
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [commentsOpen, setCommentsOpen] = useState(true);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await repository.comment(id, body);
      setBody("");
      resource.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Link to={base}>← Back to feed</Link>
      <LoadState {...resource} retry={resource.reload} />
      {resource.data && (
        <>
          <PostCard
            post={resource.data[0]}
            repository={repository}
            base={base}
            onComments={() => setCommentsOpen(true)}
          />
          <button
            className="button secondary"
            onClick={() => setCommentsOpen(true)}
          >
            Open comments
          </button>
          {commentsOpen && (
            <SocialDialog
              title="Comments"
              close={() => setCommentsOpen(false)}
              className="original-comments-dialog"
            >
              <section className="original-comments-list">
                {resource.data[1].length === 0 && (
                  <p className="social-muted">Be the first to comment.</p>
                )}
                {resource.data[1].map((c) => (
                  <article className="social-comment" key={c.id}>
                    <SocialAvatar
                      name={c.profiles?.display_name || "Social member"}
                      className="original-comment-avatar"
                    />
                    <div>
                      <strong>
                        {c.profiles?.display_name || "Social member"}
                      </strong>
                      <small className="original-comment-time">
                        {" "}
                        {socialAgo(c.created_at)}
                      </small>
                      <p>{c.body}</p>
                      {c.author_id === repository.viewerId && <DeleteSocialContent kind="comment" remove={() => repository.deleteComment(c.id, id)} removed={resource.reload}/>}
                    </div>
                  </article>
                ))}
              </section>
              <form className="original-comment-composer" onSubmit={submit}>
                <label className="sr-only" htmlFor="social-comment">
                  Add a comment
                </label>
                <input
                  id="social-comment"
                  placeholder="Add a comment…"
                  required
                  maxLength={2000}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  disabled={busy}
                />
                <button
                  className="social-icon"
                  aria-label="Post comment"
                  disabled={busy || !body.trim()}
                >
                  <Send size={23} />
                </button>
                {error && <p role="alert">{error}</p>}
              </form>
            </SocialDialog>
          )}
        </>
      )}
    </>
  );
}
function Discovery({
  repository,
  select,
  close,
}: {
  repository: SocialRepository;
  select: (kind: "profile" | "post", id: string) => void;
  close: () => void;
}) {
  const [query, setQuery] = useState(""),
    [submitted, setSubmitted] = useState("");
  const load = useCallback(
      () => repository.search(submitted),
      [repository, submitted],
    ),
    resource = useResource(load);
  useEffect(() => {
    const timer = setTimeout(() => setSubmitted(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);
  return (
    <SocialDialog title="Search social" close={close}>
      <form
        className="original-search-form"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <Search size={19} />
        <label className="sr-only" htmlFor="social-search">
          Search Social
        </label>
        <input
          id="social-search"
          placeholder="Search people and posts"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="social-icon" disabled={!query.trim()}>
          <span className="sr-only">Search</span>
          <Search size={19} />
        </button>
      </form>
      <LoadState {...resource} retry={resource.reload} />
      {submitted &&
        !resource.loading &&
        !resource.error &&
        resource.data?.length === 0 && <p>No matching people or posts.</p>}
      <div className="original-search-results">
        {resource.data?.map((item) => (
          <button
            className="social-result"
            key={item.entity_kind + item.entity_id}
            onClick={() => select(item.entity_kind, item.entity_id)}
          >
            <SocialAvatar
              src={item.avatar_url}
              name={item.display_name}
              className="original-search-avatar"
            />
            <div>
              <strong>{item.display_name}</strong>
              {item.verified_professional === true && (
                <span
                  className="original-verified"
                  aria-label="Verified professional"
                >
                  ✓
                </span>
              )}
              <small>
                @{item.username} · {item.entity_kind}
              </small>
              <p>{item.body}</p>
            </div>
          </button>
        ))}
      </div>
    </SocialDialog>
  );
}
export function WorkspaceNotifications({ base }: { base: string }) {
  const auth = useAuth();
  if (
    !auth.user ||
    auth.loading ||
    auth.error ||
    auth.user.app_metadata?.account_type === "business_employee"
  )
    return null;
  return (
    <WorkspaceNotificationBell
      key={auth.user.id}
      viewerId={auth.user.id}
      base={base}
    />
  );
}
function WorkspaceNotificationBell({
  viewerId,
  base,
}: {
  viewerId: string;
  base: string;
}) {
  const repository = useMemo(
    () => createSocialRepository(requireSupabase(), viewerId),
    [viewerId],
  );
  const load = useCallback(() => repository.notifications(), [repository]);
  const inbox = useResource(load),
    [open, setOpen] = useState(false);
  const reload = inbox.reload;
  useEffect(() => repository.subscribe(reload), [repository, reload]);
  const count = inbox.data?.filter((item) => !item.readAt).length;
  return (
    <div className="workspace-notifications">
      <button
        className="button secondary notification-bell"
        aria-label={
          "Notifications" +
          (count === undefined
            ? ""
            : ", " + count + " unread in recent activity")
        }
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Bell size={20} />
        {count !== undefined && count > 0 && <span>{count}</span>}
      </button>
      {open && (
        <NotificationPanel
          repository={repository}
          base={base}
          inbox={inbox}
          close={() => setOpen(false)}
        />
      )}
    </div>
  );
}
function NotificationPanel({
  repository,
  base,
  inbox,
  close,
  inDialog = false,
}: {
  repository: SocialRepository;
  base: string;
  inbox: ReturnType<
    typeof useResource<Awaited<ReturnType<SocialRepository["notifications"]>>>
  >;
  close: () => void;
  inDialog?: boolean;
}) {
  const navigate = useNavigate(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  async function open(item: NonNullable<typeof inbox.data>[number]) {
    if (busy) return;
    setBusy(item.id);
    setError("");
    try {
      if (!item.readAt) await repository.markRead(item);
      inbox.reload();
      close();
      navigate(notificationDestination(item, base));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy("");
    }
  }
  return (
    <section
      className="social-notifications social-card"
      aria-label="Your notifications"
    >
      {!inDialog && (
        <div className="social-list-header">
          <h2>Notifications</h2>
          <button className="button secondary" onClick={close}>
            Close
          </button>
        </div>
      )}
      <p>Recent in-app activity. Browser push is not enabled.</p>
      {inbox.data?.some((item) => !item.readAt) && (
        <button
          className="button secondary"
          disabled={Boolean(busy)}
          onClick={() => {
            setBusy("all");
            setError("");
            void repository
              .markAllRead()
              .then(inbox.reload)
              .catch((cause) => setError(message(cause)))
              .finally(() => setBusy(""));
          }}
        >
          Mark all read
        </button>
      )}
      <LoadState {...inbox} retry={inbox.reload} />
      {error && <p role="alert">{error}</p>}
      {!inbox.loading && !inbox.error && inbox.data?.length === 0 && (
        <p>You’re all caught up.</p>
      )}
      {inbox.data?.map((item) => (
        <button
          className="social-result"
          key={item.source + item.id}
          disabled={Boolean(busy)}
          onClick={() => void open(item)}
        >
          <strong>
            {!item.readAt ? "● " : ""}
            {item.title}
          </strong>
          <p>{item.body}</p>
          <small>
            {item.source} · {new Date(item.createdAt).toLocaleString()}
          </small>
        </button>
      ))}
    </section>
  );
}
