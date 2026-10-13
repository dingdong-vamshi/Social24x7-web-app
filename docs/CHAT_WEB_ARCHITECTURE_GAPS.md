# Chat and web architecture gaps

This report separates evidence from recommendations. The legacy Social 24x7 mobile repository was inspected read-only at commit `e207f7526f140976630b92c09782a87998f6a8c6`. No chat, Supabase, or encryption implementation was added to Partner Web.

## Confirmed Requirements

- Personal messages and chats are the subject of the stakeholder privacy concern.
- App-to-web message synchronization is expected on a web surface.
- Stakeholders care about access control, encryption, and safe local persistence.
- The current Partner Web intentionally excludes Personal Chat.
- A separate consumer surface at `web.social24-7.com` is planned but not implemented in this repository.
- This evidence does **not** confirm that chat belongs in Partner Web, which chat types a consumer web client must expose, or whether “encryption” means backend security or true end-to-end encryption (E2EE).

## Current Mobile Architecture

The authenticated, non-demo mobile chat route constructs `createSupabaseChatRepository` (`app/(tabs)/chats.tsx` and `app/chat-details/[id].tsx`). That repository is the primary message data source:

- `src/features/chat/supabaseChatRepository.ts` reads `conversations`, `conversation_participants`, and up to 200 recent `messages` records.
- Sending text calls the `send_personal_message` RPC with a plaintext `message_body`.
- Supabase Postgres Changes subscriptions watch messages, conversations, membership, reactions, notifications, polls, and events. A 30-second reconciliation interval is a fallback when Realtime publication is incomplete.
- Attachments are uploaded to the private `chat-media` Supabase Storage bucket; message records carry finalized metadata.
- `src/features/chat/ChatDetailsScreen.tsx` holds loaded messages in React runtime state.

No AsyncStorage, SQLite, MMKV, Realm, or other durable message-cache use was found in the mobile chat feature or its routes. `src/lib/supabase.ts` uses AsyncStorage for the **Supabase authentication session**, not for chat history. Therefore the current chat storage model is Supabase-backed with runtime memory state, not a WhatsApp-style on-device message database.

## Current Partner Web Architecture

Partner Web is a React + TypeScript + Vite frontend using typed mock repositories and browser-local onboarding fixture state. It has no Supabase client, Personal Chat, Business Chat, customer-chat inbox, conversation repository, or Realtime subscription. Seller Studio and Creator Center are operational previews only.

## Proposed Cross-Platform Sync Architecture

Mobile and a future web client should authenticate the same Social 24x7 user against the same approved Supabase project. Both clients should use the same conversation IDs, participant records, message records, authorization rules, and Realtime publication. A message is written once; Realtime tells the other connected clients to reconcile and render it. Manual message copying is neither required nor recommended.

Client sync should be resilient rather than trusting events as the database: subscribe after authentication, load a cursor-based recent window, deduplicate by message/client ID, reconcile after reconnect, and enforce all read/write authorization in PostgreSQL/RPCs. Attachments should remain in private Storage with short-lived signed access for authorized members.

### Optional web cache

For a future consumer web client, use IndexedDB through a maintained storage abstraction. Cache only a bounded recent window, conversation metadata, sync cursors, and pending-send state. Partition and clear it by account, apply retention limits, avoid `localStorage` for message bodies, and evaluate application-level cache encryption with keys unavailable to unrelated origins. Browser cache is an optimization; Supabase remains authoritative.

### Optional mobile cache

Use an encrypted SQLite-backed repository suitable for React Native, with bounded per-conversation history, sync cursors, attachment metadata, and an outbox. Store the database key in platform Keychain/Keystore, clear data on sign-out or remote device revocation according to policy, and avoid caching full attachment binaries unless offline product requirements justify it. Library choice and threat model require an architecture review before implementation.

Both cache options improve startup, limited offline history, and egress. Neither creates E2EE by itself.

## Current Security Model

| Control | Finding | Evidence / meaning |
| --- | --- | --- |
| Transport encryption | **YES, when configured with the production Supabase HTTPS/WSS URL** | The app uses `@supabase/supabase-js`; traffic is expected over TLS. TLS protects data in transit, not from the backend. |
| Database access control | **RLS plus membership/permission RPC checks** | `is_conversation_member`, personal-message RPC membership checks, message insert policies, Business Chat permission checks, and participant-scoped attachment policies are present in migrations. |
| Local message encryption | **NO** | No durable local chat store was found. Runtime React state is not an encrypted on-device message database. AsyncStorage is used for the auth session only. |
| True end-to-end encryption | **NO** | Clients submit and query plaintext `messages.body`; attachments are uploaded as ordinary private Storage objects. |
| Can Supabase/server read message content? | **YES** | `send_personal_message` inserts plaintext `message_body`; AI functions select and full-text-search `message.body`; server functions can return authorized Personal Chat context. |

The database migrations also create a private `chat-media` bucket and participant-scoped policies. That is meaningful access control, but it is not client-side content encryption.

## E2EE Difference

**TLS + authenticated backend + RLS + encryption at rest** protects traffic against network interception, limits which authenticated users can query rows, and protects storage media. The service still receives plaintext and can process message bodies.

**True WhatsApp-style E2EE** encrypts message and attachment content on a sender device and decrypts it only on authorized recipient devices. The server transports ciphertext and cannot normally read content. This requires a reviewed protocol and product design covering identity keys, per-device keys, session establishment, multi-device key distribution, key rotation, encrypted message payloads and attachments, device verification, lost-device revocation, key backup/recovery, group key management, web-device linking, push-notification privacy, and the effects on search.

Do not add ad-hoc cryptography. Use a mature, independently reviewed protocol/library only after threat-model and product approval.

The existing AI Assistant reads authorized plaintext Personal Chat context. True E2EE would prevent the current server-side AI path from reading messages. Product owners must choose whether AI is disabled for E2EE chats, runs on-device, receives explicitly user-shared decrypted excerpts, or uses another reviewed consent/key model. That decision cannot be hidden inside implementation.

## Product Decisions Still Required

1. When stakeholders say app-to-web chat sync, do they mean the separate consumer web client, or should chat also appear in Seller/Creator Partner Web?
2. Should Partner Web support Business/Customer Chat and team-managed chats?
3. Should consumer web synchronize only Personal Chat, or both Personal and Business Chat?
4. Does the encryption requirement mean secure backend transport/access control, or true E2EE where Social 24x7 servers cannot read message content?

## Recommended V1

**Recommendation — not a confirmed requirement:** keep Personal Chat out of Partner Web. First build messaging on the separate consumer web surface using the same Supabase Auth account, conversations, messages, Realtime events, and RLS model as mobile. Start with a bounded secure local cache only after retention and sign-out policies are approved. Do not claim E2EE and do not ship custom cryptography.

If stakeholders confirm that Seller/Creator teams need customer communication, define Business Chat as a distinct Partner Web scope with assignment, team permissions, auditing, and notification requirements. Decide E2EE and AI compatibility before implementing either web chat surface.
