# Webapp 2 full-parity recovery deployment handoff

Date: 14 October 2026. Existing GitHub repository: https://github.com/dingdong-vamshi/Social24x7-web-app. Production: https://partner.social24-7.com.

## Release chain

- Starting LinkedIn release: `7dbcb1d6d1cf2526390f32a4881fec3210afc652`.
- Functional recovery: `fb8689732f1bebbed5fe20260ac990533d4b7de2`, pushed to main. Vercel `dpl_8VnR91qb74yDvrzJ8Q8jv35zmHmT`, Ready. Existing project `prj_KoHp74rBLTBRH8OWONTOpKQ8GGWQ` reused.
- That deployed `/assets/index-Dwga2vtQ.js` was byte-identical to the tested local build, SHA256 `3bf6e68bdd54cc777153ac5a562f249d0735f8c59142ca14b7e9396158dec69a`.
- Final follow-up commit contains only embedded Social single-bell/one-main accessibility polish, two regression cases and acceptance documentation. Its build produces `/assets/index-DVsqviCJ.js`. The accompanying final delivery response records the actual commit/deployment identity after push; this file does not invent its own future commit hash.

## Verification

Final source gate: **588 tests / 49 files, ESLint, TypeScript and Vite production build PASS**. Main-chunk warning (>500 kB) is nonfatal and retained as a performance follow-up.

Production reads: normal approved Arjun username, Naveen email and Admin email sign-in; Seller operations/catalog/analytics/finance, Creator discovery/attributed orders/earnings/profile/payments, owner Team, shared Social, and authorized Admin application details. See `PRODUCTION_PARITY_QA.md` and the A–L acceptance report for exact observations, limits and inline screenshots.

Screenshots are private local artifacts under `/Users/vamshipendyala/Documents/Social24-7-Full-Parity-2026-10-14`; never commit credentials, tokens, private documents or raw customer messages. Earlier isolated LinkedIn fixtures remain under `Social24-7-Webapp2-2026-10-14` and must be labeled isolated, not deployed.

## Boundaries and remaining acceptance

No old mobile repository modification, GoDaddy DNS change, new Supabase/Vercel project, live schema/RLS/function/Auth change, real application/approval, publication, customer message, payment/refund or employee lifecycle transition in this recovery task.

Current approval is **IMPLEMENTED WITH EXACT ACCEPTANCE GAPS**, not full functional parity certification. Main external dependencies: current approved Employee B Work session, legitimately existing editable onboarding/LinkedIn-bearing test records, controlled email round trip, safe mutation/mobile runtime acceptance. A separate shared product Storage source-path weakness remains; its reviewed proposal/rollback are private, not applied, and require separate explicit approval plus isolated validation. Do not confuse any of these with ordinary Partner/Admin authentication failure.

For employee QA only: https://partner.social24-7.com/business-login, existing active Work ID `qa.employeeb.b3c16b8789` (employee `QA-B-B3C16B`, Social24 Team QA). An authorized user can sign in with the current private password in the in-app browser and leave the tab open. Do not paste passwords into chat, guess alternatives, reactivate suspended identities or reset credentials merely for QA.

## Rollback discipline

If regression requires rollback, choose the existing known-good deployment in the same Vercel project through the authorized release workflow. Do not reset the shared worktree, modify the original repository, roll back unrelated concurrent commits, or change shared backend policies as a frontend rollback. Preserve the exact deployment and acceptance evidence.
