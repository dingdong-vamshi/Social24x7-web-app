import type { SupabaseClient } from "@supabase/supabase-js";
import { verifiedDisplayNames } from "../../auth/publicIdentity";
import { extendedSocialRepository } from "./extendedRepository";
export interface SocialProfile {
  id: string;
  username: string;
  display_name: string;
  bio?: string;
  avatar_path?: string | null;
  verified_professional?: boolean;
}
export interface Post {
  id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_path?: string | null;
  author_avatar_url?: string | null;
  author_verified_professional?: boolean;
  body: string;
  media_paths: string[] | null;
  thumbnail_path?: string | null;
  media_type: string | null;
  created_at: string;
  like_count: number;
  comment_count: number;
  liked_by_viewer: boolean;
  following_author: boolean;
}
export interface SearchResult {
  entity_kind: "profile" | "post";
  entity_id: string;
  author_id: string;
  username: string;
  display_name: string;
  body: string | null;
  avatar_path?: string | null;
  avatar_url?: string | null;
  verified_professional?: boolean;
}
export interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles: { id: string; display_name: string; username: string } | null;
}
export interface Notification {
  id: string;
  source: "chat" | "commerce" | "social";
  title: string;
  body: string;
  kind: string;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}
export function uuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
export function notificationDestination(item: Notification, base: string) {
  if (item.source === "chat" && item.entityId && uuid(item.entityId))
    return "/account/chat/" + item.entityId;
  if (item.source === "social" && item.entityId && uuid(item.entityId))
    return base + "?profile=" + item.entityId;
  if (item.source === "commerce") return "/account/orders";
  return base;
}
export function createSocialRepository(
  client: SupabaseClient,
  viewerId: string,
) {
  const check = async () => {
    const result = await client.auth.getUser();
    if (
      result.error ||
      result.data.user?.id !== viewerId ||
      result.data.user.app_metadata?.account_type === "business_employee"
    )
      throw new Error(
        "Your personal account session changed. Reload before continuing.",
      );
  };
  const extended = extendedSocialRepository(client, viewerId, check);
  return {
    ...extended,
    async feed(offset = 0): Promise<Post[]> {
      const result = await client.rpc("get_social_feed", {
        page_size: 20,
        page_offset: offset,
      });
      if (result.error) throw result.error;
      const rows = (result.data || []) as Post[];
      const profiles = rows.length
        ? await client.rpc("get_public_social_profiles", {
            target_ids: [...new Set(rows.map((row) => row.author_id))],
          })
        : null;
      const verifiedIds = new Set<string>(
        (!profiles?.error && Array.isArray(profiles?.data) ? profiles.data : [])
          .filter(
            (profile: SocialProfile) => profile.verified_professional === true,
          )
          .map((profile: SocialProfile) => profile.id),
      );
      const names = await verifiedDisplayNames(
        client,
        rows.map((row) => row.author_id),
      );
      const avatars = new Map<string, Promise<string | null>>();
      return Promise.all(
        rows.map(async (row) => {
          if (!avatars.has(row.author_id))
            avatars.set(row.author_id, extended.avatar(row.author_avatar_path));
          return {
            ...row,
            author_verified_professional: verifiedIds.has(row.author_id),
            author_display_name:
              names[row.author_id] || row.author_display_name,
            author_avatar_url: await avatars.get(row.author_id),
          };
        }),
      );
    },
    async post(id: string): Promise<Post> {
      if (!uuid(id)) throw new Error("Invalid post link.");
      const result = await client
        .from("posts")
        .select("id,author_id,body,media_paths,media_type,created_at")
        .eq("id", id)
        .single();
      if (result.error) throw result.error;
      const [profiles, likes, comments, ownLike, following] = await Promise.all(
        [
          client.rpc("get_public_social_profiles", {
            target_ids: [result.data.author_id],
          }),
          client
            .from("post_likes")
            .select("*", { count: "exact", head: true })
            .eq("post_id", id),
          client
            .from("post_comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", id),
          client
            .from("post_likes")
            .select("post_id")
            .eq("post_id", id)
            .eq("user_id", viewerId)
            .maybeSingle(),
          client
            .from("follows")
            .select("following_id")
            .eq("follower_id", viewerId)
            .eq("following_id", result.data.author_id)
            .maybeSingle(),
        ],
      );
      for (const r of [profiles, likes, comments, ownLike, following])
        if (r.error) throw r.error;
      const profile = profiles.data?.[0];
      const names = await verifiedDisplayNames(client, [result.data.author_id]);
      return {
        ...result.data,
        author_username: profile?.username || "",
        author_display_name:
          names[result.data.author_id] ||
          profile?.display_name ||
          "Social member",
        author_avatar_url: await extended.avatar(profile?.avatar_path),
        author_verified_professional: profile?.verified_professional === true,
        like_count: likes.count || 0,
        comment_count: comments.count || 0,
        liked_by_viewer: Boolean(ownLike.data),
        following_author: Boolean(following.data),
      };
    },
    mediaUrl(path: string) {
      return client.storage.from("social-posts").getPublicUrl(path).data
        .publicUrl;
    },
    async profile(id: string): Promise<SocialProfile | null> {
      if (!uuid(id)) throw new Error("Invalid profile link.");
      const result = await client.rpc("get_public_social_profiles", {
        target_ids: [id],
      });
      if (result.error) throw result.error;
      const profile = result.data?.[0] as SocialProfile | undefined;
      const names = profile ? await verifiedDisplayNames(client, [id]) : {};
      return profile
        ? { ...profile, display_name: names[id] || profile.display_name }
        : null;
    },
    async search(query: string): Promise<SearchResult[]> {
      if (!query.trim()) return [];
      const result = await client.rpc("search_social_entities", {
        search_text: query.trim(),
        result_limit: 24,
      });
      if (result.error) throw result.error;
      const rows = (result.data || []) as SearchResult[];
      const names = await verifiedDisplayNames(
        client,
        rows.map((row) =>
          row.entity_kind === "profile" ? row.entity_id : row.author_id,
        ),
      );
      return Promise.all(
        rows.map(async (row) => ({
          ...row,
          avatar_url: await extended.avatar(row.avatar_path),
          display_name:
            names[
              row.entity_kind === "profile" ? row.entity_id : row.author_id
            ] || row.display_name,
        })),
      );
    },
    async publish(body: string) {
      await check();
      if (!body.trim() || body.trim().length > 5000)
        throw new Error("Enter a post between 1 and 5,000 characters.");
      const result = await client
        .from("posts")
        .insert({
          author_id: viewerId,
          body: body.trim(),
          media_paths: [],
          media_type: null,
          thumbnail_path: null,
          topic_slugs: [],
          visibility: "public",
        })
        .select("id")
        .single();
      if (result.error) throw result.error;
      return result.data.id as string;
    },
    async like(id: string, liked: boolean) {
      await check();
      const result = liked
        ? await client
            .from("post_likes")
            .upsert({ post_id: id, user_id: viewerId })
        : await client
            .from("post_likes")
            .delete()
            .eq("post_id", id)
            .eq("user_id", viewerId);
      if (result.error) throw result.error;
      const count = await client
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id);
      if (count.error) throw count.error;
      return count.count || 0;
    },
    async following(id: string) {
      const result = await client
        .from("follows")
        .select("following_id")
        .eq("follower_id", viewerId)
        .eq("following_id", id)
        .maybeSingle();
      if (result.error) throw result.error;
      return Boolean(result.data);
    },
    async follow(id: string, following: boolean) {
      await check();
      if (id === viewerId) throw new Error("You cannot follow yourself.");
      const result = following
        ? await client
            .from("follows")
            .upsert({ follower_id: viewerId, following_id: id })
        : await client
            .from("follows")
            .delete()
            .eq("follower_id", viewerId)
            .eq("following_id", id);
      if (result.error) throw result.error;
    },
    async comments(id: string): Promise<Comment[]> {
      const result = await client
        .from("post_comments")
        .select(
          "id,body,created_at,profiles!post_comments_author_id_fkey(id,username,display_name)",
        )
        .eq("post_id", id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (result.error) throw result.error;
      const comments = (result.data || []).map((row) => ({
        ...row,
        profiles: Array.isArray(row.profiles)
          ? row.profiles[0] || null
          : row.profiles,
      }));
      const names = await verifiedDisplayNames(
        client,
        comments.flatMap((row) => (row.profiles ? [row.profiles.id] : [])),
      );
      return comments.map((row) => ({
        ...row,
        profiles: row.profiles
          ? {
              ...row.profiles,
              display_name: names[row.profiles.id] || row.profiles.display_name,
            }
          : null,
      }));
    },
    async comment(id: string, body: string) {
      await check();
      if (!body.trim() || body.length > 2000)
        throw new Error("Enter a comment between 1 and 2,000 characters.");
      const result = await client
        .from("post_comments")
        .insert({ post_id: id, author_id: viewerId, body: body.trim() });
      if (result.error) throw result.error;
    },
    async notifications(): Promise<Notification[]> {
      const groups = await Promise.all(
        (["chat", "commerce", "social"] as const).map(async (source) => {
          const entity =
            source === "chat"
              ? "conversation_id"
              : source === "commerce"
                ? "entity_id"
                : "actor_id";
          const result = await client
            .from(source + "_notifications")
            .select("id,kind,title,body,read_at,created_at," + entity)
            .eq("recipient_id", viewerId)
            .order("created_at", { ascending: false })
            .limit(40);
          if (result.error) throw result.error;
          return (result.data || []).map((value) => {
            const row = value as unknown as Record<string, unknown>;
            return {
              id: String(row.id),
              source,
              title: String(row.title || "Notification"),
              body: String(row.body || ""),
              kind: String(row.kind || source),
              entityId: row[entity] ? String(row[entity]) : null,
              readAt: row.read_at ? String(row.read_at) : null,
              createdAt: String(row.created_at),
            };
          });
        }),
      );
      return groups
        .flat()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async markRead(item: Notification) {
      await check();
      if (!["chat", "commerce", "social"].includes(item.source))
        throw new Error("Invalid notification source.");
      const result = await client
        .from(item.source + "_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", item.id)
        .eq("recipient_id", viewerId);
      if (result.error) throw result.error;
    },
    async markAllRead() {
      await check();
      const results = await Promise.all(
        ["chat", "commerce", "social"].map((source) =>
          client
            .from(source + "_notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("recipient_id", viewerId)
            .is("read_at", null),
        ),
      );
      for (const result of results) if (result.error) throw result.error;
    },
    subscribe(listener: () => void) {
      const channel = client.channel(
        "social-notifications:" + viewerId + ":" + crypto.randomUUID(),
      );
      for (const source of ["chat", "commerce", "social"])
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: source + "_notifications",
            filter: "recipient_id=eq." + viewerId,
          },
          listener,
        );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") listener();
      });
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
export type SocialRepository = ReturnType<typeof createSocialRepository>;
