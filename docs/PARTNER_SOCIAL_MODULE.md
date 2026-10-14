# Partner Social

## Implemented

Seller sidebar order is Business Chat → Social → Team & verification. Route: /partner/seller/social. A valid approved Seller uses the same ordinary account session; QR linking is not required here. /account/social offers the same personal component outside the Seller shell.

| Capability | Existing contract | Scope / limits |
|---|---|---|
| Feed | get_social_feed(20, offset) | Live pages, refresh, previous/next |
| Post detail/media | posts, public social-posts Storage | Existing image/video display; no new media upload |
| Public author profile | get_public_social_profiles | Basic name/handle/bio/professional flag; full profile feed/follower directory not yet ported |
| Search | search_social_entities | People and posts only, not all Discover services |
| Public text publishing | posts insert with own author_id | 5,000 characters; normal RLS; no fabricated feed |
| Like/unlike | post_likes | Own user only; count refreshed |
| Comments | post_comments and profile relation | Up to 100, add up to 2,000 characters |
| Follow/unfollow | follows | Own follower identity; no self-follow |
| Bell | chat_notifications, commerce_notifications, social_notifications | Up to 40 recent per source; badge counts loaded unread records, not an invented all-time total |
| Mark read | notification source table, id AND recipient_id | Existing read_at; no cross-user updates |
| Realtime | recipient-filtered Postgres changes | Refresh on relevant events, tab foreground and online |
| Destinations | account chat UUID, Social actor profile, own orders | Validated internal routes; no arbitrary notification URLs |
| My chats/orders | existing /account routes | Existing conversation membership and ownership rules |

## Security and UX

No new Social tables or policies. Existing tables have RLS enabled. Public profile RPC is reused instead of exposing private profiles. Each mutation verifies the current Auth user matches the component's viewer and is not a Business Work identity. Account changes remount the view. Existing Work guards exclude employee identities from personal routes. This is not permission to read employees' or customers' Personal Chat.

Loading, empty, errors and retries are distinct. Failed post/comment drafts remain in the form. Buttons disable duplicate operations; visible failure messages do not silently pretend success. Notification read errors are shown. No browser push claims.

## Verified vs unverified

Local and production QA results are in PRODUCTION_QA.md. Real feed, post detail, search, profile and recent notifications are read-tested. Public mutations and notification read changes are implemented and unit-tested, but not deliberately executed against production during this pass. Delivery of a fresh live Realtime notification is not asserted solely because the subscription code exists. Production posts/likes/follows were not changed to manufacture proof.

Missing: stories, media creation/upload, post edit/delete/moderation, full profile posts/follower lists, native sharing, push/service worker integration, complete Discover services. These are tracked in CUSTOMER_WEB_APK_PARITY.md.
