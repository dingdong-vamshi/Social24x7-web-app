# Team and verification parity

## Chirag's screenshot

It shows real team identities/statuses and a notice directing operational changes back to the old application. Chirag expects employee management and access to authorized employee/customer conversations. This was a real functional gap, not merely a missing label.

Old implementation: src/features/teamManagement/TeamManagementPanel.tsx, teamRepository.ts and app/business-workspace.tsx. It has invitations, activation credentials, owner approval, suspension/reactivation/removal, role/permission editing, audit/metrics and monitored/reassigned chats.

New implementation: src/features/team/TeamManagement.tsx, repository.ts, src/features/chat/TeamChatMonitor.tsx and src/pages/BusinessWork.tsx. The previous pass added read-only monitoring; this pass adds management and separate work access.

## Implemented, but live result not certified

Invite form; private masked activation instructions; replacement code; approve/suspend/reactivate/remove confirmation; custom role create/edit/archive; member role/permission override; metrics/activity; assignment/reassignment; separate work activation/login; assigned inbox/reply/resolve/read; known-phone lookup and company feed text.

Root Owner is protected in the UI and backend. Owner monitoring does not expose an employee reply composer. Only verified work identity + reply permission + correct assignment exposes that composer. Backend RPC authorization remains authoritative. No impersonation or personal employee chat access.

Auth trusts app_metadata, not editable user_metadata. Work context is rechecked on load, periodic refresh, return/reconnect and relevant events. Failed refresh removes protected data. Tests cover denied identities; actual old-client suspension → web-session revocation remains untested.

## Confirmed shared-backend blocker

Read-only inspection of create_storefront_team_invitation found two backslashes before the email dot in the SQL regex. A read-only expression using an ordinary test email fails that validation. The UI correctly surfaces the error; it does not supply a malformed workaround email.

Recommended repair: review all mobile/web callers, correct the shared validator in a separately reviewed compatible migration, test valid/invalid emails, uniqueness, grant limits and activation lifecycle. No function/schema/RLS was changed here.

## Verification distinctions

- Seller business verification: onboarding evidence and recorded premises video reviewed by Commerce Admin.
- Employee verification: work activation followed by authorized owner approval.
- Professional Creator: conditional credential/video review independent of Seller/employee identity.
- Remote live KYC call: not found in current audited workflow; not invented.

## Evidence

team/parity.test.tsx, test/work-auth.test.tsx, test/business-work.test.tsx; private local browser captures in Documents/Social24-7-Parity-2026-10-14. Fixture screenshots remain distinct from production proof.

Fresh deployed old/new screenshots now verify the same authorized Naveen owner context: verified Owner, suspended QA Employee B and removed QA Employee A. Owner has five open chats; both employees have zero. The new Team page exposes management controls and read-only monitoring. Reactivation confirmation was opened then cancelled; no member status changed. Seven production viewport widths passed overflow checks. Actual employee activation/login and persisted management changes remain unverified. See PRODUCTION_PARITY_QA.md.
