# Production parity QA

Date: 2026-10-14. Target project: social24x7-web-app. Shared Supabase: kcuxyxqtfkxrbtmugjsn.

## Completed before release

- TypeScript + production build: passed.
- ESLint: passed.
- Vitest: 170 passed / 20 files at pre-release check.
- Local browser fixture: 9 views × 7 widths (1440, 1280, 1024, 768, 430, 390, 360), 63 screenshots; no horizontal document overflow or page exceptions.
- Browser interactions: invitation failure preserves entries; approval confirmation/cancel; role editor/cancel; fulfillment confirmation; return approval warning/cancel; store/work login/activation rendering.
- Evidence: private Documents/Social24-7-Parity-2026-10-14/browser-qa.cjs and numbered-by-view image files. Fixture network aborts all non-local hosts.
- Focused contract checks use live metadata SELECT queries, not production business mutations.
- The user's existing browser was left untouched. Separate isolated QA contexts were used for authorized logins below.

## Not claimed

No live mutation result parity is certified. No QA account was created. No invitation, approval, suspension, reassignment, product edit/publication, order transition, return/refund, KYC, payment or message was executed against production.

Public and authenticated route/deployment checks are recorded below. Fresh onboarding forms remain blocked by the lack of a controlled unapproved identity. Approved status screenshots are not fresh onboarding proof. Local fixtures are separate from production evidence.

## Safe next acceptance

Use pre-authorized owner/employee/Admin/Creator accounts and controlled QA records. Verify persisted results with the same account's authorized records. Exercise denials across stores, role revocation, refresh/logout, correction lifecycle and private URL expiry. Do not modify existing real customer orders or approvals merely to satisfy a screenshot checklist.

## Deployed smoke check

Feature release 5b45f48e48ea36436b8816069e0c7c0a8fa56cfa: Vercel deployment 6jGdkzis9q2dzK87G66gxXj6UZJQ reported success. Actual production browser loaded public home, work login and work activation. Anonymous Seller/Admin routes redirected to personal login; anonymous Business Work redirected to work login. Six route checks returned HTTP 200 with zero page exceptions. No credentials or production writes were used. Old deployed Work login was also captured in a separate anonymous browser state.

Images: production-old-work-login.png and production-new-*.png in the private evidence directory. This proves route/UI availability, not successful work authentication or persisted mutations. Follow-up visual polish narrows the work login card; final deployment confirmation is reported with the final commit in the handoff.

## Authenticated production comparison

Code deployment 68b58169a755a5583823b14d523421b2839ceb8a was confirmed successful on the existing Vercel project. The production index-Cwx545s-.js asset was byte-identical to the local build; its Supabase URL is the expected project.

Previously authorized credentials were recovered from a user-provided private QA reference. No credential values are included here. Normal password authentication and registered-phone matching were used through the real browser login form. The same user's get_my_creator_commerce_access response verified identity/approval context independently of page labels.

| Identity | Real login | Backend role resolution |
| --- | --- | --- |
| Admin QA | PASS | Admin access; Seller/Creator not applied |
| Naveen QA | PASS | Seller and Creator approved; not Admin |
| Yogesh QA | PASS | Seller and Creator approved; not Admin |

Admin and Naveen were also logged into the old deployed application. Seventeen new protected module routes and thirteen old comparison routes were captured. New route alert counts and page exceptions were zero. Naveen was denied the new Admin route. Approved onboarding entries redirected to status pages rather than reopening a wizard.

Live Team matched the old app: Naveen verified Owner with five open chats; QA Employee B suspended with zero; QA Employee A removed with zero. Reactivate confirmation was opened and cancelled, never confirmed. Team rendered without horizontal overflow at 1440, 1280, 1024, 768, 430, 390 and 360 pixels. This verifies reads and confirmation/cancel behavior, not reactivation persistence or work-session revocation.

The old Seller Business Chat screen showed an empty inbox while the Team workspace reported five open chats. These are distinct inbox scopes; screenshots do not establish equal conversation-list parity. Team monitoring is separate from ordinary owner/Creator business conversations.

Private evidence: Documents/Social24-7-Parity-2026-10-14/authenticated-results.json, live-*.png and COMPARISONS.html. Screenshots hide login fields, contact details, private evidence thumbnails/identifiers and unrelated chat content. Remaining work: active employee lifecycle, fresh unapproved onboarding, controlled mutation acceptance, cross-store denial matrix and installed APK testing.
