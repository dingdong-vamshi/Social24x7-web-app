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
- Current user browser was signed out at the protected Admin login route.

## Not claimed

No new authenticated live result parity is certified. No QA account was created. No invitation, approval, suspension, reassignment, product edit/publication, order transition, return/refund, KYC, payment or message was executed against production.

Public route/deployment checks are recorded after push below. Authenticated old/new screenshots for the 12 requested modules remain blocked by missing authorized sessions. Local fixture screenshots are not substitutes for that evidence.

## Safe next acceptance

Use pre-authorized owner/employee/Admin/Creator accounts and controlled QA records. Verify persisted results with the same account's authorized records. Exercise denials across stores, role revocation, refresh/logout, correction lifecycle and private URL expiry. Do not modify existing real customer orders or approvals merely to satisfy a screenshot checklist.

## Deployed smoke check

Feature release 5b45f48e48ea36436b8816069e0c7c0a8fa56cfa: Vercel deployment 6jGdkzis9q2dzK87G66gxXj6UZJQ reported success. Actual production browser loaded public home, work login and work activation. Anonymous Seller/Admin routes redirected to personal login; anonymous Business Work redirected to work login. Six route checks returned HTTP 200 with zero page exceptions. No credentials or production writes were used. Old deployed Work login was also captured in a separate anonymous browser state.

Images: production-old-work-login.png and production-new-*.png in the private evidence directory. This proves route/UI availability, not successful work authentication or persisted mutations. Follow-up visual polish narrows the work login card; final deployment confirmation is reported with the final commit in the handoff.
