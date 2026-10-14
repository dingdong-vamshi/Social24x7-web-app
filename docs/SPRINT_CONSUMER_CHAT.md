# Consumer chat recovery sprint

14 October 2026. Scope: attachment upload, create group, inspect group members. No polls, group administration, new backend function, schema change or encryption protocol. This workstream performed no production message, attachment or group writes. Parent sprint QA may record separately authorized live attachment evidence after this implementation.

## Actual contracts checked

Old read-only reference: `src/features/chat/supabaseChatRepository.ts` and `ChatScreen.tsx`. Live Supabase project: `kcuxyxqtfkxrbtmugjsn`.

| Action | Existing contract | Implemented boundary |
| --- | --- | --- |
| Eligible group contacts | `list_group_eligible_contacts()` | Returns accepted connections only; no global people search or contact scraping |
| Create group | `create_group_conversation(group_name, member_ids)` → UUID | Trimmed 2–80 character name; minimum two distinct accepted contacts besides creator; backend adds creator as admin |
| Group members | `get_group_members(target_conversation)` | Existing membership predicate; names, usernames and admin/member labels; no member/role mutation controls |
| Upload binary | Private `chat-media` Storage bucket | Existing path `<conversation>/<sender>/<random UUID>.<extension>`; upload with `upsert:false`; no public URL |
| Finalize attachment | `send_chat_attachment(target_conversation,target_storage_path,target_filename,target_mime_type,target_bytes,target_width,target_height,target_duration_ms,target_source)` → canonical message | Same original RPC; optional dimensions/duration are null for file-picker uploads; `gallery` for images/video and `document_picker` for documents |
| Open attachment | Existing metadata lookup + signed Storage link | Existing 60-second download link remains; no embedded untrusted media URL is used |

Live bucket/RPC maximum is **104,857,600 bytes (100 MiB)**, not the old initial migration's 25 MiB. Allowed MIME types: JPEG/PNG/WebP images; MP4/QuickTime/WebM video; PDF/plain text/DOC/DOCX documents. Empty, oversized, unsupported-type and overlong-name files are rejected before upload. MIME checks are not a malware scan and no malware-scan capability is claimed.

Live attachment finalization checks authenticated membership, conversation/sender path, object ownership, MIME and byte-size consistency. `chat_attachments.storage_path` has a unique index. Storage writes require sender-path permission; reads require finalized authorized metadata. The SQL functions currently have anonymous EXECUTE grants, but their Auth/member predicates reject unauthenticated writes or return no authorized rows; this sprint did not alter those grants.

## Unknown outcomes and retries

**Attachments:** each selected draft retains one unique storage path. Before sending/retrying, canonical metadata is queried by conversation, sender and path, then the message is found by attachment ID. An already saved result does not upload/send again. A successful upload followed by an ambiguous finalization response retains the uploaded path. Storage conflict on that same high-entropy path can proceed to finalization, whose existing ownership/MIME/size validation and unique-path transaction constraint prevent duplicate attachment messages. A failed lookup is not treated as success. Objects are never deleted following an ambiguous finalization error.

The UI locks file replacement after an attempted send, offers “Check / retry attachment,” retains the draft while its panel is hidden, and warns on page unload while an attempted draft remains. Explicitly closing the draft does not cancel a possibly saved message; it refreshes history and says so. Draft files/paths are memory-only: leaving the route or closing the browser loses that recovery state. There is no durable browser message/file cache. An uploaded-but-unfinalized object may remain; cleanup requires a separate proven-safe backend retention process, not blind client deletion.

**Groups:** the existing create RPC has no idempotency key. A returned PostgreSQL error is a confirmed failed transaction; a transport/unknown response is not. Unknown responses lock that creation attempt and direct the user to check their conversation list. No automatic create retry or name-based inference is performed. A valid returned group UUID navigates directly to the canonical route; a subsequent history load failure does not create a second group.

## Permissions and presentation

Group creation exists only on consumer conversations, not Partner Business Chat. Existing route guards keep Work identities in their separate workspace. Attachment controls are absent for read-only owner/customer monitoring; existing `mayCompose` rules remain. Backend membership and assignment rules stay authoritative. Member inspection is read-only and does not offer promotion, removal or polls.

## Evidence boundaries

- 43 chat tests passed across four test files, including 17 new extension/UI tests; TypeScript and scoped ESLint passed.
- New tests cover accepted-contact RPCs, group validation and unknown-response locking, member roles, supported files/private paths, interrupted finalization, stable-path retry, storage conflict recovery, failed metadata lookup, read-only owner denial, and retained UI drafts.
- A **fully intercepted, fictional local browser fixture** exercised group form → canonical route → member list → attachment selection. All Supabase HTTP/WebSocket traffic was intercepted; no real group or message was sent. No page errors; no horizontal document overflow at 1440, 1280, 1024, 768, 430, 390 and 360 px.
- Fixture screenshots (outside Git): `/tmp/social-consumer-group-desktop.png`, `/tmp/social-consumer-tools-desktop.png`, `/tmp/social-consumer-tools-mobile.png`. These prove rendered layout, not real backend writes.
- Live group creation, old-client group visibility, and real multi-device attachment acceptance must not be certified solely from these mocked tests. Parent QA owns any separately authorized live proof and final parity status.
