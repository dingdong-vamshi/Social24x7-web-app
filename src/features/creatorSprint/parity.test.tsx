import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, Promotion } from "../../repositories/commerce";
import {
  activeCreatorRelationships,
  creatorPaymentSummary,
  creatorFinancialScope,
  creatorSummaryMoney,
  creatorRecordMoney,
  inCreatorPeriod,
  sortCreatorProducts,
  summarizeCreatorEarnings,
  type CreatorPeriod,
} from "./model";
import { loadCreatorAttributedOrders, loadCreatorIdentity } from "./repository";
import {
  CreatorCollaborations,
  CreatorIdentity,
  CreatorPayments,
  CreatorPeriodSelect,
} from "./CreatorParityPanels";

const mock = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  storage: { from: vi.fn() },
  promotions: vi.fn(),
}));
vi.mock("../../lib/supabase", () => ({ requireSupabase: () => mock }));
vi.mock("../../auth/AuthContext", () => ({
  useAuth: () => ({
    access: { creator_status: "approved", professional_status: "not_applied" },
  }),
}));
vi.mock("../../repositories/commerce", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../repositories/commerce")>()),
  commerce: { promotions: mock.promotions },
}));
type QueryResult = { data: unknown; error: null | { message: string } };
const tables: Record<string, QueryResult> = {};
const queries: Array<{ table: string; method: string; args: unknown[] }> = [];
const commission = {
  id: "commission",
  creator_id: "creator",
  order_id: "order",
  order_item_id: "item",
  storefront_id: "store",
  product_id: "product",
  commission_minor: 100,
  eligible_item_minor: 1000,
  status: "paid",
  created_at: "2026-10-14T09:00:00Z",
  paid_at: null,
  eligible_at: null,
  reversal_reason: null,
};
const promotion = {
  id: "promotion",
  creator_id: "creator",
  storefront_id: "store",
  product_id: "product",
  tracking_code: "code",
  status: "active",
  commission_bps_snapshot: 1000,
  created_at: "2026-10-01T09:00:00Z",
  products: {
    title: "Product",
    slug: "product",
    storefronts: { name: "QA Store", slug: "store" },
  },
} satisfies Promotion;
function client() {
  return mock as unknown as SupabaseClient;
}
beforeEach(() => {
  vi.resetAllMocks();
  queries.length = 0;
  for (const key of Object.keys(tables)) delete tables[key];
  tables.creator_commissions = { data: [commission], error: null };
  tables.orders = {
    data: [{ id: "order", status: "delivered", currency: "INR" }],
    error: null,
  };
  tables.order_items = {
    data: [{ id: "item", product_title_snapshot: "Original product" }],
    error: null,
  };
  tables.storefronts = {
    data: [{ id: "store", name: "QA Store" }],
    error: null,
  };
  tables.profiles = {
    data: {
      id: "creator",
      display_name: "QA Creator",
      username: "qacreator",
      bio: "Creator bio",
      avatar_path: null,
    },
    error: null,
  };
  tables.creator_applications = {
    data: {
      category: "Education",
      macro_category: "Learning",
      specializations: ["Teaching"],
      status: "approved",
    },
    error: null,
  };
  mock.from.mockImplementation((table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of [
      "select",
      "eq",
      "order",
      "limit",
      "in",
      "single",
      "maybeSingle",
    ])
      chain[method] = (...args: unknown[]) => {
        queries.push({ table, method, args });
        return chain;
      };
    chain.then = (resolve: (v: QueryResult) => unknown) =>
      Promise.resolve(tables[table] || { data: [], error: null }).then(resolve);
    return chain;
  });
  mock.rpc.mockResolvedValue({
    data: {
      user_id: "creator",
      identity_status: "not_started",
      professional_status: "not_started",
      blue_tick_status: "not_active",
      blue_tick_payment_status: "not_paid",
    },
    error: null,
  });
  mock.promotions.mockResolvedValue([promotion]);
});

describe("original Creator model parity", () => {
  const now = new Date(2026, 9, 14, 12);
  const rows = [
    new Date(2026, 8, 30, 23, 59),
    new Date(2026, 9, 1),
    new Date(2026, 9, 8),
    new Date(2026, 9, 14),
  ].map((date, id) => ({ id, created_at: date.toISOString() }));
  it.each<[CreatorPeriod, number]>([
    ["last_7_days", 2],
    ["last_30_days", 4],
    ["this_month", 3],
    ["last_month", 1],
    ["this_year", 4],
    ["all_time", 4],
  ])("filters %s using the original calendar boundaries", (period, count) =>
    expect(inCreatorPeriod(rows, period, now)).toHaveLength(count),
  );
  it("handles January last month without a year or day rollover", () =>
    expect(
      inCreatorPeriod(
        [
          { created_at: new Date(2025, 11, 31).toISOString() },
          { created_at: new Date(2026, 0, 1).toISOString() },
        ],
        "last_month",
        new Date(2026, 0, 31),
      ),
    ).toHaveLength(1));
  it("sorts price using sale price, commission and update time without mutating input", () => {
    const products = [
      {
        id: "a",
        price_minor: 500,
        sale_price_minor: 100,
        creator_commission_bps: 100,
        updated_at: "2026-10-01",
      },
      {
        id: "b",
        price_minor: 300,
        sale_price_minor: null,
        creator_commission_bps: 200,
        updated_at: "2026-10-02",
      },
    ] as Product[];
    expect(sortCreatorProducts(products, "price_low")[0].id).toBe("a");
    for (const sort of ["price_high", "commission", "recent"] as const)
      expect(sortCreatorProducts(products, sort)[0].id).toBe("b");
    expect(products[0].id).toBe("a");
  });
  it("counts distinct stores from active promotions only", () =>
    expect(
      activeCreatorRelationships([
        promotion,
        { ...promotion, id: "same-store" },
        { ...promotion, storefront_id: "inactive-store", status: "paused" },
      ]),
    ).toEqual([expect.objectContaining({ storefront_id: "store" })]));
  it("keeps payable/pending/paid separate and excludes reversed amounts", () =>
    expect(
      creatorPaymentSummary(
        [
          "eligible",
          "payable",
          "pending",
          "confirmed",
          "withheld",
          "paid",
          "reversed",
          "cancelled",
        ].map((status) => ({
          ...commission,
          status,
          order_status: "delivered",
          order_currency: "INR",
        })),
      ),
    ).toEqual({ eligible: 200, pending: 300, paid: 100 }));
  it("restores original earnings semantics excluding cancelled/refunded orders from qualifying sales", () => {
    const rows = [
      "pending",
      "confirmed",
      "withheld",
      "eligible",
      "payable",
      "paid",
      "reversed",
      "cancelled",
    ].map((status) => ({
      ...commission,
      status,
      order_status: "delivered",
      order_currency: "INR",
    }));
    rows.push({
      ...commission,
      status: "paid",
      order_status: "refunded",
      order_currency: "INR",
    });
    expect(summarizeCreatorEarnings(rows)).toEqual({
      attributedSales: 6000,
      estimated: 100,
      pending: 300,
      eligible: 200,
      paid: 100,
      earned: 400,
      reversed: 200,
    });
  });
});

describe("Creator read contract and authorization projections", () => {
  it("excludes unavailable order or currency from summaries while preserving ledger rows", () => {
    const rows = [
      { ...commission, order_status: "unavailable", order_currency: null },
      { ...commission, order_status: "unknown", order_currency: "INR" },
    ];
    expect(creatorFinancialScope(rows).omitted).toBe(2);
    expect(summarizeCreatorEarnings(rows).earned).toBe(0);
    expect(creatorPaymentSummary(rows).paid).toBe(0);
    expect(creatorSummaryMoney(0, rows)).toBe("Unavailable");
    expect(creatorRecordMoney(100, null)).toBe("Currency unavailable");
  });
  it("never combines mixed currencies into one monetary total", () => {
    const rows = ["INR", "USD"].map((order_currency) => ({
      ...commission,
      order_status: "delivered",
      order_currency,
    }));
    expect(creatorFinancialScope(rows).currencies).toEqual(["INR", "USD"]);
    expect(creatorFinancialScope(rows).rows).toEqual([]);
    expect(summarizeCreatorEarnings(rows).earned).toBe(0);
    expect(creatorSummaryMoney(0, rows)).toBe("Multiple currencies");
    expect(creatorRecordMoney(100, "USD")).toContain("$");
  });
  it("scopes commission reads and secondary joins to authorized returned identifiers", async () => {
    const rows = await loadCreatorAttributedOrders(client(), "creator");
    expect(rows[0]).toMatchObject({
      product_title: "Original product",
      order_status: "delivered",
      storefront_name: "QA Store",
    });
    expect(queries).toContainEqual({
      table: "creator_commissions",
      method: "eq",
      args: ["creator_id", "creator"],
    });
    expect(queries).toContainEqual({
      table: "orders",
      method: "in",
      args: ["id", ["order"]],
    });
    expect(queries).toContainEqual({
      table: "orders",
      method: "select",
      args: ["id,status,currency"],
    });
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("does not request other tables when no authorized attribution exists", async () => {
    tables.creator_commissions.data = [];
    expect(await loadCreatorAttributedOrders(client(), "creator")).toEqual([]);
    expect(mock.from).toHaveBeenCalledTimes(1);
  });
  it("propagates backend denial instead of claiming an empty or paid result", async () => {
    tables.orders.error = { message: "Permission denied" };
    await expect(
      loadCreatorAttributedOrders(client(), "creator"),
    ).rejects.toThrow("Permission denied");
  });
  it("keeps unavailable order status distinct from paid commission status", async () => {
    tables.orders.data = [];
    expect(
      (await loadCreatorAttributedOrders(client(), "creator"))[0].order_status,
    ).toBe("unavailable");
  });
  it("loads own profile/application summary without KYC paths or other account filters", async () => {
    const result = await loadCreatorIdentity(client(), "creator");
    expect(result.application?.macro_category).toBe("Learning");
    expect(queries).toContainEqual({
      table: "creator_applications",
      method: "eq",
      args: ["owner_id", "creator"],
    });
    expect(
      queries
        .filter((q) => q.method === "select")
        .some((q) => String(q.args[0]).includes("document")),
    ).toBe(false);
    expect(mock.rpc).toHaveBeenCalledWith(
      "get_my_commerce_verification_profile",
    );
  });
  it("does not fallback to public avatar access when signed access fails", async () => {
    tables.profiles.data = {
      ...(tables.profiles.data as object),
      avatar_path: "creator/avatar.jpg",
    };
    const createSignedUrl = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: "Denied" } });
    mock.storage.from.mockReturnValue({ createSignedUrl });
    expect(
      (await loadCreatorIdentity(client(), "creator")).avatarUrl,
    ).toBeNull();
    expect(createSignedUrl).toHaveBeenCalledWith("creator/avatar.jpg", 3600);
  });
});

describe("Creator restored UI surfaces", () => {
  it("warns when authorized order data is absent instead of showing earnings as zero", async () => {
    tables.orders.data = [];
    render(
      <MemoryRouter>
        <CreatorPayments userId="creator" />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/unavailable order status or currency/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable")).toHaveLength(3);
  });
  it("warns about mixed currencies rather than displaying a converted or summed balance", async () => {
    tables.creator_commissions.data = [
      commission,
      { ...commission, id: "usd-commission", order_id: "usd-order" },
    ];
    tables.orders.data = [
      { id: "order", status: "delivered", currency: "INR" },
      { id: "usd-order", status: "delivered", currency: "USD" },
    ];
    render(
      <MemoryRouter>
        <CreatorPayments userId="creator" />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Combined monetary totals are not shown/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Multiple currencies")).toHaveLength(3);
  });
  it("offers all six periods and reports selection", () => {
    const change = vi.fn();
    render(<CreatorPeriodSelect value="all_time" onChange={change} />);
    expect(screen.getAllByRole("option")).toHaveLength(6);
    fireEvent.change(screen.getByLabelText("Reporting period"), {
      target: { value: "last_month" },
    });
    expect(change).toHaveBeenCalledWith("last_month");
  });
  it("renders actual collaboration relationships without claiming campaign records", async () => {
    render(
      <MemoryRouter>
        <CreatorCollaborations userId="creator" />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText("Active collaborations · 1"),
    ).toBeInTheDocument();
    expect(screen.getByText("QA Store")).toBeInTheDocument();
    expect(screen.getByText(/Structured invitations/)).toBeInTheDocument();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("payment requirements are informative and never call a payout mutation", async () => {
    render(
      <MemoryRouter>
        <CreatorPayments userId="creator" />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View payout requirements" }),
    );
    expect(
      await screen.findByText(/No payment was attempted/),
    ).toBeInTheDocument();
    await screen.findByText("Authoritative paid rows only");
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(
      queries.every((q) =>
        ["select", "eq", "in", "order", "limit"].includes(q.method),
      ),
    ).toBe(true);
  });
  it("profile shows real fields, shared Social route and no invented badge approval", async () => {
    render(
      <MemoryRouter>
        <CreatorIdentity userId="creator" />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Creator bio")).toBeInTheDocument();
    expect(screen.getByText("Learning")).toBeInTheDocument();
    expect(screen.getByText("Teaching")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Social profile" }),
    ).toHaveAttribute("href", "/partner/creator/social?profile=creator");
    fireEvent.click(
      screen.getByRole("button", { name: "View badge requirements" }),
    );
    expect(
      screen.getByText(/No charge or verification approval/),
    ).toBeInTheDocument();
    expect(
      mock.rpc.mock.calls.every(
        ([name]) => name === "get_my_commerce_verification_profile",
      ),
    ).toBe(true);
  });
});
