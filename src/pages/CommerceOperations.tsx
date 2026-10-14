import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { CommerceResult, useCommerce } from "../components/LiveCommerce";
import { Button, SectionCard } from "../components/Ui";
import { requireSupabase } from "../lib/supabase";
import { PackingUpload } from "../features/sellerSprint/SellerTools";
import { dateTime, label, money, type Order } from "../repositories/commerce";
import {
  createOperationsRepository,
  fulfillmentNext,
  type StoreSettings,
} from "../repositories/operations";

export function FulfillmentEditor({
  order,
  onSaved,
}: {
  order: Order;
  onSaved: () => void;
}) {
  const choices = fulfillmentNext(order);
  const [draft, setDraft] = useState({
    orderId: order.id,
    status: choices[0] || "",
    carrier: order.order_fulfillments?.carrier || "",
    trackingNumber: order.order_fulfillments?.tracking_number || "",
    packageReference: order.order_fulfillments?.package_reference || "",
    customerNote: order.order_fulfillments?.customer_note || "",
  });
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirm) {
      setConfirm(true);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await createOperationsRepository(requireSupabase()).fulfill(draft);
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Update not confirmed. Refresh before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <OrderHistory id={order.id} />
      <EvidenceList id={order.id} kind="order" />
      <PackingUpload orderId={order.id} onSaved={onSaved} />
      {choices.length ? (
        <form className="commerce-form" onSubmit={submit}>
          <h3>Update fulfillment</h3>
          <fieldset disabled={busy}>
            <label>
              Next order status
              <select
                value={draft.status}
                onChange={(e) => {
                  setDraft({ ...draft, status: e.target.value });
                  setConfirm(false);
                }}
              >
                {choices.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <div className="commerce-form-grid">
              {(
                [
                  "carrier",
                  "trackingNumber",
                  "packageReference",
                  "customerNote",
                ] as const
              ).map((key) => (
                <label key={key}>
                  {label(key.replace(/[A-Z]/g, (c) => " " + c.toLowerCase()))}
                  <input
                    value={draft[key]}
                    maxLength={1000}
                    onChange={(e) => {
                      setDraft({ ...draft, [key]: e.target.value });
                      setConfirm(false);
                    }}
                  />
                </label>
              ))}
            </div>
          </fieldset>
          {confirm && (
            <p role="status">
              Confirm {label(draft.status)}? This updates the real order and
              event history. Delivery/cancellation also updates inventory and
              commission records through the existing service. No payment or
              carrier booking is performed.
            </p>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="commerce-row-actions">
            {confirm && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancel change
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Updating…"
                : confirm
                  ? "Confirm order update"
                  : "Review order update"}
            </Button>
          </div>
        </form>
      ) : (
        <p>
          No fulfillment transition is available for this order/payment state.
        </p>
      )}
    </>
  );
}
function OrderHistory({ id }: { id: string }) {
  const load = useCallback(
    () => createOperationsRepository(requireSupabase()).orderEvents(id),
    [id],
  );
  const result = useCommerce(load);
  return (
    <details>
      <summary>Order event history</summary>
      <CommerceResult result={result}>
        {(events) =>
          events.length ? (
            events.map((event) => (
              <p key={event.id}>
                {label(event.status)} · {dateTime(event.created_at)}
                <br />
                {event.detail}
              </p>
            ))
          ) : (
            <p>No events recorded.</p>
          )
        }
      </CommerceResult>
    </details>
  );
}
export function EvidenceList({
  id,
  kind,
}: {
  id: string;
  kind: "order" | "return";
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Private evidence</summary>
      {open && <EvidenceContent id={id} kind={kind} />}
    </details>
  );
}
function EvidenceContent({
  id,
  kind,
}: {
  id: string;
  kind: "order" | "return";
}) {
  const load = useCallback(
    () => createOperationsRepository(requireSupabase()).evidence(id, kind),
    [id, kind],
  );
  const result = useCommerce(load);
  const [error, setError] = useState(""),
    [link, setLink] = useState<{ id: string; url: string } | null>(null);
  useEffect(() => {
    if (!link) return;
    const timer = window.setTimeout(() => setLink(null), 295000);
    return () => clearTimeout(timer);
  }, [link]);
  async function open(evidenceId: string) {
    setError("");
    setLink(null);
    try {
      const signed =
        await createOperationsRepository(requireSupabase()).evidenceUrl(
          evidenceId,
        );
      setLink({ id: evidenceId, url: signed.signedUrl });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Evidence unavailable.",
      );
    }
  }
  return (
    <div>
      <CommerceResult result={result}>
        {(rows) =>
          rows.length ? (
            rows.map((row) => (
              <div key={row.id}>
                <p>
                  {row.file_name || "Evidence"} · {label(row.evidence_source)} ·{" "}
                  {dateTime(row.created_at)}
                </p>
                <Button variant="secondary" onClick={() => void open(row.id)}>
                  Get secure evidence link
                </Button>
                {link?.id === row.id && (
                  <a
                    className="button ghost"
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open evidence (expires in five minutes)
                  </a>
                )}
              </div>
            ))
          ) : (
            <p>No evidence returned.</p>
          )
        }
      </CommerceResult>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function ReturnReview({
  id,
  status,
  onSaved,
}: {
  id: string;
  status: string;
  onSaved: () => void;
}) {
  const [decision, setDecision] = useState<
      "under_review" | "approved" | "rejected"
    >("under_review"),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!confirm) {
      setConfirm(true);
      return;
    }
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await createOperationsRepository(requireSupabase()).reviewReturn(
        id,
        decision,
        reason,
      );
      onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Decision not confirmed. Refresh before retrying.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <EvidenceList id={id} kind="return" />
      {["submitted", "under_review"].includes(status) && (
        <form className="commerce-form" onSubmit={submit}>
          <label>
            Return decision
            <select
              disabled={busy}
              value={decision}
              onChange={(e) => {
                setDecision(e.target.value as typeof decision);
                setConfirm(false);
              }}
            >
              <option value="under_review">Under review</option>
              <option value="approved">Approve return</option>
              <option value="rejected">Reject return</option>
            </select>
          </label>
          <label>
            Review note
            <textarea
              disabled={busy}
              maxLength={4000}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setConfirm(false);
              }}
            />
          </label>
          {confirm && (
            <p role="status">
              {decision === "approved"
                ? "Approval creates a pending refund request and reverses related commissions. It does not execute a payment."
                : decision === "rejected"
                  ? "Rejection updates the order and restores withheld commission status according to the existing backend."
                  : "This records the request as under review."}{" "}
              Confirm only after examining the evidence.
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="commerce-row-actions">
            {confirm && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(false)}
              >
                Cancel decision
              </Button>
            )}
            <Button type="submit" disabled={busy}>
              {busy
                ? "Recording…"
                : confirm
                  ? "Confirm return decision"
                  : "Review decision"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
}
export function StoreEditor({ storeId, onSaved }: { storeId: string; onSaved?: () => void }) {
  const { user } = useAuth();
  const load = useCallback(
    () => createOperationsRepository(requireSupabase()).store(storeId),
    [storeId],
  );
  const result = useCommerce(load);
  return (
    <CommerceResult result={result}>
      {(data) => (
        <StoreForm
          key={JSON.stringify(data)}
          data={data}
          storeId={storeId}
          userId={user!.id}
          onSaved={() => { result.refresh(); onSaved?.(); }}
        />
      )}
    </CommerceResult>
  );
}
function StoreForm({
  data,
  storeId,
  userId,
  onSaved,
}: {
  data: StoreSettings;
  storeId: string;
  userId: string;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(data),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createOperationsRepository(requireSupabase()).saveStore(
        storeId,
        userId,
        draft,
      );
      setDone(true);
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Store update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SectionCard
      title="Edit storefront"
      description="Changes update the selected store. Verification, owner, tier and payout settings are not editable here."
    >
      <form className="commerce-form" onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="commerce-form-grid">
            {(
              [
                "name",
                "slug",
                "tagline",
                "description",
                "city",
                "state_code",
                "primary_category",
                "support_phone",
                "support_email",
                "seo_title",
                "seo_description",
                "llm_summary",
              ] as const
            ).map((key) => (
              <label key={key}>
                {label(key)}
                <input
                  type={key === "support_email" ? "email" : "text"}
                  required={["name", "slug"].includes(key)}
                  maxLength={
                    key === "description" || key === "llm_summary" ? 4000 : 300
                  }
                  value={draft[key] || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                />
              </label>
            ))}
          </div>
          {(["indexable", "geo_enabled"] as const).map((key) => (
            <label className="commerce-checkbox" key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(e) =>
                  setDraft({ ...draft, [key]: e.target.checked })
                }
              />
              {label(key)}
            </label>
          ))}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        {done && <p role="status">Storefront saved.</p>}
        <div className="commerce-row-actions">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setDraft(data);
              setError("");
            }}
          >
            Reset unsaved changes
          </Button>
          <Button type="submit" disabled={busy}>
            Save storefront
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
export function CounterpartyDirectory({
  role,
}: {
  role: "seller" | "creator";
}) {
  const repository = useMemo(
    () => createOperationsRepository(requireSupabase()),
    [],
  );
  const [query, setQuery] = useState(""),
    [searched, setSearched] = useState(false),
    [rows, setRows] = useState<
      Array<{ user_id: string; display_name: string; username: string }>
    >([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [link, setLink] = useState("");
  async function search(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setRows([]); setLink(""); setSearched(false);
    setError("");
    try {
      const found = await repository.counterparties(role, query);
      setRows([...new Map(found.map(row => [row.user_id, row])).values()]);
      setSearched(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search unavailable.");
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    if (busy) return;
    setLink("");
    setBusy(true);
    setError("");
    try {
      const conversation = await repository.openCounterparty(id, role);
      setLink(
        `/partner/${role === "seller" ? "creator" : "seller"}/chat?conversation=${encodeURIComponent(conversation)}`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Conversation unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details>
      <summary>
        Find an approved {role === "seller" ? "Seller" : "Creator"}
      </summary>
      <form className="commerce-form" onSubmit={search}>
        <label>
          Search by name
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <Button type="submit" disabled={busy}>
          Search approved accounts
        </Button>
      </form>
      {searched && !rows.length && <p>No approved accounts matched. Try another name.</p>}
      {rows.map((row) => (
        <p key={row.user_id}>
          {row.display_name || row.username}{" "}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void open(row.user_id)}
          >
            Open business conversation
          </Button>
        </p>
      ))}
      {link && (
        <Link className="button primary" to={link}>
          Continue to conversation
        </Link>
      )}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
export function Growth() {
  const load = useCallback(
    () => createOperationsRepository(requireSupabase()).growth(),
    [],
  );
  const result = useCommerce(load);
  return (
    <SectionCard
      title="Creator growth"
      description="Existing backend leaderboard; attributed sales are not a payout balance."
    >
      <CommerceResult result={result}>
        {(rows) =>
          rows.length ? (
            rows.map((row, index) => (
              <p key={row.creator_id}>
                {index + 1}. {row.display_name || row.username} ·{" "}
                {row.successful_orders} orders ·{" "}
                {money(Number(row.attributed_sales_minor))} attributed sales
              </p>
            ))
          ) : (
            <p>No growth records returned.</p>
          )
        }
      </CommerceResult>
    </SectionCard>
  );
}
