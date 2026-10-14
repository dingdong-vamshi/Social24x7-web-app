import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order, Storefront } from "./commerce";

export const fulfillmentNext = (
  order: Pick<Order, "status" | "payment_method" | "payment_status">,
): string[] => {
  if (
    order.payment_method === "external" &&
    !["captured", "captured_test"].includes(order.payment_status)
  )
    return [];
  const next: Record<string, string[]> = {
    placed: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["out_for_delivery"],
    out_for_delivery: ["delivered"],
  };
  return next[order.status] || [];
};
export interface FulfillmentInput {
  orderId: string;
  status: string;
  carrier: string;
  trackingNumber: string;
  packageReference: string;
  customerNote: string;
}
export interface OrderEvidence {
  id: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  evidence_source: string;
  created_at: string;
}
export type StoreSettings = Pick<
  Storefront,
  | "name"
  | "slug"
  | "tagline"
  | "description"
  | "city"
  | "state_code"
  | "primary_category"
  | "seo_title"
  | "seo_description"
  | "llm_summary"
> & {
  support_phone: string;
  support_email: string;
  indexable: boolean;
  geo_enabled: boolean;
};
async function value<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): Promise<T> {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null)
    throw new Error("No record was returned. Refresh before retrying.");
  return result.data;
}
export function createOperationsRepository(client: SupabaseClient) {
  return {
    async fulfill(input: FulfillmentInput) {
      const result = await client.rpc(
        "seller_update_creator_commerce_fulfillment",
        {
          p_order_id: input.orderId,
          p_status: input.status,
          p_carrier: input.carrier.trim(),
          p_tracking_number: input.trackingNumber.trim(),
          p_package_reference: input.packageReference.trim(),
          p_customer_note: input.customerNote.trim(),
          p_packing_evidence_path: null,
        },
      );
      if (result.error) throw new Error(result.error.message);
    },
    async reviewReturn(
      id: string,
      decision: "approved" | "rejected" | "under_review",
      reason: string,
    ) {
      const r = await client.rpc("seller_review_creator_commerce_return", {
        p_return_request_id: id,
        p_decision: decision,
        p_reason: reason.trim() || null,
      });
      if (r.error) throw new Error(r.error.message);
    },
    async orderEvents(orderId: string) {
      return value(
        await client
          .from("order_events")
          .select("id,status,detail,created_at")
          .eq("order_id", orderId)
          .order("created_at"),
      );
    },
    async evidence(
      id: string,
      kind: "order" | "return",
    ): Promise<OrderEvidence[]> {
      return value(
        await client
          .from("commerce_order_evidence")
          .select(
            "id,storage_path,file_name,mime_type,evidence_source,created_at",
          )
          .eq(kind === "order" ? "order_id" : "return_request_id", id)
          .order("created_at", { ascending: false }),
      );
    },
    async evidenceUrl(id: string) {
      const row = await value<{ storage_path: string }>(
        await client
          .from("commerce_order_evidence")
          .select("storage_path")
          .eq("id", id)
          .single(),
      );
      return value(
        await client.storage
          .from("creator-commerce-private")
          .createSignedUrl(row.storage_path, 300),
      );
    },
    async store(id: string): Promise<StoreSettings> {
      return value(
        await client
          .from("storefronts")
          .select(
            "name,slug,tagline,description,city,state_code,primary_category,seo_title,seo_description,llm_summary,support_phone,support_email,indexable,geo_enabled",
          )
          .eq("id", id)
          .single(),
      );
    },
    async saveStore(id: string, userId: string, draft: StoreSettings) {
      // Never write owner, approval, seller tier or financial fields from this form.
      if (!draft.name.trim() || !/^[a-z0-9][a-z0-9-]{1,62}$/.test(draft.slug))
        throw new Error(
          "Enter a store name and a lowercase URL slug (2–63 characters).",
        );
      return value(
        await client
          .from("storefronts")
          .update({
            name: draft.name.trim(),
            slug: draft.slug,
            tagline: draft.tagline,
            description: draft.description,
            city: draft.city,
            state_code: draft.state_code,
            primary_category: draft.primary_category,
            seo_title: draft.seo_title,
            seo_description: draft.seo_description,
            llm_summary: draft.llm_summary,
            support_phone: draft.support_phone,
            support_email: draft.support_email,
            indexable: draft.indexable,
            geo_enabled: draft.geo_enabled,
          })
          .eq("id", id)
          .eq("owner_id", userId)
          .select("id")
          .single(),
      );
    },
    async counterparties(role: "seller" | "creator", query: string) {
      return value(
        await client.rpc("search_creator_seller_counterparties", {
          p_role: role,
          p_query: query.trim(),
          p_limit: 20,
        }),
      ) as Promise<
        Array<{ user_id: string; display_name: string; username: string }>
      >;
    },
    async openCounterparty(id: string, role: "seller" | "creator") {
      return value(
        await client.rpc("open_creator_seller_conversation", {
          target_user: id,
          p_role: role,
        }),
      ) as Promise<string>;
    },
    async growth() {
      return value(
        await client.rpc("get_creator_growth_leaderboard", { p_limit: 25 }),
      ) as Promise<
        Array<{
          creator_id: string;
          display_name: string;
          username: string;
          attributed_sales_minor: number;
          successful_orders: number;
        }>
      >;
    },
    async profile(id: string) {
      return value<{
        display_name: string;
        username: string;
        bio: string | null;
      }>(
        await client
          .from("profiles")
          .select("display_name,username,bio")
          .eq("id", id)
          .single(),
      );
    },
    async saveProfile(
      id: string,
      draft: { display_name: string; username: string; bio: string },
    ) {
      if (!draft.display_name.trim() || !draft.username.trim())
        throw new Error("Name and username are required.");
      return value(
        await client
          .from("profiles")
          .update({
            display_name: draft.display_name.trim(),
            username: draft.username.trim(),
            bio: draft.bio,
          })
          .eq("id", id)
          .select("id")
          .single(),
      );
    },
  };
}
