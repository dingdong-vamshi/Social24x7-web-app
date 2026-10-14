import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  CommerceEmpty,
  CommerceNote,
  CommerceResult,
  useCommerce,
} from "../../components/LiveCommerce";
import {
  Button,
  MetricCard,
  PageHeader,
  SectionCard,
  StatusPill,
} from "../../components/Ui";
import { requireSupabase } from "../../lib/supabase";
import { commerce, dateTime, label } from "../../repositories/commerce";
import {
  activeCreatorRelationships,
  creatorPaymentSummary,
  creatorPeriods,
  creatorFinancialScope,
  creatorRecordMoney,
  creatorSummaryMoney,
  inCreatorPeriod,
  type CreatorPeriod,
} from "./model";
import {
  loadCreatorAttributedOrders,
  loadCreatorIdentity,
  type CreatorAttributedOrder,
} from "./repository";
import "./creator.css";

export function CreatorFinancialNotice({
  rows,
}: {
  rows: CreatorAttributedOrder[];
}) {
  const scope = creatorFinancialScope(rows);
  return (
    <>
      {scope.omitted > 0 && (
        <CommerceNote>
          {scope.omitted} commission record(s) have unavailable order status or
          currency. They are excluded from monetary summaries; visible ledger
          records are preserved.
        </CommerceNote>
      )}
      {scope.currencies.length > 1 && (
        <CommerceNote>
          Multiple currencies ({scope.currencies.join(", ")}) are present.
          Combined monetary totals are not shown. Review each ledger amount in
          its recorded currency.
        </CommerceNote>
      )}
    </>
  );
}

export function CreatorPeriodSelect({
  value,
  onChange,
}: {
  value: CreatorPeriod;
  onChange: (value: CreatorPeriod) => void;
}) {
  return (
    <label className="commerce-filter-label">
      Reporting period
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as CreatorPeriod)}
      >
        {creatorPeriods.map(([key, title]) => (
          <option key={key} value={key}>
            {title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CreatorOrders({ userId }: { userId: string }) {
  const [period, setPeriod] = useState<CreatorPeriod>("last_30_days");
  const load = useCallback(
    () => loadCreatorAttributedOrders(requireSupabase(), userId),
    [userId],
  );
  const result = useCommerce(load);
  return (
    <SectionCard
      title="Recent attributed orders"
      description="Your existing attribution records, not access to Seller order management or customer details."
    >
      <CreatorPeriodSelect value={period} onChange={setPeriod} />
      <Button variant="secondary" onClick={result.refresh}>
        Refresh orders
      </Button>
      <CommerceResult result={result}>
        {(rows) => <CreatorOrderTable rows={inCreatorPeriod(rows, period)} />}
      </CommerceResult>
      <CommerceNote>
        Up to 500 latest commission records. Multiple commission items may
        belong to the same order.
      </CommerceNote>
    </SectionCard>
  );
}
export function CreatorOrderTable({
  rows,
}: {
  rows: CreatorAttributedOrder[];
}) {
  return rows.length ? (
    <div className="table-card commerce-table">
      <table>
        <thead>
          <tr>
            <th>Order / product</th>
            <th>Seller</th>
            <th>Order status</th>
            <th>Commission</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Order / product">
                <strong>{row.order_id.slice(0, 8)}</strong>
                <small>{row.product_title}</small>
              </td>
              <td data-label="Seller">{row.storefront_name}</td>
              <td data-label="Order status">
                <StatusPill>{label(row.order_status)}</StatusPill>
              </td>
              <td data-label="Commission">
                {creatorRecordMoney(row.commission_minor, row.order_currency)}
                <small>{label(row.status)}</small>
                {row.reversal_reason && <small>{row.reversal_reason}</small>}
              </td>
              <td data-label="Recorded">{dateTime(row.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <CommerceEmpty
      title="No attributed orders in this period"
      description="Orders appear only when the existing service records attribution to your Creator account."
    />
  );
}

export function CreatorCollaborations({ userId }: { userId: string }) {
  const load = useCallback(() => commerce.promotions(userId), [userId]);
  const result = useCommerce(load);
  return (
    <>
      <PageHeader
        title="Collab"
        eyebrow="Seller relationships"
        description="Relationships inferred from your real active product promotions."
        actions={
          <Button variant="secondary" onClick={result.refresh}>
            Refresh
          </Button>
        }
      />
      <CommerceResult result={result}>
        {(rows) => {
          const relationships = activeCreatorRelationships(rows);
          return (
            <SectionCard
              title={`Active collaborations · ${relationships.length}`}
            >
              {relationships.length ? (
                relationships.map((promotion) => (
                  <div
                    className="commerce-summary-row"
                    key={promotion.storefront_id}
                  >
                    <div>
                      <strong>
                        {promotion.products?.storefronts?.name ||
                          "Seller storefront"}
                      </strong>
                      <small>
                        {
                          rows.filter(
                            (row) =>
                              row.storefront_id === promotion.storefront_id &&
                              row.status === "active",
                          ).length
                        }{" "}
                        active product promotions
                      </small>
                    </div>
                    <Button to="/partner/creator/links" variant="secondary">
                      View affiliate links
                    </Button>
                  </div>
                ))
              ) : (
                <CommerceEmpty
                  title="No active collaborations"
                  description="Eligible Seller products you promote will appear here."
                />
              )}
            </SectionCard>
          );
        }}
      </CommerceResult>
      <SectionCard title="Campaign invitations and completion">
        <p>
          Structured invitations, campaign contracts, negotiated briefs and
          completion records were placeholders in the original app. No campaigns
          are invented here.
        </p>
      </SectionCard>
      <Button to="/partner/creator/chat">Open Creator chats</Button>
      <CommerceNote>
        Collaborations do not grant access to Seller inventory, customer details
        or employee conversations.
      </CommerceNote>
    </>
  );
}

export function CreatorPayments({ userId }: { userId: string }) {
  const load = useCallback(
    () => loadCreatorAttributedOrders(requireSupabase(), userId),
    [userId],
  );
  const result = useCommerce(load);
  const [explanation, setExplanation] = useState(false);
  return (
    <>
      <PageHeader
        title="Payments"
        eyebrow="Commission status"
        description="Provider-neutral payment information from your commission ledger."
        actions={
          <Button variant="secondary" onClick={result.refresh}>
            Refresh
          </Button>
        }
      />
      <CommerceResult result={result}>
        {(rows) => {
          const totals = creatorPaymentSummary(rows);
          return (
            <>
              <CreatorFinancialNotice rows={rows} />
              <div className="metric-grid compact-metrics">
                <MetricCard
                  label="Eligible / payable"
                  value={creatorSummaryMoney(totals.eligible, rows)}
                  detail="Recorded commission; not a withdrawal guarantee"
                />
                <MetricCard
                  label="Pending"
                  value={creatorSummaryMoney(totals.pending, rows)}
                  detail="Order or return state unresolved"
                />
                <MetricCard
                  label="Paid"
                  value={creatorSummaryMoney(totals.paid, rows)}
                  detail="Authoritative paid rows only"
                />
              </div>
            </>
          );
        }}
      </CommerceResult>
      <SectionCard
        title="Collect payment"
        description="The original workflow has no connected payout provider. No transfer, UPI payment, settlement date or automatic debit is claimed."
      >
        <Button variant="secondary" onClick={() => setExplanation(true)}>
          View payout requirements
        </Button>
        {explanation && (
          <p role="status">
            No payment was attempted. A verified payment provider and the
            existing authorized financial verification process must be connected
            before payouts can be requested. Your ledger is unchanged.
          </p>
        )}
        <Button variant="ghost" to="/partner/creator/earnings">
          Review commission ledger
        </Button>
      </SectionCard>
    </>
  );
}

export function CreatorIdentity({ userId }: { userId: string }) {
  const { access } = useAuth();
  const load = useCallback(
    () => loadCreatorIdentity(requireSupabase(), userId),
    [userId],
  );
  const result = useCommerce(load);
  const [badge, setBadge] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <>
      <PageHeader
        title="Profile"
        eyebrow="Creator identity"
        description="Your shared Social identity, application category and separate verification statuses."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              setImageFailed(false);
              result.refresh();
            }}
          >
            Refresh
          </Button>
        }
      />
      <CommerceResult result={result}>
        {({ profile, application, verification, avatarUrl }) => (
          <>
            <SectionCard
              title={profile.display_name || profile.username || "Creator"}
            >
              <div className="creator-identity-heading">
                {avatarUrl && !imageFailed ? (
                  <img
                    src={avatarUrl}
                    alt="Your Creator avatar"
                    className="creator-identity-avatar"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <span
                    className="creator-identity-initial"
                    aria-label="No available avatar"
                  >
                    {(profile.display_name || profile.username || "C")
                      .slice(0, 1)
                      .toUpperCase()}
                  </span>
                )}
                <div>
                  <p>@{profile.username}</p>
                  <p className="creator-product-description">
                    {profile.bio || "No Creator bio added yet."}
                  </p>
                </div>
              </div>
              <Button to="/account">Edit shared profile</Button>
              <Link
                className="button secondary"
                to={`/partner/creator/social?profile=${encodeURIComponent(profile.id)}`}
              >
                Social profile
              </Link>
            </SectionCard>
            <SectionCard title="Creator details">
              <dl className="commerce-definition">
                <div>
                  <dt>Macro category</dt>
                  <dd>
                    {application?.macro_category ||
                      application?.category ||
                      "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>Specialisations</dt>
                  <dd>
                    {application?.specializations?.join(", ") || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt>Creator approval</dt>
                  <dd>
                    <StatusPill>
                      {label(access?.creator_status || "unknown")}
                    </StatusPill>
                  </dd>
                </div>
                <div>
                  <dt>Professional verification</dt>
                  <dd>
                    {label(
                      access?.professional_status ||
                        verification.professionalStatus,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Identity verification</dt>
                  <dd>{label(verification.identityStatus)}</dd>
                </div>
              </dl>
              <Button to="/partner/creator/professional" variant="secondary">
                Professional verification
              </Button>
            </SectionCard>
            <SectionCard
              title="Creator badge"
              description="Optional paid entitlement; it does not replace identity, professional, Seller or Admin verification."
            >
              <dl className="commerce-definition">
                <div>
                  <dt>Badge status</dt>
                  <dd>{label(verification.blueTickStatus)}</dd>
                </div>
                <div>
                  <dt>Recorded payment status</dt>
                  <dd>{label(verification.blueTickPaymentStatus)}</dd>
                </div>
              </dl>
              <Button variant="secondary" onClick={() => setBadge(true)}>
                View badge requirements
              </Button>
              {badge && (
                <p role="status">
                  Badge purchase is not connected to a payment provider. No
                  charge or verification approval was attempted.
                </p>
              )}
            </SectionCard>
          </>
        )}
      </CommerceResult>
      <CommerceNote>
        Application evidence and document paths are not loaded by this profile
        view. No submitted social URL is treated as verified ownership.
      </CommerceNote>
    </>
  );
}
