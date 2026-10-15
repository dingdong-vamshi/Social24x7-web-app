# Original Team video — master walkthrough

## Identity and provenance

**Video found: YES.** Exact recovered attachment:

`/Users/vamshipendyala/Documents/ChatGPT/pfd proof/investigation/attachments/team-reference-video/04fe1b05-5b75-40a6-9e08-4a1f063d9b3b.MOV`

- 449,080,339 bytes; 268.606667 seconds (04:28.607).
- One video stream, one audio stream; 1920 × 1080; approximately 59.972 fps.
- English narration, with unclear/muttered intervals marked in the transcript.
- SHA-256: `3a6588b3886e2ef0adcbd0d48571351415b68344cca181326296a89aaaddb27f`.
- Historical recovery associates this exact attachment with the 25 September
  client-reference conversation `cdb80ada-17b3-4163-90fa-a496e5f30f0c`. Two recovered
  local copies match. This is the previously identified reference, not a file
  selected merely because of its size. No independent WhatsApp-original hash or
  proof of formal client approval was available.
- The camera records a Windows **localhost:5173 prototype**, with a 24 September
  clock. It is **not the old deployed Super App**. Its behavior is the reference;
  old production code is not automatic acceptance evidence.

## Evidence method

Every one-second position 00:00–04:28 plus the final 04:28.56 was extracted
(270 frames). Ninety-six extra 0.25/0.5-second transition samples cover openings,
switches and the Create login result. All 17 contact sheets and six denser sheets
were visually reviewed; key frames were additionally inspected at full size.
Both ASR passes covered the entire audio locally. This is full-duration sampled
visual analysis plus full-duration transcription, **not a claim of human real-time
playback of every original frame or perfect audio comprehension**.

Evidence root:
`/Users/vamshipendyala/Documents/Social24-7-Team-Video-Recovery-2026-10-15`.

- `private-frames/frame-SSS.ss.png`: one-second images, private.
- `private-transitions`: dense transition images, private.
- `private-contact-sheets`, `private-dense-sheets`: complete review coverage.
- `source-proof`: six lightweight redacted representative JPEGs.
- `local-browser`, `production-proof`: browser evidence, separately labelled.
- `sanitize_evidence.py`: reproducible opaque masks only; no generated UI.

Source passwords, activation codes, tax-like IDs and personal identifiers are
not reproduced in client proof. The original 449 MB media stays out of Git.

## Chronological walkthrough

Actor is the demonstrator acting as owner unless the row says Work employee or
personal account. `F043` means private frame `frame-043.00.png`; a range means
the corresponding sampled frames. Requirement IDs resolve to the matrix.

| Timestamp / actor | Screen and action → observed result | Explanation / expected behavior / requirement | Existing match and evidence |
|---|---|---|---|
| 00:00–00:14 owner | Team overview; verified business, four steps, counts 2 verified / 1 awaiting / 2 not activated / 1 suspended | Store-scoped team and staged access; T01–02, T09–12 | Old has status cards; Partner now adds clear steps/cards. F004; source-proof/01-overview-0004.jpg |
| 00:14–00:15 owner | Scrolls roster | Compact members under status filters | Old compact rows; Partner baseline expanded all members; corrected. F014–015 |
| 00:15.50–00:23 owner | Add member opens blank modal; fields, department, role, four permission cards and customer preview visible | Invitation details before creation; T03–07 | Both lacked invite preview/permission timing. New bounded dialog/picker/overrides. F018; source-proof/02-invitation-0018.jpg |
| 00:24–00:30 owner | Closes invite, roster remains unchanged | Cancel must not create anything | Existing canonical create-only contract retained. F024–030 |
| 00:30.75–00:35 owner | Opens owner member page; metrics 0/0/58/0, Customer chats / Profile & access, empty chat state | Focused member and four metrics; T13–15 | Old modal and Partner inline baseline differed. New member URL and sections; true lifetime count still absent. F032–035 |
| 00:36–00:39 owner | Back to team; opens employee | Clear back navigation and member scope | New `?member=` scoped to current returned dashboard. F036–040 |
| 00:39–00:46 owner | Employee metrics 3 open / 0 resolved / 214 lifetime / 2 waiting; selected customer shows product card and previous text | Supervisor sees this employee's assigned history; T14–16, T20 | Canonical text supervision retained; typed rich content limited by existing RLS. F043; source-proof/03-monitoring-0043.jpg |
| 00:46–00:51 owner | Continues selected chat; no send | Read-only owner monitoring, not impersonation | Partner has no supervisor composer. F046–051 |
| 00:51.25–00:53 owner | Selects another customer: order card/image; then another text conversation | Switching customers changes history and card context | New shared-content reader rechecks scoped inbox and existing message/storage RLS. F052–053 |
| 00:53.50–00:55 owner | Image visible; returns to product customer | Attachment/product rendering | Partial: permitted existing payloads render; supervisor-only payload access still constrained. F054–055 |
| 00:56.50–00:57.25 owner | Header shows Profile, Make Admin and Suspend; not clicked | Member actions are discoverable; no proof of successful mutation | New edit/role and explicit confirmation; no one-click privilege expansion. F057; source-proof/04-member-0057.jpg |
| 00:57.50–01:02 owner | Back to overview | State/list continuity | Current member Back and status filters. F058–062 |
| 01:03–01:09 owner | Blank invitation opens again, closes without submission | Reusable modal, no unintended record | Current UI read-only opening/cancellation tested. F064–069 |
| 01:10–01:17 Work employee | Work inbox with three assigned chats and company name | Only authorized business conversations; T18, T24 | Existing Work Auth/context/inbox preserved. F071; source-proof/05-work-0071.jpg |
| 01:18–01:19 Work employee | Selects customer; Assigned to you; company attribution, Resolve and composer | Reply/resolve controls require verified assignee authority; T19 | Existing guarded reply/resolve contracts retained; no live customer message sent for QA. F078–079 |
| 01:20–01:21 Work employee | Order/image customer then text customer | Typed business content, not personal chat | T20 remains partial for unsupported payloads. F080–081 |
| 01:22–01:37 Work employee | Company feed; product-tagged shoes/bag posts and reaction/comment/share/save icons | Company-only content; T21. Icons alone do not establish mutation policy, T23 | Feed/media existed; new Feed/Explore/Reels share the same scoped source. F090 |
| 01:38–01:40 Work employee | Returns through customer chats/inbox | Company and inbox navigation | Existing two areas preserved. F098–100 |
| 01:40.75–01:41.50 Work employee | Explore grid | Company-only grid, T22 | Newly exposed Explore view. Dense transition frames |
| 01:41.75–01:42.25 Work employee | Vertical Reels player | Company video view; no global reel access | Newly exposed video-only Reels; no autoplay. Dense transitions |
| 01:42.50–01:47 Work employee | Feed, customer chat, inbox | Navigation; unclear speech adds no policy | Existing data scope unchanged. F103–107 |
| 01:48–01:54 personal / Work | Personal login then Work inbox | Narrated personal/business separation | Existing separate identity/routing, no token injection. F108–114 |
| 01:55–02:04 personal | Blank browser tab, Business login, personal Chats Business tab, profile | Personal Business tab is not unrestricted employee Work access | No expansion inferred. F115–124 |
| 02:05–02:10.50 prototype tester | Personal then Business login, test-employee quick selector | Demo sign-in shortcut only | Do not copy hardcoded demo credentials or bypass production Auth. F125–130 remain private |
| 02:10.75–02:20 Work employee | Company inbox returns | Narration confirms company name/limited chats | Existing Work account, separately authenticated. F131–140 |
| 02:21–02:25 Work employee | Company feed again | Reinforces company-only data | Existing scoped RPC retained. F141–145 |
| 02:25.50–02:29 owner | Invitation opens | Narrator introduces member creation | T03. F146–149 |
| 02:30–02:50 owner | Enters full name; preview updates immediately | Real name and live customer attribution preview, T04 | New illustrative preview; not approval. F150–170 |
| 02:51–03:10 owner | Edits email; demo-domain helper / invalid state visible | Valid input before Create login | Shared contract allows normal authorized email domains; demo-domain policy not imposed. F171–190 |
| 03:11–03:21 owner | Corrects email, fills job title | All identity fields retained | Existing backend fields reused. F191–201 |
| 03:22–03:23 owner | Employee ID entered | Optional business identifier | Retained optional; no government-ID requirement inferred. F202–203 |
| 03:24–03:31 owner | Opens department menu; default remains Customer support | Choices plus narrated custom department | New picker + custom text; no schema change. F204–211 |
| 03:31.50–03:35.50 owner | Opens role menu Agent/Admin; Agent remains | Existing role defaults | Server's six built-ins/custom roles preserved. Dense transitions |
| 03:38–03:44 owner | Toggles share permission | Invitation-time overrides; T06–07 | New p_permissions binding; isolated payload tests. F218–224 |
| 03:45.50–03:46.50 owner | Selects Admin; all four checks show selected | Prototype Admin default permissions | Current server role defaults, not arbitrary frontend grants. Dense transitions |
| 03:47.50–03:49.50 owner | Switches back to Agent; some checks remain | Prototype retains overrides | New UI explicitly reloads role defaults on role change, with warning, so privilege carryover is not silent. Dense transitions |
| 03:50–04:06 owner | Edits email/login; no invitation yet | Validation before mutation | Unsupported login chars now rejected, never silently stripped. F230–246 |
| 04:07.50–04:09.25 owner | Valid email enables Create login; clicks it | One deliberate create | Existing secure invitation RPC, isolated SQL tested. Dense transitions |
| 04:09.50–04:16 owner | Login-created result with one-time code, copy controls; says employee chooses password privately | T08–10; not activation or verification | Current masked code with expiry/private copy. Actual email delivery unavailable, honestly labelled. F251; source-proof/06-activation-0251.jpg |
| 04:16.25–04:20 owner | Dismisses result, returns to list | Secret cleared from UI | Dismiss-and-clear retained. F257–260 |
| 04:21–04:28.56 owner | Seven members, Not activated increases to three | T09: record remains inactive until employee acts | F261–268.56. No password creation, approval or audit-detail screen is shown. Audit preservation is a later explicit requirement, not a demonstrated video action. |

## Later direct clarification

The six direct client answers captured in
`CGPT-CHIRAG-2026-09-25-client-team-answers-full.png` confirm: known-phone in-app
contact; one active representative and owner reassignment; real/verified name;
built-in/custom roles; revoked access with retained chats; blue tick/company
tagline. The latest brief additionally requires private employee password
ownership and controlled testing. These override ambiguous pronouns and demo
shortcuts. No external SMS, WhatsApp, real refunds or personal-account
impersonation was added.

## Architecture comparison

Old read-only sources: `src/features/teamManagement/TeamManagementPanel.tsx`,
its `teamRepository.ts`, `app/business-workspace.tsx`, and business Workspace/Auth
modules. Old production owner view was inspected using the authorized Naveen
identity, not only source. It has a member modal, status filters and role editor,
but not the prototype's focused member route, invitation preview/overrides or
company Explore/Reels. Its invite role menu includes Owner; the new app
deliberately protects that role. Both consumed the same incomplete rich-message
and current-assignment metric contract.

New implementation uses `src/features/team/TeamManagement.tsx`,
`TeamPresentation.tsx`, `BusinessSharedContent.tsx`, the existing repository,
`src/features/chat/TeamChatMonitor.tsx`, and `src/pages/BusinessWork.tsx`.
No original repository files, production database policy, membership, role,
invitation or assignment were changed by this release.
