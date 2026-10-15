# Team & Verification — video parity matrix

Source review: 2026-10-15. This is an implementation ledger, not client acceptance.
Primary source: the recovered 268.607-second reference recording (SHA-256
`3a6588b3886e2ef0adcbd0d48571351415b68344cca181326296a89aaaddb27f`).
It records a localhost prototype, not either production deployment. Old code is
implementation evidence, not evidence of Dr. Chirag's approval.

The six later direct client answers confirm: known-phone in-app contact; one
active representative with owner monitoring/reassignment; real/verified name;
built-in plus custom roles; revoked access with preserved history; blue tick and
company tagline. They do not authorize SMS, external refunds, impersonation or
global Social access for employees.

## Executable gap ledger (baseline 14b29ce)

`O` = original Super App; `P` = Partner baseline. Timestamps are video time.
Video images and detailed before/action/after sequence are in the master walkthrough.
Where only a control is visible, this table does **not** claim its mutation ran.

| ID | Source / expected behavior | O / P baseline and root cause | Implementation task / contract | Authorization and test |
|---|---|---|---|---|
| T01 | 00:00–00:14 verified company + four activation steps | O status cards; P paragraph only | Guided owner overview using dashboard verification/counts | Existing team-manage RPC; browser/read-only |
| T02 | 00:00–00:15 count/filter Verified, Awaiting approval, Not activated, Suspended | O cards/filter; P dropdown/dense list | Clickable status cards, compact roster; retain Removed | Dashboard counts; isolated/filter + production |
| T03 | 00:16–00:23, 02:26–04:09 invitation modal with identity fields | O modal; P inline form | Accessible bounded dialog; preserve all backend fields | Owner or team manager; no genuine invite for QA |
| T04 | 02:30–02:50 live name/tagline customer preview | Neither has video-equivalent invite preview | Add explicitly illustrative preview; no actual badge before approval | UI only; verify draft is not persisted by opening |
| T05 | 03:24–03:31 department menu + narrated custom department | Both free text only | Source-derived choices plus custom department | Existing string field; isolated persistence contract |
| T06 | 03:31–03:38 Agent/Admin selection; four core permissions | O invite role only; P role only | Show role defaults and explicit invitation overrides | Existing p_permissions; no default privilege expansion |
| T07 | 03:38–03:49 toggled permissions and Admin defaults | Role editor exists but invitation selection absent | Clear core/supervision groups; server role definitions authoritative | Backend permission catalogue; isolated payload checks |
| T08 | 04:08–04:17 create login → one-time activation details | Existing RPC/UI; video says mailed, service does not send mail | Clear private delivery instructions, masked code, dismiss clears | Existing hashed expiring single-use code; isolated SQL lifecycle |
| T09 | 00:00 steps, 04:17–04:28 new Not activated member | Existing membership state | Clear disabled-access meaning + replacement-code confirmation | Isolated SQL invitation/expiry; production existing state only |
| T10 | Step 2 + later explicit requirement: employee chooses private password | Separate Work activation exists in O/P | Preserve password privacy; add visible password rule/help | Edge function unchanged; isolated tests; employee live acceptance pending |
| T11 | Step 3 / Awaiting approval / visible Approve (not executed in clip) | O immediate action; P confirmation | Review identity/access before explicit confirmation; safe cancel | Existing approve RPC; pre-activation/cross-store denial tests |
| T12 | Step 4, blue tick/from-company identity | O badge; P text label | Clear current verified badge and preview-only distinction | Server representativeVerified, never inferred from form input |
| T13 | 00:31–00:58 focused member, back, profile/actions | O member modal; P all cards expanded | Dedicated member view with back and profile/access section | Scoped dashboard member lookup, no arbitrary ID fetch |
| T14 | 00:31–00:58 open/resolved/lifetime/waiting metrics | Both render RPC counts; RPC lifetime counts only current assignments | Four metric cards; disclose current-assignment semantics pending backend repair | Read-only metric correction needs reviewed backend change |
| T15 | 00:42–00:58 member-scoped customer list/history | O member modal; P global selector only | Open member directly to their supervised chats | Recheck visible store + assignment before messages |
| T16 | 00:42–00:58 reassignment selector; later answer one active representative | Canonical reassignment exists | Explicit transfer confirmation, eligibility, retain history | Backend controls; isolated SQL participant removal/history |
| T17 | 00:57 Profile / Make Admin / Suspend shown, not executed | O/P edit role/status controls | Focused actions; role change through full review, no one-click privilege grant | Protected root owner; isolated transitions |
| T18 | 01:10–01:21 employee sees assigned chats only | Existing Work inbox/RPC | Preserve isolation; search and clearer assignment/identity | Backend permission checks; isolated stale/cross-store tests |
| T19 | 01:18–01:21 reply and Resolve visible, not sent/clicked | Existing text reply and resolve | Preserve retry/client-id and confirmation safeguards | Assigned + verified + reply permission; no customer QA messages |
| T20 | 00:45–00:55 / 01:19–01:21 product, order and image message cards | O/P Work message contract omits payload; renders text only | Requires secure typed rich-message read contract and Storage access review | Do not fall back to broad message queries or claim full media parity |
| T21 | 01:22–01:43, 02:21–02:25 company-specific feed | O/P company posts/products available | Restore Feed / Explore / Reels views of authorized company data | Existing company-feed RPC + signed media resolver |
| T22 | 01:41–01:43 Explore grid and Reels player | Neither O/P exposes separate views | Add company-only media grid and video-only player view | No global Social queries or new posting permissions |
| T23 | 01:22–01:37 feed reaction/comment/share/save icons only | No employee mutation contract; video does not execute them | Record visual-only evidence; do not invent employee posting authority | Client decision needed if company-account social mutations intended |
| T24 | 01:44–02:20 Personal vs Business login and limited Work identity | O/P separate Auth identities already correct | Preserve separate login and routing; do not copy prototype demo credentials | Existing Auth tests + deployed login UI |
| T25 | 03:38–03:49 Share products/orders permission | Permission stored; no employee share RPC/UI in O/P | Backend contract gap: typed share action must enforce assignment/store | Requires reviewed backend implementation; no fake active button |
| T26 | 03:38–03:49 Approve returns/refunds permission | Permission stored; seller return API owner-only | Backend contract gap: employee-authorized return workflow undefined | No financial decisions for QA; needs scoped backend review |
| T27 | 03:38–03:49 Manage team permission | RPC supports team manager; neither Work UI exposes entry | Add Work Team entry only when effective permission allows | Existing RPC remains security boundary; isolate manage vs monitor/assign |
| T28 | Later direct answer: built-in and custom roles | Both support roles; P inline editor crowded | Focused roles dialog, usage, protected Owner, custom archive guard | Existing create/update/archive RPCs, isolated tests |
| T29 | Later direct answer: known phone in-app customer chat | O/P Work startByPhone present | Preserve normal in-app path, label authorization and restrictions | Existing canonical RPC; never SMS/WhatsApp |
| T30 | Later direct answer: suspension/removal immediately deny, keep history | O/P canonical transitions present | Clear impact confirmations, retain Removed history | Isolated SQL revoke + reassignment; no real employee mutation |
| T31 | Latest explicit brief: preserve relevant activity/audit history; 04:21–04:28 shows new roster record, not an audit screen | O/P audit feed present | Human-readable events, bounded timeline and member filtering | No arbitrary audit payload exposure; existing RPC |
| T32 | Current brief: responsive owner flows at seven widths | Existing P dense inline pages | Bounded dialogs, compact roster, wrapping actions, single-column chat | Browser 1440/1280/1024/768/430/390/360 |

## Policy differences deliberately preserved

- Prototype login IDs contain `@`; the approved Work Auth contract uses 3–40
  letters/numbers/dot/dash/underscore. Reject unsupported input clearly; never
  silently change the intended login ID or weaken the shared Auth contract.
- Prototype's work-email helper says one demo domain; the current service accepts
  a valid authorized business email. Do not impose one demo company's domain on
  every business.
- Prototype invitation preview draws a blue tick before activation. New preview
  must explicitly say it is a preview of the approved state, not verification.
- Prototype “also emailed” is not supported by the existing delivery contract.
  Owner must privately deliver the generated instructions.
- Platform Admin is not automatically a business Owner/Admin. Team access follows
  storefront permissions; no global Admin bypass is added.

## Implementation result and exact acceptance limits

This ledger has **32 rows: 31 confirmed video/later-client/current-brief
requirements, plus one unresolved interpretation (T23)**. It is not a claim of
32 distinct spoken video instructions. At the implementation boundary:

- 10 retained contracts already implemented correctly: T09, T10, T11, T16,
  T17, T18, T19, T24, T29, T30.
- 10 corrected presentations/workflows: T01, T02, T03, T07, T12, T13, T15,
  T21, T28, T31.
- 6 newly supplied surfaces/acceptance coverage: T04, T05, T06, T22, T27, T32.
- 5 still partial/missing: T08, T14, T20, T25, T26.
- 1 unresolved client interpretation: T23.

These disjoint counts describe code coverage, **not 26 live end-to-end passes**.
Live employee acceptance is pending for activation/login, assigned Work inbox,
reply/resolve, company views, employee team management and two-session revocation.

| Requirement | Final implementation classification | Proof / residual task |
|---|---|---|
| T01–T07 | MATCH, implementation and owner UI | Four steps/status filters; native invite dialog; live illustrative preview; department/custom; explicit role defaults/overrides. Tests in parity.test.tsx; owner browser inspection. Invitation write remains isolated. |
| T08 | PARTIAL | Secure one-time code, expiry, private copy and clear are implemented/isolated-tested. Prototype “also emailed” is **not** implemented. UI explicitly says no email/SMS sent. No fake delivery claim. |
| T09–T12 | MATCH contracts; employee live acceptance pending | 47-check SQL suite includes not-activated → claim → awaiting approval → verified, rejects preactivation/foreign-store/replay. Owner sees real status; no pending record in this store was manufactured. |
| T13 | MATCH | Focused member URL, Back, Customer chats / Profile & access; scoped lookup rejects arbitrary missing member. |
| T14 | PARTIAL | Existing RPC's lifetime field counts current assignments only. UI now says **Currently assigned total**; historical distinct lifetime total needs a reviewed read-function correction, not an invented number. |
| T15–T19 | MATCH contracts; live mutation acceptance pending | Member-filtered supervision; one-assignee reassignment and history retention in SQL fixture; existing reply/resolve permission gates retained. Owner views are read-only, no impersonation. |
| T20 | PARTIAL | New safe reader can show RLS-permitted attachments, minimal order snapshots, product records and post captions. Fresh scoped inbox check, row RLS and 60-second private Storage URL; no public fallback. Supervisors who are not participants still cannot fetch payload/media. Full product-tag/card behavior and old unsupported formats remain incomplete. |
| T21–T22 | MATCH implementation; Work live acceptance pending | Company-only Feed/Explore/Reels; video-only Reels, controlled playback. Mocked UI tests verify source reuse and no global feed. |
| T23 | CLIENT DECISION | Visible like/comment/share/save icons were never exercised. Define whether employees act personally, as company, or only read, before creating social mutation authority. |
| T24 | MATCH | Separate personal and Work Auth retained; no demo shortcuts/credentials copied. |
| T25 | MISSING employee action | Permission is stored and labelled honestly, but no employee product/order share endpoint/picker exists. New typed write contract must require verified current assignee + share permission, enforce same store/customer, exclude private order fields and be idempotent. Security review/authorization before production. |
| T26 | MISSING employee action | Existing return-review endpoint is owner-only. Employee-specific authorization must be reviewed separately; a return decision is not actual money movement. No refund QA performed. |
| T27 | MATCH implementation; Work live acceptance pending | Effective Manage team exposes Team entry. Monitor and assign are independently passed, not implied. Server RPC remains the boundary. New mocked manager/ordinary-agent tests. |
| T28–T31 | MATCH retained/corrected contracts | Six built-ins/custom roles, owner protection, known-phone in-app path, explicit revocation confirmations, preserved scoped audit. Role changes and lifecycle writes tested in isolated environments, not on real staff. |
| T32 | MATCH tested layouts; pending approval state has no live record | 56 local layout cases: eight surfaces × seven widths. No document/dialog horizontal overflow. Invite/member/role/status buttons reachable; native modal Escape/focus return and explicit Tab wrap checked. No claim of live approval/reassignment mutation on all devices. |

## Security review needed before further shared-backend changes

No production migration or privilege change is included in this release.
Do not use the general implementation request to silently expand sensitive
access. The next backend work items are executable, scoped tasks:

1. **Historical metrics:** change only the counting expression in
   `get_storefront_team_chat_metrics`, retaining its exact authorization and
   signature. Count distinct conversations across current assignments plus
   retained assignment events; clearly state that pre-audit history cannot be
   reconstructed. Test reassignment, repeated events and foreign-store denial;
   capture current definition for rollback before application.
2. **Supervisor rich reads:** add a typed read API using the same
   `can_read_business_assignment` guard as text history; whitelist payload fields.
   Review chat-media Storage authorization separately. Never make the bucket
   public or allow all employees to read all conversations. Test supervisor,
   assignee, former assignee, customer, suspended and foreign-store identities.
3. **Product/order sharing:** add an idempotent typed send API enforcing current
   open assignment, verified business/member, share permission, product's store,
   and order's store **and customer**. Persist historical sender attribution.
   Do not use a direct INSERT that only checks generic reply permission. Add UI
   pickers after the contract passes isolated adversarial tests.
4. **Employee return review:** define narrow review versus refund-execution
   authority, then wrap/reuse the existing canonical state machine with store,
   member and permission gates. Exclude payouts and actual money movement from
   test execution. This is the high-risk permission expansion requiring specific
   review/authorization; a checkbox alone is not implementation.
5. **Invitation delivery:** existing secure private-copy path works. If automatic
   email delivery is mandatory, authorize the existing transactional mail service,
   recipient/expiry policy and secret-handling path; do not send test credentials
   to genuine employees. No new Supabase account is needed.

Detailed source chronology: `TEAM_VIDEO_MASTER_WALKTHROUGH.md`.
Audio uncertainty: `TEAM_VIDEO_TIMESTAMPED_TRANSCRIPT.md`.
Client steps and acceptance boundaries: `TEAM_MANAGEMENT_CLIENT_WALKTHROUGH.md`.
Release SHA/deployment and production screenshots are recorded in the task's
final release report, outside the private source-media repository.

### Production QA repair

Owner QA exposed a pre-existing refresh race: every supervision revalidation
remounted the assignment form and discarded its selected representative. The
follow-up repair preserves that choice when the same authorized conversation
returns, while removing the view on denial/store change and resetting the choice
when its actual assignee changes. Message reads still revalidate, and the final
assignment always uses the canonical server-authorized mutation. A regression
test covers preserve → confirmation → changed-assignee invalidation without
performing a production reassignment.
