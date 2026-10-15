import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "../components/Brand";
import {
  Button,
  LoadingState,
  SectionCard,
  StatusPill,
} from "../components/Ui";
import { CommerceResult, useCommerce } from "../components/LiveCommerce";
import { requireSupabase } from "../lib/supabase";
import {
  createBusinessWorkspaceRepository,
  type CompanyFeed as CompanyFeedData,
  type WorkConversation,
  type WorkMessage,
} from "../features/businessWorkspace/businessWorkspaceRepository";
import {
  isStrongWorkPassword,
  normalizeBusinessLoginId,
} from "../features/team/rules";
import { dateTime, label } from "../repositories/commerce";
import { CompanyMedia } from '../features/team/CompanyMedia';
import { TeamManagement } from '../features/team/TeamManagement';
import { RepresentativeBadge } from '../features/team/TeamPresentation';
import { BusinessSharedContent } from '../features/team/BusinessSharedContent';
import { companyProductMedia, isCompanyStoragePath } from '../features/team/companyMediaRepository';
import "../features/team/team.css";
import "../features/chat/team.css";

export function BusinessLogin({ activate = false }: { activate?: boolean }) {
  const auth = useAuth();
  const [loginId, setLoginId] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [code, setCode] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const inFlight = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    setError("");
    if (activate && (!isStrongWorkPassword(password) || password !== confirm)) {
      setError(
        "Use 10–128 characters with uppercase, lowercase, number and symbol. Passwords must match.",
      );
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      if (activate) {
        const r = await requireSupabase().functions.invoke(
          "business-work-auth",
          {
            body: {
              loginId: normalizeBusinessLoginId(loginId),
              activationCode: code.trim(),
              password,
            },
          },
        );
        if (r.error) throw r.error;
        if (!r.data?.activated)
          throw new Error(r.data?.error || "Activation was not confirmed.");
        setDone(true);
        setCode("");
        setPassword("");
        setConfirm("");
      } else await auth.signInWork({ loginId, password });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Work access could not be confirmed.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  if (auth.loading && !busy) return <LoadingState />;
  if (auth.user)
    return (
      <main className="account-page">
        <Brand />
        <p>
          Sign out of the current account before using a different work
          identity.
        </p>
        <Button
          onClick={() =>
            void auth
              .signOut()
              .catch(() => setError("Sign out failed. Please retry."))
          }
        >
          Sign out
        </Button>
        {auth.user.app_metadata?.account_type === "business_employee" &&
          !auth.error && <Navigate to="/business-workspace" replace />}
        {error && <p role="alert">{error}</p>}
      </main>
    );
  return (
    <main className="account-page team-management work-auth-page">
      <Brand />
      <h1>{activate ? "Activate work account" : "Work account login"}</h1>
      <p>
        Use the business login ID from your employer. Personal email, phone and
        chats are separate.
      </p>
      {activate && <p className="team-help">Use 10–128 characters with uppercase, lowercase, a number and a symbol. Only you choose and know this password. Activation does not approve your account.</p>}
      {done ? (
        <SectionCard title="Password created">
          <p>
            Owner approval is still required before work access. No Seller,
            Creator or Admin approval was granted.
          </p>
          <Link to="/business-login">Go to Work login</Link>
        </SectionCard>
      ) : (
        <form className="commerce-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <label>
              Business login ID
              <input
                autoComplete="username"
                required
                pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </label>
            {activate && (
              <label>
                One-time activation code
                <input
                  data-private
                  autoComplete="off"
                  type="password"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
            )}
            <label>
              {activate ? "Create password" : "Work password"}
              <input
                type="password"
                autoComplete={activate ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {activate && (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : activate
                ? "Create work password"
                : "Open Business Work"}
          </Button>
        </form>
      )}
      <p>
        <Link to={activate ? "/business-login" : "/business-activate"}>
          {activate
            ? "Back to work login"
            : "First time? Activate your work account"}
        </Link>
      </p>
      <Link to="/partner/login">Personal account login</Link>
    </main>
  );
}

export function BusinessWork() {
  const auth = useAuth();
  if (auth.loading) return <LoadingState />;
  if (!auth.user) return <Navigate to="/business-login" replace />;
  if (auth.user.app_metadata?.account_type !== "business_employee")
    return (
      <main className="account-page">
        <h1>Work identity required</h1>
        <p>
          This workspace requires separate employee credentials. An owner
          account cannot impersonate an employee.
        </p>
        <Link to="/onboarding">Back to your workspaces</Link>
      </main>
    );
  return <WorkSession key={auth.user.id} />;
}
function WorkSession() {
  const auth = useAuth();
  const repository = useMemo(
    () => createBusinessWorkspaceRepository(requireSupabase()),
    [],
  );
  const [revision, setRevision] = useState(0),
    [selected, setSelected] = useState(""),
    [filter, setFilter] = useState<"open" | "resolved" | null>(null),
    [tab, setTab] = useState("chats");
  const load = useCallback(async () => {
    void revision;
    const context = await repository.getContext();
    if (!context || context.status !== "verified")
      throw new Error("Work access is no longer verified. Contact your owner.");
    return { context, inbox: (await repository.listInbox(filter)).filter(row => row.storefrontId === context.storefrontId) };
  }, [repository, filter, revision]);
  const [state, setState] = useState<{
    data?: Awaited<ReturnType<typeof load>>;
    error?: string;
  }>({});
  useEffect(() => {
    let active = true;
    void load()
      .then((data) => {
        if (active) setState({ data });
      })
      .catch((cause) => {
        if (active)
          setState({
            error:
              cause instanceof Error
                ? cause.message
                : "Work access could not be refreshed.",
          });
      });
    return () => {
      active = false;
    };
  }, [load]);
  const result = {
    data: state.data,
    error: state.error,
    refresh: () => setRevision((n) => n + 1),
  };
  useEffect(() => {
    const refresh = () => setRevision((n) => n + 1);
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("online", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const storefrontId = result.data?.context.storefrontId;
  useEffect(() => {
    if (!storefrontId) return;
    return repository.subscribe(storefrontId, () => setRevision((n) => n + 1));
  }, [repository, storefrontId]);
  const [error, setError] = useState(""),
    [phone, setPhone] = useState(""),
    [busy, setBusy] = useState(false);
  async function start(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const id = await repository.startByPhone(phone);
      if (!id)
        throw new Error("No eligible customer conversation was returned.");
      setPhone("");
      setSelected(id);
      setFilter("open");
      setRevision((n) => n + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not start this chat.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="account-page team-management">
      <Brand />
      <div className="commerce-row-actions">
        <h1>Business Work</h1>
        <Button
          variant="secondary"
          onClick={() =>
            void auth.signOut().catch(() => setError("Sign out failed."))
          }
        >
          Sign out
        </Button>
        <Button variant="secondary" onClick={() => setRevision((n) => n + 1)}>
          Refresh access
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <CommerceResult result={result}>
        {({ context, inbox }) => (
          <>
            <h2>{context.storefrontName}</h2>
            <p>
              {context.fullName} {context.representativeVerified && <RepresentativeBadge/>} · {context.customerTagline} ·{" "}
              {context.roleName}{" "}
              <StatusPill>{label(context.status)}</StatusPill>
            </p>
            <div className="commerce-row-actions">
              <Button variant="secondary" onClick={() => setTab("chats")}>
                Assigned chats
              </Button>
              {context.permissions.includes("business_feed_view") && (
                <Button variant="secondary" onClick={() => setTab("feed")}>
                  Company feed
                </Button>
              )}
              {context.permissions.includes('business_team_manage') && <Button variant="secondary" onClick={() => setTab('team')}>Team & verification</Button>}
            </div>
            {tab === 'team' && context.permissions.includes('business_team_manage') ? (
              <TeamManagement key={context.storefrontId} storefrontId={context.storefrontId} canMonitor={context.permissions.includes('business_chat_monitor')} canAssign={context.permissions.includes('business_chat_assign')}/>
            ) : tab === "feed" &&
            context.permissions.includes("business_feed_view") ? (
              <CompanyFeed repository={repository} revision={revision} />
            ) : (
              <>
                <p className="team-chat-boundary">This is the separate Business Work inbox. You can reply only to an open conversation assigned to your verified work identity. Supervisor access is read-only until an authorized reassignment.</p>
                {context.permissions.includes("business_chat_reply") && (
                  <form className="commerce-form" onSubmit={start}>
                    <label>
                      Known customer phone
                      <input
                        type="tel"
                        required
                        autoComplete="off"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>
                    <p>
                      Use only a known, authorized customer's number. The server
                      controls matching and assignment.
                    </p>
                    <Button type="submit" disabled={busy}>
                      Start customer chat
                    </Button>
                  </form>
                )}
                <label>
                  Chat status
                  <select
                    value={filter || "all"}
                    onChange={(e) => {
                      setFilter(
                        e.target.value === "all"
                          ? null
                          : (e.target.value as "open" | "resolved"),
                      );
                      setSelected("");
                    }}
                  >
                    <option value="all">All</option>
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </label>
                <div className="team-chat-layout">
                  <nav
                    className="team-chat-list"
                    aria-label="Assigned customer conversations"
                  >
                    {inbox.map((row) => (
                      <button
                        key={row.conversationId}
                        aria-pressed={selected === row.conversationId}
                        onClick={() => setSelected(row.conversationId)}
                      >
                        <strong>{row.customerDisplayName}</strong>
                        <small>{row.lastMessage}</small>
                        <span>
                          {row.workStatus} · {row.unreadCount} unread
                        </span>
                      </button>
                    ))}
                    {!inbox.length && <p>No authorized conversations match.</p>}
                  </nav>
                  {inbox.find((row) => row.conversationId === selected) ? (
                    <WorkThread
                      key={selected}
                      conversation={
                        inbox.find((row) => row.conversationId === selected)!
                      }
                      repository={repository}
                      revision={revision}
                      canReply={
                        context.permissions.includes("business_chat_reply") &&
                        inbox.find((row) => row.conversationId === selected)
                          ?.assigneeMembershipId === context.membershipId
                      }
                      onChanged={() => setRevision((n) => n + 1)}
                    />
                  ) : (
                    <p>Select a customer conversation.</p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CommerceResult>
    </main>
  );
}
function WorkThread({
  conversation,
  repository,
  revision,
  canReply,
  onChanged,
}: {
  conversation: WorkConversation;
  repository: ReturnType<typeof createBusinessWorkspaceRepository>;
  revision: number;
  canReply: boolean;
  onChanged: () => void;
}) {
  const load = useCallback(async () => {
    void revision;
    const context = await repository.getContext();
    if (context?.status !== "verified" || context.storefrontId !== conversation.storefrontId) throw new Error("Work access revoked.");
    const messages = await repository.listMessages(conversation.conversationId);
    await repository.markRead(conversation.conversationId);
    return messages;
  }, [repository, conversation.conversationId, conversation.storefrontId, revision]);
  const result = useCommerce(load);
  const [body, setBody] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [resolving, setResolving] = useState(false);
  const pending = useRef(false);
  const pendingDelivery = useRef<{ body: string; clientId: string } | null>(null);
  async function run(resolve = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const context = await repository.getContext();
      if (!context || context.status !== 'verified' || context.storefrontId !== conversation.storefrontId || context.membershipId !== conversation.assigneeMembershipId || !context.permissions.includes('business_chat_reply')) throw new Error('Your reply permission or assignment is no longer available. Refresh the inbox.');
      if (resolve) await repository.resolve(conversation.conversationId);
      else {
        const text = body.trim();
        if (!text) throw new Error('Enter a reply before sending.');
        if (!pendingDelivery.current || pendingDelivery.current.body !== text) {
          pendingDelivery.current = { body: text, clientId: crypto.randomUUID() };
        }
        await repository.sendMessage(conversation.conversationId, text, pendingDelivery.current.clientId);
        pendingDelivery.current = null;
        setBody("");
      }
      setResolving(false);
      onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Action could not be confirmed. Check history before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="team-chat-thread">
      <header>
        <h2>{conversation.customerDisplayName}</h2>
        <p>
          {conversation.assigneeName} · {conversation.workStatus}
        </p>
      </header>
      <CommerceResult result={result}>
        {(messages) => (
          <>
            <ol>
              {messages.map((m: WorkMessage) => (
                <li key={m.messageId}>
                  <strong>
                    {m.senderDisplayName}
                    {m.representativeVerified
                      ? " · Verified representative"
                      : ""}
                  </strong>
                  <small>{m.senderTagline}</small>
                  <p>{m.body}</p>
                  {m.messageKind !== "text" && (
                    <BusinessSharedContent storefrontId={conversation.storefrontId} conversationId={conversation.conversationId} messageId={m.messageId}/>
                  )}
                  <time>{dateTime(m.createdAt)}</time>
                </li>
              ))}
            </ol>
            {canReply && conversation.workStatus === "open" ? (
              <form
                className="commerce-form"
                style={{ padding: 18 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <label>
                  Reply as work identity
                  <textarea
                    required
                    maxLength={2000}
                    value={body}
                    disabled={busy}
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={busy || !body.trim()}>
                  Send reply
                </Button>
                {resolving ? (
                  <>
                    <p>Mark this customer conversation resolved?</p>
                    <Button disabled={busy} onClick={() => void run(true)}>
                      Confirm resolve
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => setResolving(false)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setResolving(true)}
                  >
                    Resolve conversation
                  </Button>
                )}
              </form>
            ) : (
              <p style={{ padding: 18 }}>
                Read-only: verified assignment and reply permission are
                required. Resolved chats cannot be replied to here.
              </p>
            )}
          </>
        )}
      </CommerceResult>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
function CompanyFeed({
  repository,
  revision,
}: {
  repository: ReturnType<typeof createBusinessWorkspaceRepository>;
  revision: number;
}) {
  const load = useCallback(() => { void revision; return repository.getCompanyFeed() }, [repository, revision]);
  const result = useCommerce(load);
  const [view, setView] = useState<'feed' | 'explore' | 'reels'>('feed');
  return (
    <CommerceResult result={result}>
      {(feed) => (
        <SectionCard
          title={feed.storefront.name}
          description={feed.storefront.tagline}
        >
          {feed.storefront.logoPath && isCompanyStoragePath(feed.storefront.logoPath) && <div className="company-feed-logo"><CompanyMedia key={feed.storefront.logoPath} reference={{ bucket: 'shop-media', path: feed.storefront.logoPath }} alt={`${feed.storefront.name} logo`} /></div>}
          <nav className="commerce-row-actions" aria-label="Company content views">{(['feed', 'explore', 'reels'] as const).map(mode => <button type="button" key={mode} className={`button ${mode === view ? 'primary' : 'secondary'}`} aria-pressed={mode === view} onClick={() => setView(mode)}>{label(mode)}</button>)}</nav>
          <p className="team-help">Only your company’s authorized posts and products. This does not open personal or global Social content.</p>
          {view !== 'reels' && <>
          <h3>Company products</h3>
          <CompanyProducts products={feed.products} />
          </>}
          <h3>Company posts</h3>
          <div className={`company-view company-view-${view}`}>
          {feed.posts.filter(p => view !== 'reels' || p.mediaType === 'video').map((p) => (
            <article key={p.id} className="company-post-card">
              <p>{p.body}</p>
              <small>{dateTime(p.createdAt)}</small>
              <div className="company-post-media">{p.mediaPaths.map((path, index) => isCompanyStoragePath(path) && ['image', 'video'].includes(p.mediaType) ? <CompanyMedia key={`${path}:${index}`} reference={{ bucket: 'social-posts', path }} alt={`Company post ${p.mediaType} ${index + 1}`} video={p.mediaType === 'video'} /> : <p key={index}>This post media is unavailable.</p>)}</div>
            </article>
          ))}
          </div>
          {!feed.posts.length && <p>No posts returned.</p>}
          {view === 'reels' && feed.posts.length > 0 && !feed.posts.some(p => p.mediaType === 'video') && <p>No company video posts are available.</p>}
        </SectionCard>
      )}
    </CommerceResult>
  );
}

function CompanyProducts({ products }: { products: CompanyFeedData['products'] }) {
  const load = useCallback(() => companyProductMedia(requireSupabase(), products), [products]);
  const media = useCommerce(load);
  return <>
    {media.error && <p role="status">
      {media.error} <button type="button" onClick={media.refresh}>Retry product images</button>
    </p>}
    <div className="company-product-grid">
      {products.map(product => {
        const reference = media.data?.[product.id];
        return <article key={product.id} className="company-product-card">
          {reference
            ? <CompanyMedia key={`${reference.bucket}:${reference.path}`} reference={reference} alt={product.title} />
            : <p className="company-media-fallback">{media.data ? 'No available product image' : media.error ? 'Product image unavailable' : 'Loading image…'}</p>}
          <h4>{product.title}</h4>
          <p>{product.shortDescription}</p>
          <strong>{(product.priceMinor / 100).toLocaleString('en-IN', { style: 'currency', currency: product.currency })}</strong>
          <p>{product.inventoryAvailable} available</p>
        </article>;
      })}
    </div>
    {!products.length && <p>No active company products returned.</p>}
  </>;
}
