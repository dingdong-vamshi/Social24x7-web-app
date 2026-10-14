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
  Users,
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
export function Social({ seller = false }: { seller?: boolean }) {
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
      {!seller && <PublicNav />}
      <SocialWorkspace
        key={auth.user.id}
        viewerId={auth.user.id}
        seller={seller}
      />
    </>
  );
}
function SocialWorkspace({
  viewerId,
  seller,
}: {
  viewerId: string;
  seller: boolean;
}) {
  const repository = useMemo(
    () => createSocialRepository(requireSupabase(), viewerId),
    [viewerId],
  );
  const [params, setParams] = useSearchParams(),
    [notifications, setNotifications] = useState(false);
  const base = seller ? "/partner/seller/social" : "/account/social";
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
    discover = params.get("view") === "discover";
  return (
    <section
      className={
        seller ? "social-workspace" : "social-workspace account-social"
      }
    >
      <header className="social-heading">
        <div>
          <span className="eyebrow">Your account · Your community</span>
          <h1>Social</h1>
          <p>
            Your ordinary Social experience. Business conversations remain in
            Business Chat.
          </p>
        </div>
        <button
          type="button"
          className="button secondary notification-bell"
          aria-expanded={notifications}
          aria-label={`Notifications${unread === undefined ? "" : ", " + unread + " unread in recent activity"}`}
          onClick={() => setNotifications((v) => !v)}
        >
          <Bell size={20} />
          {unread !== undefined && unread > 0 && <span>{unread}</span>}
        </button>
      </header>
      <nav className="social-tabs" aria-label="Social navigation">
        <Link
          to={base}
          aria-current={!post && !profile && !discover ? "page" : undefined}
        >
          Feed
        </Link>
        <Link
          to={base + "?view=discover"}
          aria-current={discover ? "page" : undefined}
        >
          <Search size={17} />
          Discover
        </Link>
        <Link to={base + "?profile=" + viewerId}>My profile</Link>
        <Link to="/account/chats">
          <MessageCircle size={17} />
          My chats
        </Link>
        <Link to="/account/orders">My orders</Link>
      </nav>
      {notifications && (
        <NotificationPanel
          repository={repository}
          base={base}
          inbox={inbox}
          close={() => setNotifications(false)}
        />
      )}
      <div className="social-columns">
        <main>
          {post ? (
            <PostDetail
              key={post}
              id={post}
              repository={repository}
              base={base}
            />
          ) : profile ? (
            <Profile
              key={profile}
              id={profile}
              viewerId={viewerId}
              repository={repository}
            />
          ) : discover ? (
            <Discovery
              repository={repository}
              select={(kind, id) =>
                setParams(kind === "post" ? { post: id } : { profile: id })
              }
            />
          ) : (
            <Feed repository={repository} base={base} />
          )}
        </main>
        <aside className="social-context">
          <Users size={25} />
          <h2>One account, separate permissions</h2>
          <p>
            Posts, profiles and notifications come from the same Social services
            used by the app.
          </p>
          <p>
            You can access only your authorized conversations. Seller access
            does not reveal a customer’s or employee’s personal chats.
          </p>
          <Link to="/account">Manage my account</Link>
        </aside>
      </div>
    </section>
  );
}
function Feed({
  repository,
  base,
}: {
  repository: SocialRepository;
  base: string;
}) {
  const [page, setPage] = useState(0);
  const load = useCallback(
    () => repository.feed(page * 20),
    [repository, page],
  );
  const resource = useResource(load);
  return (
    <>
      <Composer
        repository={repository}
        onPublished={() => {
          setPage(0);
          resource.reload();
        }}
      />
      <div className="social-list-header">
        <h2>Your feed</h2>
        <button
          type="button"
          className="button secondary"
          onClick={resource.reload}
          disabled={resource.loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <LoadState {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && resource.data?.length === 0 && (
        <div className="social-empty">
          <h3>No posts on this page</h3>
          <p>Discover people or share your first update.</p>
        </div>
      )}
      {resource.data?.map((post) => (
        <PostCard
          key={post.id + post.liked_by_viewer + post.like_count}
          post={post}
          repository={repository}
          base={base}
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
}: {
  repository: SocialRepository;
  onPublished: () => void;
}) {
  const [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await repository.publish(body);
      setBody("");
      setNotice("Your public post has been published.");
      onPublished();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
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
        required
        disabled={busy}
      />
      <div className="social-card-actions">
        <small>Public post · text only on web for now</small>
        <button className="button primary" disabled={busy || !body.trim()}>
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
}: {
  post: Post;
  repository: SocialRepository;
  base: string;
}) {
  const [liked, setLiked] = useState(Boolean(post.liked_by_viewer)),
    [count, setCount] = useState(Number(post.like_count || 0)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
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
    <article className="social-card social-post">
      <header>
        <span className="avatar">
          {post.author_display_name?.slice(0, 1) || "S"}
        </span>
        <div>
          <Link to={base + "?profile=" + post.author_id}>
            <strong>{post.author_display_name}</strong>
          </Link>
          <small>
            @{post.author_username} ·{" "}
            {new Date(post.created_at).toLocaleDateString()}
          </small>
        </div>
      </header>
      <p className="post-body">{post.body}</p>
      {post.media_paths?.map((path) =>
        post.media_type === "video" ? (
          <video
            key={path}
            src={repository.mediaUrl(path)}
            controls
            preload="metadata"
          />
        ) : (
          <img
            key={path}
            src={repository.mediaUrl(path)}
            alt="Post attachment"
            loading="lazy"
          />
        ),
      )}
      <div className="social-card-actions">
        <button
          className="button secondary"
          aria-pressed={liked}
          disabled={busy}
          onClick={() => void like()}
        >
          <Heart size={17} />
          {liked ? "Unlike" : "Like"} · {count}
        </button>
        <Link to={base + "?post=" + post.id}>
          <MessageCircle size={17} />
          Comments · {post.comment_count || 0}
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
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
    [error, setError] = useState("");
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
          />
          <section className="social-card">
            <h2>Comments</h2>
            {resource.data[1].length === 0 && <p>No comments yet.</p>}
            {resource.data[1].map((c) => (
              <article className="social-comment" key={c.id}>
                <strong>{c.profiles?.display_name || "Social member"}</strong>
                <p>{c.body}</p>
              </article>
            ))}
            <small>Showing up to 100 comments.</small>
            <form onSubmit={submit}>
              <label htmlFor="social-comment">Add a comment</label>
              <textarea
                id="social-comment"
                required
                maxLength={2000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={busy}
              />
              <button
                className="button primary"
                disabled={busy || !body.trim()}
              >
                {busy ? "Sending…" : "Post comment"}
              </button>
              {error && <p role="alert">{error}</p>}
            </form>
          </section>
        </>
      )}
    </>
  );
}
function Discovery({
  repository,
  select,
}: {
  repository: SocialRepository;
  select: (kind: "profile" | "post", id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [submitted, setSubmitted] = useState("");
  const load = useCallback(
      () => repository.search(submitted),
      [repository, submitted],
    ),
    resource = useResource(load);
  return (
    <section className="social-card">
      <h2>Discover people & posts</h2>
      <p>
        Search the existing Social community. Other Discover services remain in
        the app.
      </p>
      <form
        className="social-search"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query.trim());
        }}
      >
        <label htmlFor="social-search">Search Social</label>
        <input
          id="social-search"
          value={query}
          maxLength={120}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="button primary" disabled={!query.trim()}>
          Search
        </button>
      </form>
      <LoadState {...resource} retry={resource.reload} />
      {submitted &&
        !resource.loading &&
        !resource.error &&
        resource.data?.length === 0 && <p>No matching people or posts.</p>}
      {resource.data?.map((item) => (
        <button
          className="social-result"
          key={item.entity_kind + item.entity_id}
          onClick={() => select(item.entity_kind, item.entity_id)}
        >
          <strong>{item.display_name}</strong>
          <small>
            @{item.username} · {item.entity_kind}
          </small>
          <p>{item.body}</p>
        </button>
      ))}
    </section>
  );
}
function Profile({
  id,
  viewerId,
  repository,
}: {
  id: string;
  viewerId: string;
  repository: SocialRepository;
}) {
  const load = useCallback(
      () => Promise.all([repository.profile(id), repository.following(id)]),
      [repository, id],
    ),
    resource = useResource(load);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function follow() {
    if (!resource.data || busy) return;
    setBusy(true);
    setError("");
    try {
      await repository.follow(id, !resource.data[1]);
      resource.reload();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="social-card">
      <LoadState {...resource} retry={resource.reload} />
      {!resource.loading && !resource.error && !resource.data?.[0] && (
        <h2>Profile unavailable</h2>
      )}
      {resource.data?.[0] && (
        <>
          <span className="avatar">
            {resource.data[0].display_name.slice(0, 1)}
          </span>
          <h2>{resource.data[0].display_name}</h2>
          <p>@{resource.data[0].username}</p>
          {resource.data[0].verified_professional && (
            <p>Verified professional</p>
          )}
          <p>{resource.data[0].bio}</p>
          {id === viewerId ? (
            <Link to="/account">Edit my account</Link>
          ) : (
            <button
              className="button primary"
              disabled={busy || resource.loading}
              onClick={() => void follow()}
            >
              {resource.data[1] ? "Unfollow" : "Follow"}
            </button>
          )}
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function NotificationPanel({
  repository,
  base,
  inbox,
  close,
}: {
  repository: SocialRepository;
  base: string;
  inbox: ReturnType<
    typeof useResource<Awaited<ReturnType<SocialRepository["notifications"]>>>
  >;
  close: () => void;
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
      <div className="social-list-header">
        <h2>Notifications</h2>
        <button className="button secondary" onClick={close}>
          Close
        </button>
      </div>
      <p>Recent in-app activity. Browser push is not enabled.</p>
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
