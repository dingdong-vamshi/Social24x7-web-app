# Here is how Team Management works in SOCIAL 24-7

This guide describes the implemented workflow and what still needs acceptance.
It is not a claim that every employee action was freshly exercised in production.

## Business owner

1. Open **Seller Studio → Team & verification**. The four cards show Verified,
   Awaiting approval, Not activated and Suspended. Click a card to filter; click
   it again to show everyone. Removed members remain available in Member status.
2. Choose **Invite employee**. Enter the person's real name, work email, a Work
   login ID, customer tagline and job title. Employee ID is optional. Choose a
   department or enter a custom one.
3. Choose a role and review its permissions. Changing the role reloads that
   role's defaults. Adjust individual permissions only when intended. The
   customer preview is an illustration of the approved identity—not verification.
4. **Create invitation** only for an authorized employee. The service produces
   one expiring, single-use activation code. Copy the instructions and deliver
   them privately. **No automatic email or SMS is sent.** Dismiss clears the code.
5. The employee opens **Work login → Activate work account**, uses their Work
   login/code and privately chooses their password. The owner never receives it.
6. The employee is then **Awaiting approval**. Open their member record, check
   **Profile & access**, their identity, role and permissions. Approve only after
   your real review; confirm deliberately. Activation alone does not verify them.
7. Open a member from the roster to see four chat metrics and their **Customer
   chats**. **Profile & access** shows identity/lifecycle/access information.
   “Currently assigned total” is not a historical lifetime count.
8. Use **Roles & permissions** to inspect a built-in role or **Create custom
   role**. The root Owner role is protected. Saving an existing role affects
   members using its defaults; review the displayed usage first.
9. Under customer chats, filter **Unassigned conversations** or choose a member.
   Open a conversation and choose an eligible verified representative.
   **Assign / reassign** requires confirmation. The former assignee loses the
   assignment; historical sender names and messages remain.
10. Supervision is read-only. You do not silently send as an employee. Shared
    content can open only when your account's current conversation and media
    permissions allow it; unavailable content does not use a public fallback.
11. From a member record choose **Suspend** or **Remove**, read the impact and
    confirm. Work access is revoked and assignments cleared; history remains.
    Removed membership has no normal undo action. Do not use these controls just
    to demonstrate a screenshot on genuine staff.
12. **Recent security activity** shows invitations, approvals, assignments and
    access changes. A member page filters activity to that member.

## Employee

- Sign in at `https://partner.social24-7.com/business-login` using the existing
  **Work login**, not the owner's personal email/password.
- Only verified, authorized Work access opens the workspace. Personal chats,
  Seller/Creator applications and platform Admin access remain separate.
- Assigned conversations and reply/resolve actions depend on effective access.
  Known-phone contact uses the existing in-app conversation path, not SMS.
- **Company feed → Feed / Explore / Reels** reads only the authorized company's
  content. Reels contains video posts; it does not browse global Social.
- **Team & verification** appears only with Manage team permission. Monitoring
  and assignment remain separate permissions.
- Share products/orders and employee return/refund actions remain unavailable
  even though their permissions can be recorded. This is explicitly labelled;
  do not treat those checkboxes as completed operational workflows.

## Acceptance performed and still required

Read-only owner browser checks cover existing roster/status, invitation form,
member sections, role/permission editors, history, assignment eligibility and
safe confirmation cancellation. No real employee was invited, approved,
reassigned, suspended or removed for proof. No customer reply or refund occurred.

The local PostgreSQL suite executes 47 checks across Team and existing commerce
operations, using captured functions and synthetic data. It covers hashed-code
creation, activation claim/consume, approval guards, cross-store rejection,
one-assignee transfer, old-participant removal and retained messages/audit.
It **does not reproduce complete production RLS/triggers, HTTP Auth, Storage
delivery or external financial services**. Frontend tests are separately mocked.

Eight local surfaces were checked at 1440, 1280, 1024, 768, 430, 390 and 360 px:
overview, invite, member chats, member profile, permission editor, status
confirmation, role editor, monitoring/assignment. No horizontal overflow in 56
checks. Pending-approval and an eligible second-assignee production state are
not present in the selected owner store; these are isolated tests, not live proof.

For genuine employee acceptance, an authorized tester signs in normally to an
existing verified Work QA identity and leaves that browser tab open for testing.
The personal QA passwords are not assumed to be Work passwords. No password
should be pasted into a report. A controlled, specifically authorized two-session
test is still needed for reply, reassignment and immediate visible revocation.

Evidence is stored under
`/Users/vamshipendyala/Documents/Social24-7-Team-Video-Recovery-2026-10-15`:
`source-proof` (redacted video frames), `local-browser` (development checks), and
`production-proof` (actual deployed screenshots, captured after release).
The final task report pairs original frames and deployed screens directly and
labels PASS/PARTIAL/BLOCKED. There is no fabricated pending employee or approval.

**Current acceptance boundary: exact remaining gaps documented.** See the parity
matrix for automatic email delivery, historical lifetime totals, supervisor rich
content, employee product/order sharing, employee returns, and the unresolved
company-account social-action policy. A missing employee session is not a
Supabase outage and is not the reason these separate implementation gaps exist.
