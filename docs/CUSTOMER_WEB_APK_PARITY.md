# Customer Web / APK parity inventory

> 2026-10-15 update: ordinary password-authenticated Customer access now starts
> at web.social24-7.com/ and stays on that origin. This is independent of QR.
> See CUSTOMER_PAIRING_FOUNDATION.md. The older inventory below does not imply
> that ordinary Customer account login must wait for mobile linking.

Audited 14 October 2026 against the read-only mobile tree at commit e207f7526f140976630b92c09782a87998f6a8c6 and the new web source. This is a source/contract inventory, not an assertion that every native module is production-ready. **35 module areas** are recorded below. P0 = access safety; P1 = primary consumer parity; P2 = subsequent port/acceptance.

Customer Web is now intended to be a broader mobile-equivalent experience, not only Chats and Orders. The QR-authenticated /web/app shell is blocked. Implemented ordinary-account modules are accessible from an authorized Partner account under /account; that is not a verified linked Customer session.

| # | Old APK feature / evidence | New web implementation | Backend contract | Mobile dependency / browser adaptation | Status; missing work; priority |
|---|---|---|---|---|---|
| 1 | Auth/account, src/lib/AuthContext | Existing Partner password + registered phone login | Supabase Auth; account-phone contract; profiles | Secure native storage/deep links vs browser session | PARTIAL; Customer linked session missing; P0 |
| 2 | Profile QR, app/profile-qr.tsx | Honest /web unavailable page | No pairing exchange found | expo-camera/ImagePicker profile scanning, not login | BLOCKED; server exchange + APK approval/revoke; P0 |
| 3 | Personal Chat, supabaseChatRepository | /account/chats and /account/chat/:id | conversations, members, messages, send_personal_message | Native media/document selection; browser attachment UI exists | PARTIAL; device acceptance and full tool parity; P1 |
| 4 | Group Chat, chat repository | Existing group UI within account chats | Existing group/member RPCs and messages | Native contact picker must not be blindly ported | PARTIAL; full moderation/member/media acceptance; P1 |
| 5 | Customer Business Chat, business-directory | Existing authorized conversations, Seller operational module | open_business_conversation, business workspace/member policies | Directory/search and contact permissions | PARTIAL; complete customer directory flow needs port; P1 |
| 6 | Social feed, supabaseSocialRepository | /account/social; Seller Social | get_social_feed | React Native cards replaced by HTML | IMPLEMENTED reads; production interactions untested; P1 |
| 7 | Text posts and detail | Feed composer + detail/comments | posts, post_likes, post_comments | None beyond UI | IMPLEMENTED; edit/delete/moderation not ported; P1 |
| 8 | Media posts | Existing images/video displayed | social-posts Storage + media_paths | ImagePicker/expo-video → browser upload/video | PARTIAL; new media upload/thumbnail flow missing; P1 |
| 9 | Stories | No web stories UI | stories, private social-stories signed URLs | Camera/ImagePicker/video/expiry UI | NOT IMPLEMENTED; viewer/upload/expiry acceptance; P1 |
| 10 | Public Social profiles | Basic profile + follow action | get_public_social_profiles, follows | Profile image signed URLs | PARTIAL; avatar/full posts/professional cards; P1 |
| 11 | Followers/following lists | Follow/unfollow only | follows | Native lists → responsive lists | PARTIAL; directories/counts/friend distinction; P1 |
| 12 | People/post search | Social Discover | search_social_entities | Browser query/debounce/navigation | IMPLEMENTED; not all Discover services; P1 |
| 13 | In-app notifications | Bell and recent list | chat/social/commerce_notifications, read_at, Realtime | Native panel → in-page panel | IMPLEMENTED reads; live write/event acceptance outstanding; P1 |
| 14 | Device push notifications | None | Existing native notification pipeline | Browser permission/service worker/push subscription differs | NOT IMPLEMENTED; no claim of push; P2 |
| 15 | Own account/profile settings | /account existing settings | profiles, private profile-media | Native image selection; browser form subset | PARTIAL; all settings/avatar acceptance; P1 |
| 16 | Shop/store browsing, supabaseShopRepository | Seller/Creator catalogs only; no full Customer shop | storefronts, products, product_media | Private/public media policy and browser catalog | NOT IMPLEMENTED as customer shop; P1 |
| 17 | Product detail/customer selection | Seller detail editor + Creator discover, not buyer purchase | products/media/variants | Variant/media selection | NOT IMPLEMENTED buyer flow; P1 |
| 18 | Cart | No customer cart route | cart_items, upsert_creator_commerce_cart_item | Mobile AsyncStorage fallback must not become fake live cart | NOT IMPLEMENTED; authenticated attribution/persistence; P1 |
| 19 | Wishlist | None | product_wishlists | Local fallback vs actual account data | NOT IMPLEMENTED; P2 |
| 20 | Checkout/payment | No new customer checkout | Existing commerce lifecycle contracts | Payment handoff/return URLs | NOT IMPLEMENTED; transaction/security acceptance needed; P1 |
| 21 | Order history/detail | /account/orders | orders, items, fulfillment, order events | Browser read-only presentation | PARTIAL; not proof of payment/refund/cancellation; P1 |
| 22 | Customer returns/evidence | Seller return review exists, not full customer request flow | return_requests, commerce_order_evidence/private Storage | Browser file capture/upload | PARTIAL; customer initiation/evidence path; P1 |
| 23 | Wallet balances/history/rewards | No customer Wallet | get_my_reward_snapshot/history; get_my_lifetime_mined_coins | Native reward/session UI | NOT IMPLEMENTED; read then mutation acceptance; P2 |
| 24 | Wallet transfer/referrals/mining | None | transfer_reward_coins, start_reward_session, referral-network RPC | QR transfer ≠ login; financial/reward safeguards | NOT IMPLEMENTED; do not invent balances or move coins; P2 |
| 25 | Discover hub, DiscoverScreen | Social-only discovery | Links to independent modules below | Native navigation → browser hub | PARTIAL; full module hub missing; P1 |
| 26 | Notes/tasks | None | notes_tasks_entries | Reminder scheduling/browser limits | NOT IMPLEMENTED; per-user CRUD/reminders; P2 |
| 27 | Nearby People/friends | None | get_nearby_people_v2, nearby preferences, connection_requests | Native location/presence → permissioned geolocation | NOT IMPLEMENTED; privacy/precision/consent acceptance; P2 |
| 28 | Support/feedback/FAQ | Public info only, no account support module | support_tickets/responses, feature_requests/votes, faqs | No unavoidable native dependency | NOT IMPLEMENTED; full authorized support UI; P2 |
| 29 | Charity/volunteering | None | charity_organizations, donation_intents, volunteer_interests | Payment intent is not executed donation | NOT IMPLEMENTED; no donation claims; P2 |
| 30 | Missing-person reports | None | missing_person_reports, missing-person-photos | Image/location permissions and sensitive records | NOT IMPLEMENTED; privacy/moderation + uploads; P2 |
| 31 | Anonymous community | None | anonymous_channels/memberships/posts/votes/reports | Account-backed anonymity rules | NOT IMPLEMENTED; moderation/member controls; P2 |
| 32 | Games | None | get_games_dashboard, game rooms/matches, mined-coin RPCs | Native play controls/realtime; coin actions financial | NOT IMPLEMENTED; separate game/coin acceptance; P2 |
| 33 | Financial tools | None | expense_transactions; bill_split_*; chit_* tables and atomic RPCs | Browser forms feasible; financial semantics unchanged | NOT IMPLEMENTED; expenses, splits and chit subflows; P2 |
| 34 | Q&A community / AI Assistant | None | qa_* tables; ai-assistant Edge Function | AI authorized-context and privacy boundary | NOT IMPLEMENTED; Q&A/AI separate full ports; P2 |
| 35 | Food / Ladder Shuffle entries | Not copied as live features | FoodScreen shows static restaurants and Coming Soon ordering; Ladder entry marked coming soon | Native alerts are not backend contracts | NOT IMPLEMENTED; mobile itself includes preview/coming-soon capability; P2 |

## Source coverage

Inspected app/(tabs)/_layout.tsx and consumer route inventory; features/social/supabaseSocialRepository.ts, SocialScreen and SocialProfileScreen; notifications/notificationRepository; chat/supabaseChatRepository; commerce/supabaseShopRepository; profile/profileRepository; wallet/rewardRepository and WalletScreen; discover repositories (notesTasks, nearbyPeople, supportFeedback, communityServices, anonymousChat), FoodScreen and Discover; financial/repository; games/gamesRepository; assistant/assistantRepository; app/business-directory and profile-qr.

“35” counts module areas, not 35 fully tested native screens. Financial and community families contain additional subflows; inventory source references identify them rather than asserting those screens were exhaustively executed. Native APIs are not inherently impossible on web: camera, location, file selection, media playback, sharing, notifications, contacts and background execution need reviewed browser equivalents and permission/error handling.

## Closure order

1. Review and implement supported pairing session exchange, then authorize the minimum APK update; physical scan/approval/replay/revoke tests.
2. Complete controlled Seller/Creator email callback acceptance independently.
3. Complete customer shell and reuse account Chats/Social/Orders only after validated linked session.
4. Port Shop, buyer product/variant flow, cart, checkout/returns, stories and full profiles; test real authorization and writes with QA records.
5. Port Discover services and Wallet/financial/games in separate bounded increments with their existing contracts and sensitive-action confirmations.
6. Test native/web parity, reconnect/offline, multi-account isolation and accessibility. No full-app parity claim until this inventory is closed.
