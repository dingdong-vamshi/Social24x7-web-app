import type {
  Commission,
  Product,
  Promotion,
} from "../../repositories/commerce";
import { money } from "../../repositories/commerce";

type FinancialRecord = Commission & {
  order_status: string;
  order_currency: string | null;
};
export function creatorFinancialScope(rows: readonly FinancialRecord[]) {
  const known = rows.filter(
    (row) =>
      !["unavailable", "unknown", ""].includes(row.order_status) &&
      Boolean(row.order_currency && /^[A-Z]{3}$/.test(row.order_currency)),
  );
  const currencies = [
    ...new Set(known.map((row) => row.order_currency!)),
  ].sort();
  return {
    rows: currencies.length === 1 ? known : [],
    currencies,
    omitted: rows.length - known.length,
  };
}
export function creatorSummaryMoney(
  amount: number,
  rows: readonly FinancialRecord[],
) {
  const scope = creatorFinancialScope(rows);
  if (!rows.length) return "No records";
  if (scope.currencies.length > 1) return "Multiple currencies";
  if (!scope.currencies.length) return "Unavailable";
  return money(amount, scope.currencies[0]);
}
export function creatorRecordMoney(amount: number, currency: string | null) {
  return currency && /^[A-Z]{3}$/.test(currency)
    ? money(amount, currency)
    : "Currency unavailable";
}

export const creatorPeriods = [
  ["last_7_days", "Last 7 days"],
  ["last_30_days", "Last 30 days"],
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["this_year", "This year"],
  ["all_time", "All time"],
] as const;
export type CreatorPeriod = (typeof creatorPeriods)[number][0];
export type ProductSort = "recent" | "price_low" | "price_high" | "commission";

/** Match the original local-calendar period semantics, including an exclusive next-month boundary. */
export function inCreatorPeriod<T extends { created_at: string }>(
  rows: readonly T[],
  period: CreatorPeriod,
  now = new Date(),
) {
  if (period === "all_time") return [...rows];
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  let end: number | null = null;
  if (period === "last_7_days") start.setDate(start.getDate() - 6);
  if (period === "last_30_days") start.setDate(start.getDate() - 29);
  if (period === "this_month") start.setDate(1);
  if (period === "last_month") {
    start.setDate(1);
    end = start.getTime();
    start.setMonth(start.getMonth() - 1);
  }
  if (period === "this_year") start.setMonth(0, 1);
  return rows.filter((row) => {
    const time = new Date(row.created_at).getTime();
    return time >= start.getTime() && (end === null || time < end);
  });
}

export function sortCreatorProducts(
  products: readonly Product[],
  sort: ProductSort,
) {
  return [...products].sort((a, b) => {
    if (sort === "price_low")
      return (
        (a.sale_price_minor ?? a.price_minor) -
        (b.sale_price_minor ?? b.price_minor)
      );
    if (sort === "price_high")
      return (
        (b.sale_price_minor ?? b.price_minor) -
        (a.sale_price_minor ?? a.price_minor)
      );
    if (sort === "commission")
      return b.creator_commission_bps - a.creator_commission_bps;
    return b.updated_at.localeCompare(a.updated_at);
  });
}

export function activeCreatorRelationships(promotions: readonly Promotion[]) {
  return [
    ...new Map(
      promotions
        .filter((row) => row.status === "active")
        .map((row) => [row.storefront_id, row]),
    ).values(),
  ];
}

export function creatorPaymentSummary(records: readonly FinancialRecord[]) {
  const rows = creatorFinancialScope(records).rows.filter(
    (row) =>
      !["cancelled", "refunded", "return_approved"].includes(row.order_status),
  );
  const sum = (statuses: string[]) =>
    rows
      .filter((row) => statuses.includes(row.status))
      .reduce((total, row) => total + row.commission_minor, 0);
  return {
    eligible: sum(["eligible", "payable"]),
    pending: sum(["pending", "confirmed", "withheld"]),
    paid: sum(["paid"]),
  };
}

export function summarizeCreatorEarnings(records: readonly FinancialRecord[]) {
  const rows = creatorFinancialScope(records).rows;
  const qualifying = rows.filter(
    (row) =>
      !["cancelled", "reversed"].includes(row.status) &&
      !["cancelled", "refunded", "return_approved"].includes(row.order_status),
  );
  const sum = (statuses: string[]) =>
    qualifying
      .filter((row) => statuses.includes(row.status))
      .reduce((total, row) => total + row.commission_minor, 0);
  return {
    attributedSales: qualifying.reduce(
      (total, row) => total + row.eligible_item_minor,
      0,
    ),
    estimated: sum(["pending"]),
    pending: sum(["pending", "confirmed", "withheld"]),
    eligible: sum(["eligible", "payable"]),
    paid: sum(["paid"]),
    earned: sum(["confirmed", "eligible", "payable", "paid"]),
    reversed: rows
      .filter((row) => ["reversed", "cancelled"].includes(row.status))
      .reduce((total, row) => total + row.commission_minor, 0),
  };
}
