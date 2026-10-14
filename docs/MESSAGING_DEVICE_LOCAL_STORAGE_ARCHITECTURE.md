# Device-local messaging: audit and isolated prototype

14 October 2026. **Proposal/prototype, not production migration. No production message deletion, schema, RLS, transport or retention change.**

## Current implementation, inspected read-only

Original mobile source: `src/features/chat/supabaseChatRepository.ts`, `ChatScreen.tsx`, `src/lib/supabase.ts`; original migrations `20260812161000_scheduled_messages_vanish_mode.sql`, `20260901130738_social24_ai_assistant_core.sql`, and `supabase/functions/_shared/ai-assistant/context.ts`. New web: `src/features/chat/repository.ts`, `consumerExtensions.ts`, `teamRepository.ts`, `src/pages/ConsumerWeb.tsx`.

| Concern | Current actual behavior | Device-local migration consequence |
| --- | --- | --- |
| Text/payload | `public.messages` stores body, payload, sender, conversation, client ID, timestamps, deletion/expiry fields | Introduce encrypted delivery envelopes and durable per-device ACKs; do not remove current history yet |
| Membership | `conversations` + `conversation_participants`; separate business context, customer, storefront and assigned Work identity | Authenticate each device and revalidate account/membership/assignment; device ID alone never authorizes access |
| Media | `chat_attachments` metadata + private `chat-media` Storage; authorized signed URLs (web 60 seconds; original batch 1 hour) | Download, validate digest and commit attachment bytes before a media ACK; URL receipt is insufficient |
| Realtime | Postgres change notifications prompt authorized re-fetch/reconciliation | Notification is a hint, not a durable delivery receipt |
| Read state | Participant `last_read_at`, plus archive/clear state; mark-read RPC | Read and durable delivery must remain independent |
| Runtime history | React state in both inspected chat screens; server fetch and pagination | No durable local production message inbox or device ACK found in inspected chat path |
| Existing local storage | Mobile AsyncStorage used for Auth session, profile/social fallback, cart and Seller drafts | These stores are **not** evidence of persistent chat history; no SQLite/MMKV chat inbox found |
| Web retries | Stable client ID; canonical-row lookup before retry, conflict recovery, ID dedupe, multi-page reconnect reconciliation | Preserve guarantees across process death with durable encrypted outbox and cursors |
| Search/export/recovery | Server-backed historical fetch/search; original chat export/retrieval relies on fetched history | Device search/export and explicit encrypted backup/peer recovery needed |
| Scheduling | `scheduled_chat_messages` stores pending plaintext; scheduled worker inserts actual message | Separate pre-send retention; cancellation/retry must remain server-authoritative or explicitly move to an always-online device |
| Vanish | Existing expiry fields and cleanup worker are distinct from receipt-based deletion | Do not conflate expiry with delivered ACKs; audit existing expiry separately before migration |
| AI | SQL older-message search, recent history, rolling summaries and action/schedule records; authorized context serialized to provider | Removing server bodies breaks recall/search/summary refresh and can leave derived copies; all derived retention must be reviewed |
| Devices | No dedicated durable-message device/receipt table found in the public schema | New verified device registry, key epochs, revocation and delivery ledger required |

Live metadata confirms RLS enabled for conversations, participants, messages, attachments and schedules. RLS-enabled is not by itself an exhaustive policy audit. Production acceptance sent two labeled QA messages in a two-member QA conversation; correct sender IDs and one row each were read back. Message history remains server-held after recipient display.

## Proposed delivery contract

Sender creates local encrypted outbox entry with immutable message ID → server authenticates sender and validates membership → server durably queues immutable envelope and a snapshot of required devices → recipient authenticates, fetches and verifies envelope/media → commits encrypted inbox and pending ACK in one durable transaction → confirms local decrypt/integrity → sends authenticated, idempotent ACK → server records it → only when **all required device ACKs plus approved grace period** are satisfied may server content become deletion-eligible.

States are CREATED, LOCALLY_QUEUED, SERVER_COMMITTED, AVAILABLE, DEVICE_RECEIVED, DEVICE_COMMITTED, READ and RETENTION_ELIGIBLE. Realtime emitted, HTTP fetch completed and READ are not substitutes for DEVICE_COMMITTED. Deletion eligibility is not immediate deletion. Keep non-content tombstones/idempotency records long enough to prevent replay resurrection and expose recovery gaps.

ACK fields: protocol version, envelope ID/digest, recipient account and registered device/key epoch, committed local sequence, attachment digests and authenticated nonce/replay protection. Derive account/device from verified session, not request JSON. Server ACK should be idempotent and return a canonical receipt. Never trust a timestamp or receipt from an unrelated device. Recipient clients can lie about disk storage, so ACKs establish protocol behavior, not cryptographic proof against a malicious recipient.

## Groups and multi-device policy (NOT chosen for production)

Prototype models all devices in the explicit target snapshot, including sender's own copy. One group member or one device cannot retire everyone else's content. Offline devices remain outstanding. Revocation does not silently remove their requirement. Newly linked devices need an approved history window/peer transfer/backup policy, not an assumption that retired content still exists. Device revocation, group leave/join and long-offline expiry require explicit product rules. Expired unacknowledged messages are reported and retained by the simulator pending policy; unlimited indefinite queues are not a scalable final policy.

## Browser and mobile persistence

Use IndexedDB transactions for browser inbox/outbox/ACK/cursor indexes, not plain localStorage. Prototype uses AES-256-GCM with random 96-bit IV, account/device/record/schema-bound authenticated data, SHA-256 content checks and a caller-provided non-extractable key. Message bodies are ciphertext in IndexedDB; IDs/digests and pending flags remain metadata. Key is not hardcoded or written beside ciphertext. Logout locks and closes the adapter; reopen requires the same provisioned key. Caller memory may still hold a key or plaintext; this is not secure erasure.

**Production key management remains a gate:** authenticated per-device enrollment, passkey/platform-keystore-backed wrapping/unlock, key rotation/recovery and account-switch cleanup must be designed. A non-exportable WebCrypto key does not protect against active same-origin XSS. Encryption at rest is not E2EE; the simulator and current server see plaintext. True E2EE needs reviewed identity/device key distribution, membership changes, forward secrecy and media key envelopes.

IndexedDB completion with strict durability is the local ACK boundary, but browser eviction, user clearing data, private mode, storage pressure, disk failure and reinstall can still destroy history. Request/observe persistent storage via StorageManager and show durability/backup status; denial must be visible. Browser persistence is not a backup guarantee. For APK, use transactional SQLite plus platform-keystore encryption, durable download/outbox workers, background sync limits and matching protocol/key epochs. Mobile changes are mandatory and were **not implemented** here.

## Implemented isolated prototype

`src/experiments/deviceMessages/prototype.ts` is not imported by application routes. No Supabase dependency or production API calls. `EncryptedInbox` exercises IndexedDB object-store transactions, AES-GCM, offline history, reopen, pending-ACK persistence and logout locking. `SimulatedQueue` is an in-memory **fake server**, with explicit pre-authorized device bindings, immutable fan-out, replay rejection, expiry notices, revocation and explicit test-only retirement. `synchronize` stores and validates before ACK, then checkpoints receipt; uncertain ACKs safely retry.

14 isolated tests use the same adapter with `fake-indexeddb@6.2.5` plus real Node WebCrypto: single delivery/grace; offline/reconnect; refresh/logout; concurrent duplicates; lost ACK; ACK-response loss; groups/multidevice/sender copy; storage failure; wrong target/digest/conflicting replay; wrong unlock key; expiry; reinstall before/after retirement; device revocation; immutable idempotency. These are **not** physical-disk durability or installed-APK tests. No live retention rollout is claimed.

Not yet implemented: durable sender offline outbox, device enrollment/key recovery, attachment-byte persistence, server durable queue, production authentication, protocol signatures, search indexing, browser quota UX, actual mobile worker, backup/restore and multi-tab locking. The simulator's device binding is a test fixture, not an authentication implementation. A content-retired reinstall reports an explicit recovery gap; it cannot recreate deleted bytes. Cross-device history without approved backup/peer recovery is impossible after the last surviving copy is lost.

## AI and business compatibility decisions

| Feature | Required choice before deletion |
| --- | --- |
| Assistant recall/search/summary | On-device authorized context, or explicit selected-context transfer; revoke/expire derived summaries and provider copies consistently |
| Scheduled messages | Keep separately consented encrypted/controlled pending payload until actual send; do not delete based on unrelated conversation ACKs |
| Business support/order disputes | Define legitimate business audit/retention requirements separately from personal chats; owner monitoring and assigned Work identities must survive |
| Multi-device history | Define required-device set, sender replicas, newly linked-device window and maximum offline duration |
| Recovery | Opt-in encrypted backup or verified peer transfer, key recovery and user-visible unrecoverable-loss warning |
| E2EE | Independent reviewed protocol; cannot be claimed from HTTPS/RLS/local AES encryption |

## Coordinated rollout and rollback

1. Approve retention/privacy/business/AI/recovery policy; inventory consumers and existing vanish jobs.
2. Introduce versioned device/ACK/cursor/queue schema with RLS, indexes and rollback in an isolated backend. No production migration exists in this change.
3. Ship compatible mobile and web durable stores with telemetry that excludes content. Keep cloud history; shadow ACK only. Test process death, disk-full, reinstall, multiple tabs/devices and all media types.
4. Opt-in limited controlled cohort after backup/restore demonstration. Gate deletion by client protocol version and all-target receipt policy. Existing/legacy clients keep existing retention.
5. Dry-run eligibility reports and reconcile counts; get explicit approval before enabling any content deletion. Separate signed URLs and Storage object retention; preserve attachment references.
6. Rollback before deletion: disable delivery-retention flag and use existing server history. After deletion: restore from approved backup/peer only; **code rollback cannot recover removed bytes**. Maintain kill switch and audited recovery drill before enabling deletion.

References: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [persistent storage](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist), [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes). Browser API docs verified during this task.
