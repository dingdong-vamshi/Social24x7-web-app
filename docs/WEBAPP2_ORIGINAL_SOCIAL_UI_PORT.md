# Original Social UI port — 15 October 2026

## Source and scope

Original read-only source: `src/features/social/SocialScreen.tsx`, `SocialProfileScreen.tsx`, `supabaseSocialRepository.ts`, `types.ts`; `app/social-profile.tsx`; global `src/features/assistant/AssistantLauncher.tsx`. Expo web deployed at `https://vamshi-superapp-drchirag-social24x7.vercel.app/` was opened with a normal authorized Naveen login. No original files changed.

Destination: existing React/Vite Partner repo and existing Vercel project. Social uses the current authenticated personal session and canonical Supabase project. No iframe, second backend, cookie copying, token injection or authorization bypass.

The Sites skill's existing-project workflow and Expo source guidance informed the DOM adaptation; the existing Vercel deployment is retained. Supabase guidance was used for read-only contract verification. No backend migration was needed.

## Implementation

- `src/components/WorkspaceShell.tsx`: only Seller/Creator Social routes render a distinct full-width Social surface; all other Partner routes retain their shell, hover flyouts and account menu.
- `src/pages/Social.tsx`: original compact social title/search/bell/avatar, author/header/media/actions/caption hierarchy, story tray and floating composer entry; full-screen search/comments, notifications, return links. Existing publish/like/follow/comment/share repositories retained.
- `src/features/social/ExpandedSocial.tsx`: original profile header, 108px avatar, counters, name/handle/bio, action row, approved-store link, Highlights preview, original five possible profile sections, three-column media layout, recommendation/review views. Recommended appears only with data (or read failure requiring retry). Existing actual thumbnails are used where supplied.
- `src/features/social/original-social.css`: scoped port of original typography, colors, spacing, dimensions, backgrounds and responsive layout; no global Partner dashboard restyle.
- `SocialDialog.tsx`: DOM adaptation of the original full-screen/page-sheet screens with focus containment, Escape/close, inert background, focus and scroll restoration.
- `AvailableMedia.tsx`: existing missing-object fallback retained; controllable video playback and noninteractive thumbnails.
- `extendedRepository.ts`: original public storefront RPC and thumbnail field reused. No new table, persistence model or grant.
- `repository.ts`: professional badges come only from existing authorized public profile results; unavailable verification fails closed. Search renders the canonical avatar/verification fields. Original mark-all-read behavior restored with identity check and recipient/unread predicates.
- `ShareToChat.tsx`: original Send icon/modal presentation around existing explicit recipient selection and send guards.

## Verification boundaries

Original deployed feed/profile, public profile, comments, search, notifications, story composer and profile tabs inspected. Original real video data exists (Hema and Anurag); Naveen's own Reels tab is empty. No currently active story was available, so active-story viewer/expiry/navigation uses controlled component fixtures, not fabricated production story data. No Social post/comment/story/message was published for screenshots.

Matched screenshots use an explicitly configured viewport, with `innerWidth`/`innerHeight` checked before accepting a capture: 1440×1000, 1280×1000, 390×844. Browser viewport override applies to the active QA tab; measurements, not the requested tool size alone, are authoritative. Capture receipt and final production screenshots live at `/Users/vamshipendyala/Documents/Social24-7-Original-UI-2026-10-15/`.

Functional tests cover existing session/write boundaries, failed saves preserving content, URL/media validation, stories and signed expiry, follow directions, notifications recipient scoping, explicit sharing, missing media, profile/store links, keyboard containment and original seven-second story timing. Production mutations are not implied by these tests.

## Explicit differences — do not call this pixel-identical

1. Outer navigation is adapted to Seller/Creator return, Social/Reels/Profile/Chats. Original global Discover/Shop/Wallet destinations are not transplanted into the business shell.
2. Original global Assistant service/launcher is not ported. A decorative or non-working assistant button was not added. That is a visible remaining difference, not a completed feature.
3. Edit Profile opens the existing authorized Partner account editor, not a restyled copy of the whole old account area. Public Message opens existing personal chats, consistent with the original broad destination.
4. Missing legacy media remains unavailable; Partner shows an explicit message where the original leaves a gray frame. No bytes were fabricated or copied from unrelated records.
5. Native browser media/file/share controls differ from Expo wrappers. Publish/retry retains current secure upload sequencing. Profile media tiles can open post detail; original tiles are largely display-only.
6. Mobile profile tabs scroll rather than overlap. A compact return/navigation strip is retained on profile, absent in the old full-page profile.
7. Saved Highlights creation/edit/delete was not implemented in the original; active-story previews and New information control do not imply persistent saved highlights. Bookmark/save is likewise not claimed. Reposts preserve the original caption-based heuristic, not a new repost backend.
8. Exact live active-story viewer acceptance is pending real permitted active story data. Live mutation acceptance remains separate from read-only rendering/playback and isolated tests.

These differences require the final verdict **SOCIAL UI PARTIALLY MATCHED — EXACT DIFFERENCES LISTED**, even when the deployed core feed/profile is closely recognizable. Deployment success and passing tests do not turn a scoped port into a false exact-parity promise.

Team is audited separately in `WEBAPP2_TEAM_MANAGEMENT_CLIENT_GAPS.md`; no Team lifecycle or authorization changes are bundled into this Social release.
