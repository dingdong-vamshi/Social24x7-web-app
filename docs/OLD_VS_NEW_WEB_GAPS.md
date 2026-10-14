# Old app versus new web: action-level findings

Date: 2026-10-14. Baseline web aa6ef66; old e207f75. See COMPLETE_FEATURE_PARITY_MATRIX.md for 164 action rows. This audit is not full production acceptance.

## What changed

- Old team panel → existing team dashboard/lifecycle/role/assignment RPCs → new TeamManagement and assignment controls → isolated contract/component/browser tests → live mutation result unverified.
- Old work login/activation/workspace → business-work-auth + trusted Auth app_metadata + get_my_business_work_context → separate web work routes → verified/pending/suspended/removed and forged-metadata regression tests → actual employee login blocked by unavailable authorized employee session.
- Old fulfillment and returns → existing atomic lifecycle RPCs → confirmed web transitions and private evidence links → isolated tests → no real orders/commissions/refund requests changed.
- Old store/shared profile editing → RLS-controlled records with explicit owner/user filters → whitelisted editors → scoped-write regression → live save unverified.
- Old product media controls → replace_creator_commerce_product_media → ordered cover/removal editor → legacy/stale rejection and payload tests → live Storage/catalog mutation unverified.
- Old creator growth/directory → existing leaderboard/search/open RPCs → web growth and approved counterparties → contract tests → live creation unverified.
- Old Admin product controls → assertAdmin + review_creator_commerce_product → suspend/reinstate confirmation → no live moderation executed.

## Important semantic corrections

The current submit_creator_commerce_product delegates to publication. It does not create a pending product-approval queue. Admin moderation supports suspension/reinstatement. We did not introduce a false “submit for approval” action.

Recorded business verification video, employee approval, Creator professional review, and Seller approval are different workflows. No live remote-KYC calling feature was found.

## Remaining work

Fresh read-only production comparisons now exist for the requested modules, using authorized Admin/Naveen identities on both deployments. Team member statuses, company verification, chat counts and Admin detection have direct result evidence. Approved onboarding status is shown instead of fresh forms. No mutation parity is inferred from those screenshots. The old ordinary Business Chat inbox and Team inbox have different scopes; further same-conversation acceptance is needed.

See REMAINING_FEATURE_BLOCKERS.md. Missing frontend work is explicitly identified separately from lack of safe production acceptance. Listing real records does not establish mutation parity.
