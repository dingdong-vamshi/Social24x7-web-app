import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ProfileEditor } from '../../pages/ProfileEditor';
import { DeleteSocialContent } from './DeleteSocialContent';
import {
  ArrowLeft,
  Camera,
  Grid3X3,
  ImagePlus,
  Play,
  Plus,
  Repeat2,
  Share2,
  Star,
  UserRound,
} from "lucide-react";
import { SocialDialog } from "./SocialDialog";
import type { Post, SocialRepository } from "./repository";
import {
  storyBackgrounds,
  validateSocialMedia,
  type Story,
} from "./extendedRepository";
import { AvailableMedia, SocialAvatar } from "./AvailableMedia";

const errorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "Unable to complete this action. Please retry.";
function useSocialResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      void load()
        .then((value) => {
          if (active) setData(value);
        })
        .catch((cause) => {
          if (active) setError(errorMessage(cause));
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
function ResourceState({
  resource,
}: {
  resource: { loading: boolean; error: string; reload: () => void };
}) {
  return (
    <>
      {resource.loading && <p role="status">Loading…</p>}
      {resource.error && (
        <p role="alert">
          {resource.error}{" "}
          <button className="button secondary" onClick={resource.reload}>
            Retry
          </button>
        </p>
      )}
    </>
  );
}
export function ShareButton({
  path,
  title,
  label = "Share",
  icon = false,
}: {
  path: string;
  title: string;
  label?: string;
  icon?: boolean;
}) {
  const [notice, setNotice] = useState("");
  async function share() {
    const url = new URL(path, window.location.origin).href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setNotice("Share sheet opened.");
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied. Paste it into your personal conversation.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError"))
        setNotice("Sharing is unavailable. Copy the link below.");
    }
  }
  return (
    <span className="social-share">
      <button
        type="button"
        className={icon ? "social-profile-icon" : "button secondary"}
        aria-label={label}
        onClick={() => void share()}
      >
        {icon ? <Share2 size={22} /> : label}
      </button>
      {notice && (
        <small role="status">
          {notice} <Link to={path}>Open link</Link>
        </small>
      )}
    </span>
  );
}
export function SocialMediaPreview({ file }: { file: File }) {
  const ref = useRef<HTMLImageElement & HTMLVideoElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <figure className="social-media-preview">
      {file.type.startsWith("video/") ? (
        <video ref={ref} controls playsInline preload="metadata" />
      ) : (
        <img ref={ref} alt="Selected media preview, not yet published" />
      )}
      <figcaption>{file.name} · selected, not yet published</figcaption>
    </figure>
  );
}

export function StoryViewer({
  stories,
  initial,
  base,
  close,
  repository,
  removed,
}: {
  stories: Story[];
  initial: number;
  base: string;
  close: () => void;
  repository?: SocialRepository;
  removed?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [index, setIndex] = useState(initial),
    [now, setNow] = useState(() => Date.now()),
    [started, setStarted] = useState(() => Date.now());
  const story = stories[index];
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  const move = useCallback(
    (direction: number) => {
      if (deleting) return;
      const target = index + direction;
      if (target < 0 || target >= stories.length) closeRef.current();
      else {
        setIndex(target);
        setStarted(Date.now());
      }
    },
    [index, stories.length, deleting],
  );
  const duration = story?.media_type === "video" ? 15000 : 7000;
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 100);
    function key(event: KeyboardEvent) {
      if (event.key === "ArrowRight") move(1);
      if (event.key === "ArrowLeft") move(-1);
    }
    document.addEventListener("keydown", key);
    return () => {
      clearInterval(timer);
      document.removeEventListener("keydown", key);
    };
  }, [move]);
  useEffect(() => {
    if (deleting) return;
    const timer = setTimeout(() => move(1), duration);
    return () => clearTimeout(timer);
  }, [duration, move, started, deleting]);
  if (!story) return null;
  const expired = new Date(story.expires_at).getTime() <= now;
  return (
    <SocialDialog title="Story" close={close} className="original-story-viewer">
      <section aria-label="Story viewer">
        <div className="original-story-progress">
          {stories.map((item, position) => (
            <span key={item.id}>
              <i
                style={{
                  width:
                    position < index
                      ? "100%"
                      : position > index
                        ? "0%"
                        : Math.min(100, ((now - started) / duration) * 100) +
                          "%",
                }}
              />
            </span>
          ))}
        </div>
        <Link
          className="original-story-author"
          to={base + "?profile=" + story.author_id}
          onClick={close}
        >
          {story.author?.display_name || "Social member"}
          <small>Expires {new Date(story.expires_at).toLocaleString()}</small>
        </Link>
        {repository && story.author_id === repository.viewerId && <DeleteSocialContent key={story.id} kind="story" remove={() => repository.deleteStory(story.id)} removed={() => { close(); removed?.(); }} onOpenChange={setDeleting}/>}
        <div
          className={
            "story-stage story-" +
            (storyBackgrounds.includes(
              story.background_style as (typeof storyBackgrounds)[number],
            )
              ? story.background_style
              : "forest")
          }
        >
          {expired ? (
            <p>This story has expired.</p>
          ) : story.unavailable ? (
            <p>This story’s media is no longer available.</p>
          ) : story.content_type === "text" ? (
            <p>{story.text_content}</p>
          ) : (
            <AvailableMedia
              key={story.id}
              src={story.mediaUrl || ""}
              video={story.media_type === "video"}
              autoPlay
              alt={
                "Story by " + (story.author?.display_name || "Social member")
              }
              onEnded={() => move(1)}
            />
          )}
        </div>
        <button
          className="original-story-previous"
          aria-label="Previous story"
          onClick={() => move(-1)}
        />
        <button
          className="original-story-next"
          aria-label="Next story"
          onClick={() => move(1)}
        />
      </section>
    </SocialDialog>
  );
}

export function Stories({
  repository,
  base,
  authorId,
}: {
  repository: SocialRepository;
  base: string;
  authorId?: string;
}) {
  const load = useCallback(() => repository.stories(), [repository]);
  const resource = useSocialResource(load);
  const [viewer, setViewer] = useState<number | null>(null),
    [compose, setCompose] = useState(false),
    [kind, setKind] = useState<"text" | "media" | null>(null),
    [text, setText] = useState(""),
    [background, setBackground] = useState<string>("forest"),
    [file, setFile] = useState<File>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [inputKey, setInputKey] = useState(0);
  const stories = (resource.data || []).filter(
    (story) => !authorId || story.author_id === authorId,
  );
  const groups = stories.filter(
    (story, index) =>
      stories.findIndex((item) => item.author_id === story.author_id) === index,
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await repository.createStory(text, background, file);
      setCompose(false);
      setKind(null);
      setText("");
      setFile(undefined);
      setInputKey((value) => value + 1);
      setNotice("Your story has been published.");
      resource.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Stories" className="original-stories">
      <ResourceState resource={resource} />
      <div className="story-tray">
        {(!authorId || authorId === repository.viewerId) && (
          <button
            className="story-bubble original-add-story"
            aria-label="Add story"
            onClick={() => {
              setCompose(true);
              setKind(null);
            }}
          >
            <span>
              <Plus size={31} />
              <i>
                <Plus size={13} />
              </i>
            </span>
            <strong>Add story</strong>
          </button>
        )}
        {groups.map((story) => (
          <button
            className="story-bubble"
            key={story.author_id}
            aria-label={
              "View " +
              (story.author?.display_name || "Social member") +
              "'s stories"
            }
            onClick={() => setViewer(stories.indexOf(story))}
          >
            <span>
              {story.content_type === "text" ? (
                <i
                  className={
                    "original-story-thumbnail story-" + story.background_style
                  }
                >
                  {story.text_content}
                </i>
              ) : story.mediaUrl && story.media_type !== "video" ? (
                <img src={story.mediaUrl} alt="" />
              ) : (
                <Camera size={26} />
              )}
            </span>
            <strong>{story.author?.username || "Social member"}</strong>
          </button>
        ))}
      </div>
      {notice && <p role="status">{notice}</p>}
      {compose && (
        <SocialDialog
          title="New story"
          close={() => {
            if (!busy) setCompose(false);
          }}
        >
          {!kind ? (
            <div className="original-story-choices">
              <button
                onClick={() => {
                  setKind("media");
                  setFile(undefined);
                }}
              >
                <ImagePlus size={26} />
                <strong>Photo or video</strong>
                <span>Choose media from your device.</span>
              </button>
              <button
                onClick={() => {
                  setKind("text");
                  setFile(undefined);
                }}
              >
                <b>Aa</b>
                <strong>Text story</strong>
                <span>Share a short update for 24 hours.</span>
              </button>
            </div>
          ) : (
            <form className="social-card original-story-form" onSubmit={submit}>
              <button
                type="button"
                className="social-icon"
                aria-label="Back to story choices"
                disabled={busy}
                onClick={() => setKind(null)}
              >
                <ArrowLeft />
              </button>
              {kind === "media" ? (
                <>
                  <label htmlFor="story-file">
                    Photo or video (up to 50 MB)
                  </label>
                  <input
                    key={inputKey}
                    id="story-file"
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
                        setError(errorMessage(cause));
                      }
                    }}
                  />
                  {file && <SocialMediaPreview file={file} />}
                </>
              ) : (
                <>
                  <div className={"original-text-story story-" + background}>
                    <label className="sr-only" htmlFor="story-text">
                      Story text
                    </label>
                    <textarea
                      id="story-text"
                      placeholder="Type your story…"
                      maxLength={500}
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      required
                      disabled={busy}
                    />
                  </div>
                  <div
                    className="original-story-palette"
                    aria-label="Story background"
                  >
                    {storyBackgrounds.map((value) => (
                      <button
                        type="button"
                        key={value}
                        className={"story-" + value}
                        aria-label={value + " story background"}
                        aria-pressed={background === value}
                        onClick={() => setBackground(value)}
                      />
                    ))}
                  </div>
                </>
              )}
              {error && <p role="alert">{error}</p>}
              <button
                className="button primary original-story-publish"
                aria-label="Publish story"
                disabled={busy || (kind === "media" ? !file : !text.trim())}
              >
                {busy ? "Publishing…" : "Share story"}
              </button>
            </form>
          )}
        </SocialDialog>
      )}
      {viewer !== null && (
        <StoryViewer
          repository={repository}
          removed={resource.reload}
          key={viewer}
          stories={[
            ...stories.filter(
              (item) => item.author_id === stories[viewer].author_id,
            ),
            ...stories.filter(
              (item) => item.author_id !== stories[viewer].author_id,
            ),
          ]}
          initial={0}
          base={base}
          close={() => setViewer(null)}
        />
      )}
    </section>
  );
}

export function RichProfile({
  id,
  viewerId,
  repository,
  base,
}: {
  id: string;
  viewerId: string;
  repository: SocialRepository;
  base: string;
  renderPost?: (post: Post) => ReactNode;
}) {
  const load = useCallback(async () => {
    const profile = await repository.profile(id);
    if (!profile) return null;
    const [stats, following, avatar] = await Promise.all([
      repository.profileStats(id),
      repository.following(id),
      repository.avatar(profile.avatar_path),
    ]);
    return { profile, stats, following, avatar };
  }, [repository, id]);
  const resource = useSocialResource(load),
    [editing, setEditing] = useState(false),
    [tab, setTab] = useState("Posts"),
    [connections, setConnections] = useState<"followers" | "following" | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [highlightNotice, setHighlightNotice] = useState(false),
    [avatarOpen, setAvatarOpen] = useState(false);
  const storefrontLoad = useCallback(
    () => repository.profileStorefront(id),
    [repository, id],
  );
  const store = useSocialResource(storefrontLoad);
  const recommendationsLoad = useCallback(() => repository.recommendations(id), [repository,id]);
  const recommendations = useSocialResource(recommendationsLoad);
  const own = id === viewerId;
  async function follow() {
    if (!resource.data || busy) return;
    setBusy(true);
    setError("");
    try {
      await repository.follow(id, !resource.data.following);
      resource.reload();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  const data = resource.data;
  return (
    <div className="original-profile">
      <header className="original-profile-header">
        <Link className="social-icon" to={base} aria-label="Back to Social">
          <ArrowLeft size={22} />
        </Link>
        <h1>
          {own
            ? "My Social Profile"
            : data?.profile.display_name || "Social Profile"}
        </h1>
        {own ? (
          <button
            className="social-icon"
            onClick={() => setEditing(true)}
            aria-label="Edit profile settings"
          >
            <UserRound size={20} />
          </button>
        ) : (
          <ShareButton
            path={base + "?profile=" + id}
            title={data?.profile.display_name || "Social Profile"}
            label="Share profile"
            icon
          />
        )}
      </header>
      <ResourceState resource={resource} />
      {!resource.loading && !resource.error && !data && (
        <h2>Profile unavailable</h2>
      )}
      {editing && own && <SocialDialog title="Edit social profile" close={() => { setEditing(false); resource.reload(); }}><ProfileEditor/></SocialDialog>}
      {data && (
        <>
          <div className="original-profile-top">
            <button
              className="social-icon original-avatar-button"
              aria-label="Open profile picture"
              disabled={!data.avatar}
              onClick={() => setAvatarOpen(true)}
            >
              <SocialAvatar
                className="original-profile-avatar"
                src={data.avatar}
                name={data.profile.display_name}
              />
            </button>
            <div className="original-profile-stat">
              <strong>{data.stats.posts}</strong>
              <span>Posts</span>
            </div>
            <button
              className="original-profile-stat"
              aria-label={"View " + data.stats.followers + " followers"}
              onClick={() => setConnections("followers")}
            >
              <strong>{data.stats.followers}</strong>
              <span>followers</span>
            </button>
            <button
              className="original-profile-stat"
              aria-label={"View " + data.stats.following + " following"}
              onClick={() => setConnections("following")}
            >
              <strong>{data.stats.following}</strong>
              <span>following</span>
            </button>
          </div>
          <h2 className="original-profile-name">{data.profile.display_name}</h2>
          <p className="original-profile-handle">@{data.profile.username}</p>
          {data.profile.bio && (
            <p className="original-profile-bio">{data.profile.bio}</p>
          )}
          <div className="original-profile-actions">
            {own ? (
              <button className="button primary" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => void follow()}
              >
                {data.following ? "Following" : "Follow"}
              </button>
            )}
            {own ? (
              <ShareButton
                path={base + "?profile=" + id}
                title={data.profile.display_name}
                label="Share profile"
              />
            ) : (
              <Link className="button secondary" to={base + '?view=chats&username=' + encodeURIComponent(data.profile.username)}>
                Message
              </Link>
            )}
            <ShareButton
              path={base + "?profile=" + id}
              title={data.profile.display_name}
              label="Share profile link"
              icon
            />
          </div>
          {error && <p role="alert">{error}</p>}
          {store.error && (
            <p role="alert">
              Storefront unavailable.{" "}
              <button onClick={store.reload}>Retry</button>
            </p>
          )}
          {store.data && (
            <a
              className="original-store-card"
              href={
                "https://vamshi-superapp-drchirag-social24x7.vercel.app/store/" +
                encodeURIComponent(store.data.slug)
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <div>
                <strong>Order from Us</strong>
                <p>{store.data.name} · Approved Seller storefront</p>
              </div>
              <span>
                <Camera size={20} />
              </span>
            </a>
          )}
          <h2 className="original-highlights-title">Highlights</h2>
          <ProfileHighlights
            repository={repository}
            id={id}
            toggle={() => setHighlightNotice(!highlightNotice)}
          />
          {highlightNotice && (
            <p className="social-muted">
              Saved highlights were a preview in the original app. Creating,
              editing and deleting highlights is not available.
            </p>
          )}
          <nav className="original-profile-tabs" aria-label="Profile sections">
            {[
              { label: "Posts", Icon: Grid3X3 },
              { label: "Reels", Icon: Play },
              { label: "Recommended", Icon: Star },
              { label: "Reviews", Icon: Star },
              { label: "Reposts", Icon: Repeat2 },
            ].filter(item => item.label !== 'Recommended' || recommendations.data?.length || recommendations.error).map(({ label, Icon }) => (
              <button
                aria-pressed={tab === label}
                key={label}
                onClick={() => setTab(label)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <ProfileContent
            key={tab}
            repository={repository}
            profile={data.profile}
            tab={tab}
            base={base}
          />
          {connections && (
            <SocialDialog
              title={connections === "followers" ? "Followers" : "Following"}
              sheet
              close={() => setConnections(null)}
            >
              <Connections
                repository={repository}
                id={id}
                kind={connections}
                base={base}
                close={() => setConnections(null)}
              />
            </SocialDialog>
          )}
          {avatarOpen && (
            <SocialDialog
              title="Profile picture"
              close={() => setAvatarOpen(false)}
            >
              <img
                className="original-avatar-preview"
                src={data.avatar || ""}
                alt={data.profile.display_name}
              />
            </SocialDialog>
          )}
        </>
      )}
    </div>
  );
}
function ProfileHighlights({
  repository,
  id,
  toggle,
}: {
  repository: SocialRepository;
  id: string;
  toggle: () => void;
}) {
  const load = useCallback(() => repository.stories(), [repository]),
    resource = useSocialResource(load);
  return (
    <>
      <div className="original-highlights">
        <button aria-label="New highlight information" onClick={toggle}>
          <span>
            <Plus size={34} />
          </span>
          New
        </button>
        {resource.data
          ?.filter((story) => story.author_id === id)
          .slice(0, 4)
          .map((story) => (
            <div className="original-highlight-preview" key={story.id}>
              <span>
                {story.content_type === "text" ? (
                  <i
                    className={
                      "original-story-thumbnail story-" + story.background_style
                    }
                  >
                    {story.text_content}
                  </i>
                ) : (
                  <AvailableMedia
                    src={story.mediaUrl || ""}
                    video={story.media_type === "video"}
                    controls={false}
                    alt="Active story highlight preview"
                  />
                )}
              </span>
              Story
            </div>
          ))}
      </div>
      {resource.error && (
        <p role="alert">
          Story previews unavailable.{" "}
          <button onClick={resource.reload}>Retry</button>
        </p>
      )}
    </>
  );
}
function Connections({
  repository,
  id,
  kind,
  base,
  close,
}: {
  repository: SocialRepository;
  id: string;
  kind: "followers" | "following";
  base: string;
  close: () => void;
}) {
  const load = useCallback(
      async () =>
        Promise.all(
          (await repository.connections(id, kind)).map(async (profile) => ({
            ...profile,
            avatar: await repository.avatar(profile.avatar_path),
          })),
        ),
      [repository, id, kind],
    ),
    resource = useSocialResource(load);
  return (
    <section className="social-card">
      <ResourceState resource={resource} />
      {resource.data?.map((profile) => (
        <Link
          className="social-result"
          to={base + "?profile=" + profile.id}
          key={profile.id}
          onClick={close}
        >
          <SocialAvatar
            src={profile.avatar}
            name={profile.display_name}
            className="original-search-avatar"
          />
          <div>
            <strong>{profile.display_name}</strong>
            <small>@{profile.username}</small>
          </div>
        </Link>
      ))}
      {resource.data?.length === 0 && <p>No {kind} yet.</p>}
      <small>Up to 200 authorized profiles.</small>
    </section>
  );
}
function ProfileContent({
  repository,
  profile,
  tab,
  base,
}: {
  repository: SocialRepository;
  profile: NonNullable<Awaited<ReturnType<SocialRepository["profile"]>>>;
  tab: string;
  base: string;
}) {
  const [page, setPage] = useState(0);
  const load = useCallback(async () => {
    if (tab === "Recommended")
      return {
        posts: [],
        reviews: [],
        recommendations: await repository.recommendations(profile.id),
        loaded: 0,
      };
    const posts = await repository.profilePosts(profile, page * 20);
    const reviews =
      tab === "Reviews"
        ? (
            await Promise.all(
              posts.slice(0, 6).map((post) => repository.comments(post.id)),
            )
          )
            .flat()
            .slice(0, 8)
        : [];
    return {
      posts: posts.filter((post) =>
        tab === "Reels"
          ? post.media_type === "video"
          : tab === "Reposts"
            ? post.body.toLowerCase().includes("repost")
            : true,
      ),
      reviews,
      recommendations: [],
      loaded: posts.length,
    };
  }, [repository, profile, tab, page]);
  const resource = useSocialResource(load);
  return (
    <section aria-label={tab} className="original-profile-content">
      <ResourceState resource={resource} />
      {resource.data &&
        (tab === "Recommended" ? (
          resource.data.recommendations.length ? (
            <div className="original-recommendations">
              {resource.data.recommendations.map((item) => (
                <a
                  className="original-recommendation"
                  key={item.promotion_id}
                  href={
                    "https://vamshi-superapp-drchirag-social24x7.vercel.app/store/" +
                    encodeURIComponent(item.storefront_slug) +
                    "/product/" +
                    encodeURIComponent(item.product_slug) +
                    "?ref=" +
                    encodeURIComponent(item.tracking_code)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="original-recommendation-image">
                    {item.cover_path ? (
                      <AvailableMedia
                        src={repository.productMediaUrl(item.cover_path)}
                        alt={item.product_title}
                      />
                    ) : (
                      <Star size={28} />
                    )}
                  </span>
                  <div>
                    <strong>{item.product_title}</strong>
                    <p>{item.storefront_name}</p>
                    <b>
                      ₹
                      {(Number(item.price_minor) / 100).toLocaleString("en-IN")}
                    </b>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <ProfileEmpty title="No recommended products yet." />
          )
        ) : tab === "Reviews" ? (
          resource.data.reviews.length ? (
            resource.data.reviews.map((review) => (
              <article className="original-review" key={review.id}>
                <strong>
                  {review.profiles?.display_name || "Social member"}
                </strong>
                <p>{review.body}</p>
              </article>
            ))
          ) : (
            <ProfileEmpty
              title="No reviews yet"
              body="Community feedback will appear here once people comment on this profile’s posts."
            />
          )
        ) : resource.data.posts.length ? (
          <div className="original-profile-grid">
            {resource.data.posts.map((post) => (
              <Link
                to={base + "?post=" + post.id}
                key={post.id}
                aria-label={
                  "Open post: " +
                  (post.body || post.media_type || "Social post")
                }
                className="original-profile-tile"
              >
                {post.thumbnail_path || post.media_paths?.[0] ? (
                  <AvailableMedia
                    src={repository.mediaUrl(post.thumbnail_path || post.media_paths![0])}
                    video={!post.thumbnail_path && post.media_type === "video"}
                    controls={false}
                    alt="Post attachment"
                  />
                ) : (
                  <Camera size={32} />
                )}
                <span className="original-tile-metrics">
                  {post.media_type === "video" && (
                    <span>
                      <Play size={14} /> Reel
                    </span>
                  )}
                  <span>♥ {post.like_count}</span>
                  <span>💬 {post.comment_count}</span>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <ProfileEmpty title={"No " + tab.toLowerCase() + " yet"} />
        ))}
      {tab !== "Recommended" && (page > 0 || resource.data?.loaded === 20) && (
        <div className="social-pagination">
          <button
            className="button secondary"
            disabled={page === 0 || resource.loading}
            onClick={() => setPage(page - 1)}
          >
            Previous profile page
          </button>
          <span>Page {page + 1}</span>
          <button
            className="button secondary"
            disabled={resource.loading || resource.data?.loaded !== 20}
            onClick={() => setPage(page + 1)}
          >
            Next profile page
          </button>
        </div>
      )}
    </section>
  );
}
function ProfileEmpty({
  title,
  body = "This section will fill in automatically as content is created and connected.",
}: {
  title: string;
  body?: string;
}) {
  return (
    <div className="original-profile-empty">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}
