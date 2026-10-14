# Social action-level recovery — 14 October 2026

Original source is read-only. Original routes: `app/(tabs)/social.tsx` and `app/social-profile.tsx`; original components below are under `src/features/social/`. Production browser evidence is collected separately by the coordinator. This inventory was created before implementation; no live mutations are used for QA.

| Original action | Original source / contract | Initial new web status | Recovery target |
| --- | --- | --- | --- |
| Feed, refresh, paging | SocialScreen; get_social_feed(page_size,page_offset) | PARTIAL FUNCTIONALITY (text-only composer) | Preserve canonical feed and improve composition |
| Public text/image/video post | SocialScreen publish; app/(tabs)/social.tsx upload; posts + social-posts owner/post path | PARTIAL FUNCTIONALITY | Browser media upload, type/size checks, error preservation |
| Like/unlike, comments | supabaseSocialRepository setPostLike/getComments/createComment; post_likes/post_comments | IMPLEMENTED BUT NOT LIVE VERIFIED | Preserve and regression test |
| Author profile/follow/unfollow | SocialScreen toggleFollow; follows + get_public_social_profiles | PARTIAL FUNCTIONALITY | Feed follow button and rich profile |
| Share post | SocialScreen onShareToChat; native share / /chats sharedId | MISSING | Browser share/copy canonical post URL; personal chats stay separate |
| Story tray, author, viewer navigation | SocialScreen StoryTray/StoryViewer; stories + private social-stories signed URLs | MISSING | Image/video/text viewer with expiry handling |
| Add image/video/text Story | createStory/createTextStory; stories insert + owner/story Storage path | MISSING | Browser media/text composer with five original backgrounds |
| Story expiry | stories.expires_at query + signed URL lifetime <= expiry | MISSING | Preserve private signed expiry, unavailable object isolation |
| Profile avatar/name/username/bio | SocialProfileScreen; get_public_social_profiles + profile-media signed URL | PARTIAL FUNCTIONALITY | Real avatar and full profile surface |
| Followers/following counts and lists | SocialProfileScreen openConnections; follows + public profile RPC, limit 200 | MISSING | Counts and authorized profile links |
| Profile Posts and Reels | SocialProfileScreen filters feed posts; video media_type | MISSING | Profile post grid/list and video view using existing posts |
| Recommended products | get_public_creator_recommendations(target_creator) | MISSING | Real approved recommendations and tracked store links |
| Reviews | SocialProfileScreen comments on first six posts, first eight comments | MISSING | Preserve definition; label community feedback, not product ratings |
| Reposts display | SocialProfileScreen caption contains “repost” | MISSING | Preserve legacy caption filter; no invented repost persistence |
| Highlights create/open/edit/delete | SocialProfileScreen HighlightBubble is a View, no onPress, no repository method | ORIGINAL APP PLACEHOLDER ONLY | Explain unavailable saved-highlight functionality; no fake actions/table |
| Post edit/delete, bookmark, dedicated repost mutation | No supported action or repository contract in inspected SocialScreen/repository | ORIGINAL APP PLACEHOLDER ONLY | Do not invent unsupported writes |
| Profile edit/share | profile settings + native Share | PARTIAL FUNCTIONALITY | Existing account editor, browser share/copy |
| Search users/posts | search_social_entities | IMPLEMENTED BUT NOT LIVE VERIFIED | Preserve validated RPC and errors |
| Notification list/unread/open/read | chat/commerce/social_notifications scoped recipient | IMPLEMENTED BUT NOT LIVE VERIFIED | Preserve actual counts and identity boundary |
| Personal chat navigation | /chats; original shared-post handoff | PARTIAL FUNCTIONALITY | Preserve personal chat link, never merge Business Chat |

## Security and verification

No service role, schema, policy or backend configuration changes. Existing RLS remains authoritative. Every new write rechecks the current authenticated personal identity. Employee work identities remain excluded. Browser session and production evidence are owned by the coordinator. Mutation coverage is isolated; live writes require controlled data and are not implied by UI presence.

Supabase skill was read; current changelog and select/upload documentation checked. The October TLS deprecation affects obsolete clients from November, not the modern browser contract used here. Expo SDK 57 reference was read per original AGENTS.md; target is React/Vite, so no Expo code or dependencies are changed.

## Implemented recovery checkpoint

Status of the following action groups is **IMPLEMENTED BUT NOT LIVE VERIFIED** until the coordinator appends deployed evidence:

- Feed paging/refresh preserved; author avatars, verified Doctor display names, author follow/unfollow, native share/copy canonical post URL, media rendering, likes/comments/detail preserved.
- Post composer accepts text or browser-selected image/video, selected-media preview, MIME/size errors, public disclosure, in-flight guard, unsaved input preserved on failure. Unique uploader-owned path; no overwrite. Media mutation is isolated-test verified only.
- Stories: existing `stories` data; public text story with five original backgrounds, image/video create, tray, author navigation, previous/next, keyboard navigation, native video controls, expires-at guard. Private signed URLs never outlive remaining story lifetime. Missing objects have an explicit unavailable state. The original seen-state persistence is not invented.
- Profile: shared account identity, real signed avatar/bio/name/username, backend counts, followers/following lists and navigation (up to 200), follow/unfollow, existing account editor, share, author-scoped post pagination. Posts/Reels/Reviews/Reposts/Recommended use original contracts. Reviews retains the original first-six-post/eight-comment definition on the current page. Reposts retains original caption matching; no fabricated repost ledger.
- Reels navigation shows real video posts within the current feed page; playback and post interactions work through the shared post component. It is not a separate video ranking backend.
- Header notification component exported for Seller/Creator, real recent-activity unread count, subscriptions, mark-read, exact existing notification destinations. No invented unread badge.
- Creator and Seller workspace support use the same viewer identity; Orders removed from primary Social navigation. Personal chats stay at `/account/chats`; no business identity merging.

### Explicit remaining boundaries

- **ORIGINAL APP PLACEHOLDER ONLY**: saved Highlight creation/modification/deletion and opening persisted highlight collections; original bubbles have no onPress or persistence contract. New Highlights explains this and preserves active stories separately.
- **ORIGINAL APP PLACEHOLDER ONLY**: dedicated repost/bookmark actions and post edit/delete UI were not present in inspected original Social surfaces. Existing backend author policies are not sufficient evidence of an original user-facing action.
- **IMPLEMENTED BUT NOT LIVE VERIFIED**: share-to-chat now selects one authorized personal/group conversation and requires a separate explicit Send action. It uses the original `send_personal_message` RPC with `message_kind=product` and `payload.post={id,author,caption}`. Identity/membership and current public post visibility are rechecked; retry keeps a stable client ID and first reconciles existing delivery. A safe shared-message renderer is exported for the existing chat screen. No business or work identity routing is introduced. Browser native Share/copy remains available separately.
- Recommended product links retain the original deployed storefront product URL and tracking code; consumer checkout is intentionally not ported into primary Partner Social scope.
- Browser media cap is 50 MiB (more conservative than the existing 100 MiB buckets). Native picker’s requested 60-second video length is not represented as a database policy; no browser transcoding or thumbnail extraction is added.
- No live post/story/comment/like/follow mutation was performed for evidence. No real records or public media were created or deleted.

### Verification receipt

- TypeScript: `npx tsc -b` passed after integration at this checkpoint.
- Scoped ESLint: `src/pages/Social.tsx src/features/social src/test/social*.ts*` passed.
- Isolated tests: **43 passed / 4 files** (`social.test.tsx`, `social-security.test.ts`, `social-expanded.test.tsx`, `social-share.test.tsx`); 31 new cases cover all seven MIME types, empty/oversized/unsupported files, exact uploader path and bucket, changed identity denial, single-object cleanup after failed insert, story text/background payload, expiry-bounded private URLs, unavailable media, follow list direction, invalid IDs, story viewer, retry preserving text, profile/counts/placeholders, recommendation error vs empty state, structured shared-post payload, explicit recipient/send, stable retry ID, business/work/nonmember denial, private/deleted-post denial and safe message destinations.
- Live read-only connector metadata: `social-posts` public and `social-stories` private, both 104857600-byte limit and MIME whitelist matching UI. Canonical `post_likes_post_id_fkey` and `post_comments_post_id_fkey` both reference `posts(id)`; profile nested joins use these relationships.
- Live read-only RLS metadata: enabled on `posts`, `stories`, `follows`, `post_likes`, `post_comments`; author/follower write predicates and restrictive business-work isolation SELECT retained. No policies or grants changed.
- Notification destination verified against original `app/(tabs)/social.tsx`: social activity routes via `actor_id` to that profile, while chat activity uses `conversation_id`. Current code preserves this mapping.
- Cross-module regression snapshot before the share addition: **536 tests / 47 files passed**. Final suite/build and deployed UI remain the coordinator's release gate.

### Shared Storage residual (read-only reinspection)

All 34 Storage policies remain present. The already-approved generic three-policy repair is intact: branding owner INSERT; generic UPDATE/DELETE false. Separate product policy `creator_commerce_shop_media_seller_update` still checks only bucket+object-owner for source `USING`, while destination `WITH CHECK` enforces owned allowed-status product paths. This permits moving an owned branding or review-pending source to an allowed product path, as the historical two synthetic tests document. Proposed minimal repair is to mirror current destination predicate into `USING`, preserving `WITH CHECK`; rollback restores exact old source predicate. Requires policy drift guard, lock timeout, isolated source/destination state coverage and explicit production approval. No live repair or mutation attempted by this recovery checkpoint.
