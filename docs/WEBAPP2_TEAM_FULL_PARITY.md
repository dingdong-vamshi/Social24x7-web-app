# Webapp 2 — Team functional parity

Scope: original `src/features/teamManagement/TeamManagementPanel.tsx`, `teamRepository.ts`, `types.ts`, `rules.ts`, `src/features/businessWorkspace/*`, `app/business-activate.tsx`, `app/business-login.tsx`, `app/business-workspace.tsx`. Original repository inspected read-only. Target uses the existing `src/features/team`, business-workspace and chat modules. Browser comparison and deployment are coordinated separately; this document does not claim unexecuted production mutations.

## Action inventory before this checkpoint

| Original action | Original source / backend | New implementation | Status / evidence |
|---|---|---|---|
| Load storefront, verification, member list | Panel `load`; `get_storefront_team_dashboard` | TeamManagement + team/repository | IMPLEMENTED BUT NOT LIVE VERIFIED — canonical RPC retained |
| Refresh / filter five membership statuses | Panel filters | TeamManagement | IMPLEMENTED BUT NOT LIVE VERIFIED — UI tests |
| View role, work identity, effective permissions | MemberModal; dashboard | Member details | PARTIAL FUNCTIONALITY — lifecycle dates, employee ID and blocked-access explanation missing before checkpoint |
| Open invitation and validate fields | InviteModal / rules | InviteEditor / rules | IMPLEMENTED BUT NOT LIVE VERIFIED — validation tests |
| Create invitation | `create_storefront_team_invitation` | repository.invite | IMPLEMENTED BUT NOT LIVE VERIFIED — isolated contract |
| Show/copy one-time code and expiry | InviteModal / invitation result | Masked code, private clipboard action | IMPLEMENTED BUT NOT LIVE VERIFIED — no live invitation created |
| Replace activation code | `resend_storefront_team_activation` | repository.resend / confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Activate / set work credential | business-activate / canonical claim flow | BusinessActivate / work Auth | IMPLEMENTED BUT NOT LIVE VERIFIED — separate identity preserved |
| Await owner approval | canonical work context | BusinessWork gate | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Approve activated employee | `approve_storefront_team_member` | confirmation + repository.approve | IMPLEMENTED BUT NOT LIVE VERIFIED — safe mock test only |
| Suspend | `transition_storefront_team_member` | confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Reactivate | same RPC | confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED — not performed on QA records |
| Remove / preserve history | same RPC | confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Edit member profile | `update_storefront_team_member` | MemberEditor | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Assign/change role | same RPC | MemberEditor role select | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Override/revoke permissions | same RPC / member overrides | permission checkboxes | IMPLEMENTED BUT NOT LIVE VERIFIED |
| List roles / usage | dashboard | role list | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Create custom role | `create_storefront_team_role` | RoleEditor | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Edit role/permissions | `update_storefront_team_role` | RoleEditor | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Archive unused custom role | repository `archive_storefront_team_role` | RoleEditor archive confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Protect root owner | canonical authorization | protected owner UI + RPC | IMPLEMENTED BUT NOT LIVE VERIFIED — isolated test |
| Open/resolved/lifetime/waiting metrics | `get_storefront_team_chat_metrics` | TeamManagement | PARTIAL FUNCTIONALITY — lifetime count missing before checkpoint |
| Audit events | dashboard.auditEvents | recent security activity | PARTIAL FUNCTIONALITY — event membership attribution missing before checkpoint |
| Assigned customer chat list/filter | `get_business_workspace_inbox` | TeamChatMonitor | IMPLEMENTED BUT NOT LIVE VERIFIED |
| View historical messages and representative identity | `get_business_workspace_messages` | TeamThread | PARTIAL FUNCTIONALITY — backend historical verified flag not rendered before checkpoint |
| Assign/reassign, including owner candidate | `reassign_business_conversation` | Assignment confirmation | IMPLEMENTED BUT NOT LIVE VERIFIED — backend retains one assignee |
| Separate Work login and context | businessAuth + canonical context | BusinessLogin / BusinessWork | IMPLEMENTED BUT NOT LIVE VERIFIED — live worker credential acceptance pending |
| Authorized customer lookup/start chat | businessWorkspace repository | BusinessWork known-phone flow | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Assigned Work reply/resolve | businessWorkspace RPCs | BusinessWork | IMPLEMENTED BUT NOT LIVE VERIFIED — controlled tests, no customer message sent |
| Company feed with permission | canonical company feed RPC | BusinessWork company feed | IMPLEMENTED BUT NOT LIVE VERIFIED |
| Deny revoked/suspended/removed/cross-store work access | trusted app metadata + canonical checks | work context refresh and server RPCs | IMPLEMENTED BUT NOT LIVE VERIFIED — isolated denial/recheck tests; no real revocation performed |

31 action rows: 4 PARTIAL FUNCTIONALITY before this checkpoint, 27 IMPLEMENTED BUT NOT LIVE VERIFIED. These statuses concern this current acceptance pass, not a claim that historical screenshots never existed. Original UI screenshots remain coordinator-owned.

## Exact Employee QA answer — current live metadata

Read-only metadata on project `kcuxyxqtfkxrbtmugjsn` (14 October 2026) found six QA Work memberships; no password hashes, codes, tokens or private conversations queried.

| Identity | Store | Employee ID | Work login | Current status | Configured scope |
|---|---|---|---|---|---|
| Production QA Employee B | Social24 Team QA | QA-B-B3C16B | `qa.employeeb.b3c16b8789` | VERIFIED | Assigned business chat reply; company feed |
| QA Employee B | Social24 Team QA | QA-B-BC3511 | `qa.employeeb.bc3511d860` | VERIFIED | Assigned business chat reply; company feed |
| QA Employee B | Social24 Test Store | Not set | `qa.employee.b.29205263` | SUSPENDED | No effective work access while suspended |
| QA Employee A | Social24 Test Store | Not set | `qa.employee.a.29205263` | REMOVED | No effective work access |
| QA Employee A | Social24 Team QA | QA-A-696B65 | `qa.employeea.696b65024f` | REMOVED | No effective work access |
| Production QA Employee A | Social24 Team QA | QA-A-9C5DB3 | `qa.employeea.9c5db32cef` | REMOVED | No effective work access |

Both verified B memberships have linked Auth identities, activation and owner approval timestamps, and belong to the active, approved Social24 Team QA storefront. These are not the suspended B identity in Naveen's Social24 Test Store. All six historical invitations were consumed; their expiry does not make an activated account expired. No records changed.

**EMPLOYEE QA ID FOUND: YES. WORK LOGIN STATUS: ACTIVE (two verified QA B identities). AUTHORIZED TESTING POSSIBLE NOW: NO — the original test passwords were removed and historical exports contain redaction placeholders, not usable credentials. TEAM WORKFLOW AVAILABLE: YES in implementation, full lifecycle live acceptance not certified.** Normal entry: `https://partner.social24-7.com/business-login` with the exact Work login, not Seller email credentials. An authorized reviewer must provide an existing controlled Work session or approved private current credential source; no new account is automatically needed. Reactivation/removal/approvals were not performed.

Employee verification is activation plus owner approval. It is not bank/payout/payment verification and these reply/feed identities do not gain financial or KYC powers.

## Checkpoint changes and verification

The four documented display gaps are implemented: employee ID plus activation/approval dates and explicit disabled-access explanation; lifetime chat metric; membership attribution on audit events; and historical verified-representative attribution from the canonical message result. Search now disambiguates same-name employees using exact Work login, employee ID, role or department, combined with the existing status filter. No arbitrary audit-detail payload is rendered. All 31 action rows are now **IMPLEMENTED BUT NOT LIVE VERIFIED** for this checkpoint until the coordinator records new deployed evidence; no lifecycle action is falsely counted as live-tested.

**81 isolated tests in 6 files passed**, including new roster search, lifecycle/access distinction, lifetime count, audit attribution and representative flag assertions; scoped ESLint passed. These are controlled component/repository tests, not production mutation evidence.

Credential investigation correction: the prior authorized QA run's temporary credential files were intentionally deleted after testing. Its private local task export preserved the record structure, **but both password fields are bracket-wrapped redaction placeholders**, not recoverable credentials. An initial recommendation to recover that snapshot failed to check redaction first; the coordinator's single normal Work login attempt therefore submitted a placeholder and received `Invalid login credentials`. That attempt does not demonstrate rejection of a valid historical password, a password change, broken Auth, or an RLS problem. No alternate/variant attempt was made. Future credential recovery must reject redaction markers before filling a form.

Read-only Auth metadata for Production QA Employee B confirms: expected synthetic Work email mapping matches; email confirmed; trusted `account_type=business_employee`, membership and storefront match; no ban, deletion or SSO-only identity; last sign-in and Auth update were 25 September. No password/token fields were queried. `signInWork` uses normal `signInWithPassword` first, followed by the verified Work context RPC; `business-work-auth` is activation-only and was not invoked. Current blocker: no usable current Work credential/session. Account status and credential availability are separate conditions. Owner/Creator/Admin production sessions are not blocked by this employee-specific acceptance gap.

## Safe boundaries

Existing RPCs and RLS remain authoritative. No new employee system, service key, identity impersonation, direct table writes, schema, permission or RLS changes. Monitoring stays business-only and read-only; no Personal Chat access. No production invitations, messages, decisions, reassignments or lifecycle transitions performed. Full lifecycle acceptance must use an authorized controlled target and may not be inferred from rendering controls.
