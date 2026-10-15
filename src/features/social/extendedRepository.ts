import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, SocialProfile } from "./repository";
import { verifiedDisplayNames } from "../../auth/publicIdentity";

export type Story = {
  id: string;
  author_id: string;
  content_type: "text" | "media";
  text_content: string | null;
  background_style: string | null;
  media_type: string | null;
  media_path: string | null;
  mediaUrl: string | null;
  expires_at: string;
  created_at: string;
  author: SocialProfile | null;
  unavailable?: boolean;
};
export type Recommendation = {
  promotion_id: string;
  tracking_code: string;
  product_title: string;
  product_slug: string;
  storefront_name: string;
  storefront_slug: string;
  price_minor: number;
  cover_path: string | null;
};
export const storyBackgrounds = [
  "forest",
  "sunset",
  "ocean",
  "berry",
  "midnight",
] as const;
export function validateSocialMedia(file: File) {
  const types: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const extension = types[file.type];
  if (!extension)
    throw new Error("Choose a JPEG, PNG, WebP, GIF, MP4, WebM or MOV file.");
  if (file.size === 0 || file.size > 50 * 1024 * 1024)
    throw new Error("Media must be non-empty and no larger than 50 MB.");
  return {
    extension,
    mediaType: file.type.startsWith("video/") ? "video" : "image",
  };
}

export function extendedSocialRepository(
  client: SupabaseClient,
  viewerId: string,
  check: () => Promise<void>,
) {
  const validId = (id: string) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      throw new Error("Invalid profile link.");
  };
  async function upload(file: File, target: "post" | "story") {
    await check();
    const { extension, mediaType } = validateSocialMedia(file);
    const path = `${viewerId}/${target}/${crypto.randomUUID()}.${extension}`;
    const bucket = target === "story" ? "social-stories" : "social-posts";
    const result = await client.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
        cacheControl: target === "story" ? "3600" : "31536000",
      });
    if (result.error) throw result.error;
    return { path, mediaType, bucket };
  }
  async function avatar(path?: string | null) {
    if (!path) return null;
    if (/^https:\/\//i.test(path)) return path;
    const result = await client.storage
      .from("profile-media")
      .createSignedUrl(path, 3600);
    return result.error ? null : result.data.signedUrl;
  }
  return {
    viewerId,
    avatar,
    async deleteStory(id: string) {
      validId(id); await check();
      const result = await client.from('stories').delete().eq('id', id).eq('author_id', viewerId).select('id');
      if (result.error) throw result.error;
      if (result.data?.length !== 1) throw new Error('Story unavailable or deletion not authorized. Refresh to check its current state.');
    },
    async profileStorefront(
      id: string,
    ): Promise<{ name: string; slug: string } | null> {
      validId(id);
      const result = await client.rpc("get_public_storefront_for_profile", {
        target_user: id,
      });
      if (result.error) throw result.error;
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      return row ? { name: String(row.name), slug: String(row.slug) } : null;
    },
    productMediaUrl(path: string) {
      return client.storage.from("shop-media").getPublicUrl(path).data
        .publicUrl;
    },
    async stories(): Promise<Story[]> {
      const result = await client
        .from("stories")
        .select(
          "id,author_id,content_type,media_path,media_type,text_content,background_style,created_at,expires_at",
        )
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(100);
      if (result.error) throw result.error;
      if (!result.data?.length) return [];
      const ids = [...new Set(result.data.map((row) => String(row.author_id)))];
      const profiles = await client.rpc("get_public_social_profiles", {
        target_ids: ids,
      });
      if (profiles.error) throw profiles.error;
      const names = await verifiedDisplayNames(client, ids);
      return Promise.all(
        result.data.map(async (row) => {
          const lifetime = Math.max(
            1,
            Math.min(
              86400,
              Math.floor(
                (new Date(row.expires_at).getTime() - Date.now()) / 1000,
              ),
            ),
          );
          const media = row.media_path
            ? await client.storage
                .from("social-stories")
                .createSignedUrl(row.media_path, lifetime)
            : null;
          const author = (profiles.data as SocialProfile[]).find(
            (profile) => profile.id === row.author_id,
          );
          return {
            ...row,
            author: author
              ? {
                  ...author,
                  display_name: names[author.id] || author.display_name,
                }
              : null,
            mediaUrl: media?.data?.signedUrl || null,
            unavailable: Boolean(media?.error),
          } as Story;
        }),
      );
    },
    async publishMedia(body: string, file: File) {
      await check();
      if (body.length > 5000)
        throw new Error("Posts can contain up to 5,000 characters.");
      const media = await upload(file, "post");
      const result = await client
        .from("posts")
        .insert({
          author_id: viewerId,
          body: body.trim(),
          media_paths: [media.path],
          media_type: media.mediaType,
          thumbnail_path: null,
          topic_slugs: [],
          visibility: "public",
        })
        .select("id")
        .single();
      if (result.error) {
        // Only the object allocated by this operation is eligible for cleanup.
        try {
          await client.storage.from(media.bucket).remove([media.path]);
        } catch {
          /* Keep the original database error; no other paths are removed. */
        }
        throw result.error;
      }
      return String(result.data.id);
    },
    async createStory(text: string, background: string, file?: File) {
      await check();
      if (!file && (!text.trim() || text.length > 500))
        throw new Error("Enter a story between 1 and 500 characters.");
      if (
        !storyBackgrounds.includes(
          background as (typeof storyBackgrounds)[number],
        )
      )
        throw new Error("Choose a supported story background.");
      const media = file ? await upload(file, "story") : null;
      const result = await client
        .from("stories")
        .insert({
          author_id: viewerId,
          content_type: media ? "media" : "text",
          media_path: media?.path || null,
          media_type: media?.mediaType || null,
          thumbnail_path: null,
          text_content: media ? null : text.trim(),
          background_style: media ? null : background,
          visibility: "public",
        });
      if (result.error) {
        if (media) {
          try {
            await client.storage.from(media.bucket).remove([media.path]);
          } catch {
            /* Keep the original database error. */
          }
        }
        throw result.error;
      }
    },
    async profileStats(id: string) {
      validId(id);
      const results = await Promise.all([
        client
          .from("posts")
          .select("*", { count: "exact", head: true })
          .eq("author_id", id),
        client
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", id),
        client
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", id),
      ]);
      for (const result of results) if (result.error) throw result.error;
      return {
        posts: results[0].count || 0,
        followers: results[1].count || 0,
        following: results[2].count || 0,
      };
    },
    async connections(
      id: string,
      kind: "followers" | "following",
    ): Promise<SocialProfile[]> {
      validId(id);
      const column = kind === "followers" ? "follower_id" : "following_id";
      const result = await client
        .from("follows")
        .select(column)
        .eq(kind === "followers" ? "following_id" : "follower_id", id)
        .limit(200);
      if (result.error) throw result.error;
      const ids = (result.data || []).map((row) =>
        String((row as unknown as Record<string, string>)[column]),
      );
      if (!ids.length) return [];
      const profiles = await client.rpc("get_public_social_profiles", {
        target_ids: ids,
      });
      if (profiles.error) throw profiles.error;
      const names = await verifiedDisplayNames(client, ids);
      return ((profiles.data || []) as SocialProfile[]).map((profile) => ({
        ...profile,
        display_name: names[profile.id] || profile.display_name,
      }));
    },
    async profilePosts(profile: SocialProfile, offset = 0): Promise<Post[]> {
      validId(profile.id);
      const result = await client
        .from("posts")
        .select(
          "id,author_id,body,media_paths,media_type,thumbnail_path,created_at,post_likes(user_id),post_comments(id)",
        )
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + 19);
      if (result.error) throw result.error;
      const [following, avatarUrl] = await Promise.all([
        client
          .from("follows")
          .select("following_id")
          .eq("follower_id", viewerId)
          .eq("following_id", profile.id)
          .maybeSingle(),
        avatar(profile.avatar_path),
      ]);
      if (following.error) throw following.error;
      return (result.data || []).map((row) => ({
        ...row,
        author_username: profile.username,
        author_display_name: profile.display_name,
        author_avatar_url: avatarUrl,
        like_count: row.post_likes.length,
        comment_count: row.post_comments.length,
        liked_by_viewer: row.post_likes.some(
          (like) => like.user_id === viewerId,
        ),
        following_author: Boolean(following.data),
      }));
    },
    async recommendations(id: string): Promise<Recommendation[]> {
      validId(id);
      const result = await client.rpc("get_public_creator_recommendations", {
        target_creator: id,
      });
      if (result.error) throw result.error;
      return result.data || [];
    },
  };
}
