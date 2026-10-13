# Remaining client decisions

Updated 13 October 2026. These are business/privacy decisions that affect future architecture. They are not implementation approvals for ordinary React, Supabase, routing or testing work.

Already confirmed and not being asked again: one existing Supabase project/account system; consumer web chat; existing Partner Business Chat where authorized; the latest display name **SOCIAL 24-7**; existing email/password login now; email OTP preferred for a later phase because SMS has a cost. Existing Seller and Creator capabilities can coexist. The web has not invented a new Partner/agency role, subscription plan or payout rule.

## 1. Is “Partner” an information page or a new agency/service-provider business?

**Question:** Should the Partner entry remain an explanation/contact route for now, or should SOCIAL 24-7 onboard independent agencies/service providers with their own client access and approval process?

- **Option A:** Keep the informational entry; Sellers and Creators use their established account/application flows.
- **Option B:** Introduce a separate agency/service-provider offering after defining who qualifies, who approves it, and which client stores/accounts it may act for.
- **Recommendation:** Option A for this release. No such production role was identified in the current backend; Option B needs an explicit business model and delegated-access design.
- **What continues:** Public site, Seller/Creator onboarding, commerce workspaces and existing consumer/business conversations.

## 2. Must SOCIAL 24-7 servers be unable to read Personal Chat content?

**Question:** Does the privacy requirement mean the existing protected backend model, or true end-to-end encryption with the resulting changes to AI assistance, search, multi-device access and recovery?

- **Option A:** Retain authenticated access, TLS, RLS and private media for the current delivery; server-side AI may continue using authorized Personal Chat context under the existing permissions.
- **Option B:** Require true E2EE. Adopt a reviewed protocol and a separate migration/device-linking design; decide whether AI is unavailable for protected messages or only receives excerpts users explicitly share.
- **Recommendation:** Keep the current release accurately described under Option A while scoping Option B separately if the requirement is mandatory. Do not advertise WhatsApp-style E2EE today or add custom cryptography.
- **What continues:** Canonical message synchronization, access-control testing, secure media access and client reliability. No plaintext-to-ciphertext migration is made without the E2EE product decision.

## 3. Is subscription payment a prerequisite for business access?

**Question:** Should an approved Seller/Creator receive access under the existing approval model, or must an explicitly defined paid subscription become an additional activation requirement?

- **Option A:** Continue the existing approval/access rules; no newly invented subscription gate or payment claim.
- **Option B:** Define plans, prices/currency, tax/invoice responsibility, payment timing, renewals, cancellation and failed-payment treatment before adding a paid activation gate.
- **Recommendation:** Option A until those commercial terms and a payment provider are approved. Client-side payment simulation must never grant access.
- **What continues:** Actual application review/status visibility, approved workspaces, catalog, orders, promotions and chat. No new subscription/payment backend is necessary for these flows.

## 4. Who authorizes commission settlement, payouts and refunds?

**Question:** Should settlement continue through the existing review/operational process, or should the platform automate money movement under a newly specified settlement policy?

- **Option A:** Keep existing commission records and review decisions authoritative; web shows recorded amounts/statuses and operators use established processes.
- **Option B:** Introduce automated settlement/refunds after confirming the responsible entity, settlement schedule, return/dispute holds, adjustments, approval controls and payment-provider integration.
- **Recommendation:** Option A for this delivery. Do not infer a seven-day payout guarantee, available balance or automatic refund from order totals.
- **What continues:** Real order/return/commission visibility, exact currency formatting, canonical promotion attribution and nonfinancial workspace functionality.

## Delivery checks, not client product questions

Actual APK synchronization; production attachment isolation; suspended-employee tests; permitted QA evidence uploads/application submission; email-confirmation delivery/callback testing; and live product/promotion mutation QA are verification tasks. They should be completed with authorized QA accounts/data, not converted into requests for the client to choose technical mechanisms.

The existing Business Work account and assignment architecture remains authoritative. Completing its web UI is an implementation scope item; owner ownership alone must not be reinterpreted as reply/takeover permission. Multiple-store editing likewise remains gated until the existing save RPC can target a specific authorized store safely; no business rule was silently changed.
