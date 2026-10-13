# TikTok Shop reference audit

Inspected 13 October 2026. This is a public-reference and visual-composition audit, not a claim of access to TikTok's private Seller Center or a specification for SOCIAL 24-7 business policy.

## Evidence and access

The user's two desktop screenshots are the primary visual references: `Screenshot 2026-10-13 at 22.36.44.png` (homepage) and `Screenshot 2026-10-13 at 22.36.50.png` (registration). They were compared with the public pages below. No TikTok account was created, signed into or modified.

| Requested reference | Result | Observed scope |
|---|---|---|
| [Seller homepage](https://seller.tiktok.com/) | Accessible through web extraction and browser | Announcement strip, role navigation, visual hero, account-entry calls to action and explanatory sections |
| [US registration](https://seller-us.tiktok.com/account/register?channel=portal_header_v4) | Browser accessible; text extractor returned a JavaScript shell | Dark promotional panel beside rounded white form; phone/email entry, provider choices, legal text and setup explanation |
| [Partner homepage](https://partner.tiktokshop.com/) | Browser accessible; extractor did not expose rendered page | Distinct service-provider categories, market/business selection and partner resources |
| [Shop setup guide](https://seller.tiktok.com/shop-set-up) | Browser accessible; extractor did not expose rendered page | Anchored guidance on store operations, shipping, tax, design and integrations; an embedded video could not play |
| [Product management guide](https://seller.tiktok.com/list-manage-product) | Browser accessible; extractor did not expose rendered page | Public listing, image, stock, pricing, discovery and order guidance |

The Partner page linked to the accessible [Partner Center Console guide](https://partner.tiktokshop.com/docv2/page/about-partner-center-console), which describes tools for services supplied to Sellers/Creators and separates partner programs. It does not establish an equivalent SOCIAL 24-7 agency role.

Initial JavaScript extraction limitations were recovered through browser inspection; these pages are **not** classified as inaccessible. Private catalog, order, settlement, account-switching and verification workflows were not entered. No private dashboard behavior, TikTok mobile responsiveness, API capability or payment result was verified. The setup guide's video was not audited.

## Visual adoption

The supplied homepage screenshot establishes a hierarchy: thin announcement strip, shared role navigation, photographic hero, large centered heading and focused primary action. Registration establishes a different rhythm: promotional context left, unmistakable white signup card right, supporting explanation below. These are composition references, not a pixel-copy requirement.

SOCIAL 24-7 comparison captures: `/tmp/social24-7-web-final-proof/01-public-home.png` and `/tmp/social24-7-web-final-proof/05-registration.png`. They use SOCIAL 24-7 identity, a green palette, independent imagery and actual supported account fields. The homepage retains the hierarchy; registration retains the two-column contrast and rounded card. The real form has more fields and a taller scrollable page. This comparison does not certify every viewport or deployment; the QA matrix owns those checks.

No TikTok logo, screenshot background, incentive amount, sales claim or third-party authorization button was transplanted. The existing SOCIAL 24-7 Auth contract determines the form, not the reference's phone/email-only entry.

## Feature mapping and decisions

Classification describes delivery scope, not a promise that every backend write passed a live test.

| Reference pattern | SOCIAL 24-7 equivalent and boundary | Decision |
|---|---|---|
| Seller/Creator/Partner/Customer navigation | Public information, Seller Studio, Creator Center and consumer routes; navigation grants no capability | ADAPT EXISTING |
| Hero and registration composition | Brand-specific hierarchy, original copy, focused actions and responsive form | IMPLEMENT NOW |
| Login/provider alternatives | Existing email/password and registered-phone check; disabled SMS/OAuth never simulated | REUSE EXISTING |
| Seller setup checklist | Actual mobile Seller type, business, store/pickup, bank, verification and review fields | ADAPT EXISTING |
| Creator entry | Actual category/social/identity/payout flow and conditional professional credentials | ADAPT EXISTING |
| Verification and gated operations | Actual application status, reviewer notes and server approval; no frontend approval control | REUSE EXISTING |
| Catalog/listing workspace | Real owned-store products and save/publish/media RPCs; preserve server category/length constraints and multi-store safety | ADAPT EXISTING |
| Listing quality/discovery guidance | Existing title/description/category and saved SEO information; no ranking guarantees or fabricated AI action | ADAPT EXISTING |
| Orders, inventory and returns | Authorized records and status/detail views; unsupported transitions unavailable | ADAPT EXISTING |
| Shipping/fulfillment integrations | Read current fulfillment; no carrier booking or new policy | DEFER |
| Creator affiliate tools | Eligible discovery, canonical promotions, tracking codes and recorded commissions | REUSE EXISTING |
| Finance/settlement workspace | Recorded values with actual meaning/currency; no invented available balance or money movement | ADAPT EXISTING |
| Partner service-provider ecosystem | Informational page only; no existing agency role/lifecycle found | DEFER |
| Account/workspace switching | Shared identity with independent Seller/Creator capabilities; account-specific state clears on session change | REUSE EXISTING |
| Dashboard navigation | Workspace shell, scoped lists, loading/error/empty states and responsive navigation | ADAPT EXISTING |
| Incentives, fees and sales statistics | No client-confirmed equivalent; no copied rewards, savings or revenue claims | NOT APPLICABLE |
| US tax and carrier rules | Existing SOCIAL 24-7 contracts prevail; no imported W-9, SSN/EIN or US shipping policy | NOT APPLICABLE |
| Shopify/developer marketplace connections | No third-party credential or commerce integration in this frontend delivery | DEFER |

## Product safeguards

The [TikTok Partner reference](https://partner.tiktokshop.com/) uses “Partner” for external service organizations. This repository's established “Partner Web” is the Seller/Creator business surface. Similar wording does not establish matching roles. A real agency program needs an explicit role, authorization model, lifecycle and commercial policy.

Public guides cannot establish private API contracts. Implementation decisions came from read-only SOCIAL 24-7 mobile source and its actual shared backend, documented in [the role matrix](ACTUAL_SOCIAL24_ROLE_MATRIX.md) and [commerce integration](SHARED_SUPABASE_INTEGRATION.md). No new schema, RLS, agency privilege or settlement rule was introduced to imitate a reference.

The [QA matrix](REAL_BACKEND_QA_MATRIX.md) owns local/production results, live writes, responsive checks and release identifiers. Reference access and visual similarity do not prove signup delivery, product publishing, payments or APK synchronization.
