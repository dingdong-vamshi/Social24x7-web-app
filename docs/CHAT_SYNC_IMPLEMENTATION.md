# Consumer web chat and order history

Updated 13 October 2026. Real two-way text synchronization was verified between the new web client and the **existing mobile application's web deployment** at `2026-10-13T17:52Z`. This is not an APK/device test; actual APK compatibility remains to be tested.

## Backend identity and evidence

The connected project was rechecked read-only with the Supabase integration: `kcuxyxqtfkxrbtmugjsn`, `ACTIVE_HEALTHY`, region `ap-south-1`. The new browser client uses the shared client in `src/lib/supabase.ts`; only public configuration is accepted there.

Authoritative mobile references (read-only):

- `src/features/chat/supabaseChatRepository.ts`: canonical conversations/messages, participant state, text RPC, signed chat media, group support and Realtime subscriptions.
- `src/features/chat/chatContractParsers.ts`: attachment IDs, structured messages and order-event payloads.
- `src/features/businessWorkspace/businessWorkspaceRepository.ts`: the distinct work-identity inbox, assignment-aware message RPCs and employee attribution.

Production metadata inspection confirmed:

- `conversations`, `conversation_participants`, `messages`, `chat_attachments` exist.
- Conversation/message reads use `is_conversation_member`; attachment metadata also requires membership.
- `messages`, `conversations`, `conversation_participants` belong to `supabase_realtime`.
- `chat-media` is private; its read policy calls `private.can_read_chat_media_path(name)`.
- `send_personal_message` calls `private.chat_send_permitted`, and text delivery calls `private.deliver_chat_text_message` with a 1–2,000 character limit.
- `messages.client_id` has a unique index. The RPC does not itself turn a duplicate into success; the web repository reconciles the existing row after a duplicate-key result.
- `mark_personal_conversation_read` checks the authenticated account and conversation membership.
- Orders have customer/store-manager RLS. The consumer client additionally filters `customer_id` to the authenticated account.

No schema, RLS, function, publication, Storage bucket or mobile message format was changed by this implementation.

## Implemented routes and contracts

`src/pages/ConsumerWeb.tsx` exports:

| Component | Route | Behavior |
| --- | --- | --- |
| `ConsumerWeb` | `/web`, `/web/chats`, `/web/chat/:id` | Existing authorized personal/group conversations, customer business conversations and creator–seller conversations; list search, kind filter, history, text send and signed attachment access. |
| `ConsumerOrders` | `/web/orders` | Real customer order history, item snapshots, payment status and fulfillment/tracking details. Read only, with refresh and pagination. |
| `BusinessChat` | Business workspace route | Business conversations only. Selection is stored in `?conversation=<id>`. Personal and group conversations are excluded in both list and detail queries. |

The components use `useAuth` and the shared authenticated Supabase client. Route guards remain responsible for workspace admission; data access is still checked by the backend, not inferred from a URL or localStorage flag. Unsupported structured message interactions are explicitly directed to the existing mobile application; their body remains visible when provided by the backend.

## Synchronization

1. A web user sends text through the existing `send_personal_message` RPC with a new client UUID.
2. The existing backend authorizes it and stores the canonical message once. Mobile uses the same records/RPC model.
3. Realtime changes invalidate the web query. The client loads the authorized canonical rows again rather than treating an event payload as an authorization grant.
4. Initial connection, reconnection, tab visibility, browser online events and a 30-second foreground reconciliation also refresh history.
5. A reconnect gap larger than one page is read back page by page until it meets the last known message. Previously loaded IDs are rechecked to remove deleted, cleared, expired or no-longer-visible rows. A local expiry timer also hides vanished messages at their expiry time without requiring network access; tab visibility rechecks expiry immediately.
6. Leaving the workspace removes the Realtime channel, event listeners and reconciliation timer. Switching conversations remounts message state; switching accounts clears the old session's UI.

History uses pages of 50 ordered by `created_at` and then `id`, with a matching two-field cursor. Canonical IDs deduplicate refreshed rows. Failed sends retain their original client UUID; retry first checks whether that message already exists and handles an RPC unique-key conflict by reading the canonical row. Pending drafts exist only in component memory.

Read status updates use the existing membership-checked RPC, only while the document is visible. A read-status failure is shown separately from successful message loading.

## Business Chat boundaries

The production `private.chat_send_permitted` function is more restrictive than “Seller owns storefront.” For `business_context = buyer_seller`, sending is allowed for the customer, or the **assigned, verified business-work member** with `business_chat_reply`. Storefront ownership alone does not grant reply permission.

Consequently, the current personal-session web Business Chat view supports membership-authorized monitoring but keeps buyer–seller owner replies read-only. It instructs users to use the assigned Business Work account. It does not fabricate owner takeover, impersonate an employee, create an assignment or treat personal Auth as work Auth. Creator–seller conversations use the existing `creator_seller` context and existing send rules.

The separately deployed work APIs were inspected: `get_business_workspace_inbox`, `get_business_workspace_messages`, `send_business_employee_message`, `mark_business_conversation_read`, assignment/reassignment and resolution RPCs. A complete employee/supervisor web workspace remains a separate integration using those contracts. Suspended-employee isolation must be verified with authorized work accounts before that integration is presented as supported.

## Media and privacy

- Existing attachment metadata is fetched by both attachment ID and conversation ID under RLS.
- A user explicitly requests a link; the private `chat-media` object is signed for 60 seconds. The link expires from the UI after 55 seconds and can be requested again.
- Private storage paths and payload URLs are never turned into public links. Browser rendering never trusts a message payload's URL.
- An unavailable or unauthorized attachment produces a visible error; message text still works.
- Attachment uploads, voice recording, rich poll/event actions and group administration are not implemented in this web delivery.
- Message bodies and history are memory-only. This implementation writes no chat bodies, attachment URLs or drafts to localStorage or IndexedDB. The existing Supabase Auth session persistence is separate from message caching.
- Transport uses the configured HTTPS/WSS service and existing authorization/RLS. Message bodies remain readable to the authorized server. **True E2EE is not implemented.**
- Adding E2EE would require a vetted multi-device protocol, identity/device keys, linking, encrypted attachments and recovery decisions. Existing server-side AI Assistant access to authorized personal messages would be affected; this delivery does not change it.

## QA evidence and limitations

Twenty automated repository/component tests cover deterministic ordering/deduplication, cleared/deleted/expired rows, same-timestamp pagination, reconnect gaps beyond one page, role-sensitive composer rules, customer labels in owner inboxes, delivery recovery without duplicate writes, server message length limits, unauthorized media refusal, 60-second signing, consumer-only order filtering, keyboard send, retained retry drafts, denied/revoked routes without leaked history, expiry without network access, rejection of payload media URLs, inbox search and subscription cleanup. These are client tests using fake responses, **not cross-account production RLS proof**.

Production metadata was audited read-only. The coordinating QA agent then recovered existing authorized QA credentials and completed the following actual UI tests at `2026-10-13T17:52Z`:

| Case | Result | Observed evidence |
| --- | --- | --- |
| New web → existing mobile-code web client | PASS | Fictional QA text entered and sent in the new web UI appeared in the other authorized account's conversation in the existing application web deployment without a reload. |
| Existing mobile-code web client → new web | PASS | A second fictional QA text entered and sent in the existing application UI appeared in the new web conversation through live synchronization. |
| Canonical storage / duplicate avoidance | PASS for these two sends | Authorized-session verification found two stored messages with distinct canonical message IDs and client IDs. No second message database was involved. |
| History after reload | PASS | The same QA messages remained available after reloading. |
| Actual Android APK/device | NOT TESTED | The second client was `https://vamshi-superapp-drchirag-social24x7.vercel.app`, built from the existing mobile application. No Android runtime/device was used. |
| Private attachment cross-account denial | NOT YET VERIFIED live | Metadata/RLS/code inspected and refusal paths unit-tested; a live authorized/unauthorized private media pair still needs testing. |
| Unauthorized conversation / suspended work identity | NOT YET VERIFIED live | Server policy and permission logic inspected; client denial/revocation tests pass with controlled responses. This is not production cross-account isolation evidence. |
| Offline gap / forced socket drop / deleted or expired production message | NOT YET VERIFIED live | Reconciliation, expiry and deletion behavior is unit/component-tested; no production history or memberships were altered to manufacture these cases. |

These were two specifically identified QA message sends through ordinary authenticated UI, not arbitrary writes through privileged database tools. No credentials, personal contact details, tokens, signed URLs or message bodies are included in this document. The test does not establish group-chat sends, business-work assignment flows, attachment delivery or APK push/background behavior.

The current user direction is existing email/password authentication now and email OTP later. No phone OTP, email OTP or alternate authentication system was added to chat.

Remaining/repeatable QA sequence with approved accounts:

1. Sign in with existing QA identities on an actual APK/device; compare conversation IDs/history against the web and existing application web client.
2. Send clearly fictional QA text from web; observe its same canonical ID on the actual APK/device.
3. Send reverse-direction text from the APK/device; verify web Realtime rendering without a manual refresh.
4. Refresh, disconnect/reconnect, generate an offline gap of more than 50 QA messages only if specifically appropriate for that test, and verify ordering/deduplication.
5. Attempt a known unauthorized conversation URL and attachment under another authorized QA account; confirm denied/empty responses and no leaked content.
6. Confirm owner buyer–seller monitoring remains read-only and employees require the established work-identity/assignment flow.
7. Capture screenshots with fictional QA data only. Never include private messages, tokens, OTPs or signed private URLs in committed documentation.

Official implementation references: [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [signed URLs](https://supabase.com/docs/reference/javascript/storage-from-createsignedurl), [channel cleanup](https://supabase.com/docs/reference/javascript/removechannel). The current changelog was checked; the announced November 2026 removal of legacy TLS ciphers does not change the modern browser client contract.
