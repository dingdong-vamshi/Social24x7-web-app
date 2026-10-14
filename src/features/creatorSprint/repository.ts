import type { SupabaseClient } from "@supabase/supabase-js";
import { getMyCommerceVerificationProfile } from "../../auth/onboardingRepository";
import type { Commission } from "../../repositories/commerce";

function unwrap<T>(result: {
  data: T | null;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null)
    throw new Error(
      "No authorized Creator result returned. Refresh to try again.",
    );
  return result.data;
}
export interface CreatorAttributedOrder extends Commission {
  order_status: string;
  order_currency: string | null;
  product_title: string;
  storefront_name: string;
}

/** Same original commission -> order/item/store joins, projected without customer or payment details. */
export async function loadCreatorAttributedOrders(
  client: SupabaseClient,
  userId: string,
): Promise<CreatorAttributedOrder[]> {
  const rows = unwrap(
    await client
      .from("creator_commissions")
      .select(
        "id,creator_id,order_id,order_item_id,storefront_id,product_id,commission_minor,eligible_item_minor,status,created_at,paid_at,eligible_at,reversal_reason",
      )
      .eq("creator_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ) as Array<Commission & { order_item_id: string; storefront_id: string }>;
  if (!rows.length) return [];
  const ids = (key: "order_id" | "order_item_id" | "storefront_id") => [
    ...new Set(rows.map((row) => row[key])),
  ];
  // Bounded batches prevent long URLs for established Creator accounts.
  async function query<T>(table: string, fields: string, values: string[]) {
    const records: T[] = [];
    for (let i = 0; i < values.length; i += 100)
      records.push(
        ...(unwrap(
          await client
            .from(table)
            .select(fields)
            .in("id", values.slice(i, i + 100)),
        ) as T[]),
      );
    return records;
  }
  const [orders, items, stores] = await Promise.all([
    query<{ id: string; status: string; currency: string }>(
      "orders",
      "id,status,currency",
      ids("order_id"),
    ),
    query<{ id: string; product_title_snapshot: string }>(
      "order_items",
      "id,product_title_snapshot",
      ids("order_item_id"),
    ),
    query<{ id: string; name: string }>(
      "storefronts",
      "id,name",
      ids("storefront_id"),
    ),
  ]);
  const orderById = new Map(orders.map((row) => [row.id, row])),
    itemById = new Map(items.map((row) => [row.id, row])),
    storeById = new Map(stores.map((row) => [row.id, row]));
  return rows.map((row) => ({
    ...row,
    order_status: orderById.get(row.order_id)?.status || "unavailable",
    order_currency: orderById.get(row.order_id)?.currency || null,
    product_title:
      itemById.get(row.order_item_id)?.product_title_snapshot ||
      "Product unavailable",
    storefront_name:
      storeById.get(row.storefront_id)?.name || "Storefront unavailable",
  }));
}

export async function loadCreatorIdentity(
  client: SupabaseClient,
  userId: string,
) {
  const [profileResult, applicationResult, verification] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name,username,bio,avatar_path")
      .eq("id", userId)
      .single(),
    client
      .from("creator_applications")
      .select("category,macro_category,specializations,status")
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getMyCommerceVerificationProfile(client),
  ]);
  const profile = unwrap(profileResult) as {
    id: string;
    display_name: string;
    username: string;
    bio: string | null;
    avatar_path: string | null;
  };
  if (applicationResult.error) throw new Error(applicationResult.error.message);
  const application = applicationResult.data as {
    category: string;
    macro_category: string | null;
    specializations: string[] | null;
    status: string;
  } | null;
  let avatarUrl: string | null = null;
  if (profile.avatar_path) {
    const avatar = await client.storage
      .from("profile-media")
      .createSignedUrl(profile.avatar_path, 3600);
    avatarUrl = avatar.error ? null : avatar.data?.signedUrl || null;
  }
  return { profile, application, verification, avatarUrl };
}
