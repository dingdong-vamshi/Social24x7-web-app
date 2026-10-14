# Remaining gaps and acceptance blockers

This is not a full-parity release certificate. “Not ported” means unfinished implementation, not an external blocker.

| Feature | Remaining issue | Type / next action | Severity |
| --- | --- | --- | --- |
| Employee invitation | Existing SQL email validator rejects ordinary email | Shared-backend defect; compatible reviewed function repair and activation lifecycle QA | P0 |
| Actual employee login/approval/revocation | No authorized active work QA session available; no real roles changed | Access/acceptance; sign in controlled work identity and test role matrix | P0 |
| Independent professional corrections after Creator approval | Both audited wizards lock approved Creator application | Inherited workflow gap; design standalone correction route using existing professional request rules, never unlock approved application wholesale | P0 |
| Live Admin review/evidence decisions | Existing controls have isolated tests, not fresh authenticated result proof | Authorized Admin/controlled applicant QA; no real approvals for screenshots | P0 |
| Live Seller/Creator mutation acceptance | New operations tested with isolated responses only | Controlled QA store/product/order/return; confirm ledger/inventory side effects before authorized test | P0 |
| Admin return/refund review | Separate Admin queue/review not ported | Frontend gap; reuse existing lifecycle Admin return contract, no automatic transfer | P1 |
| Seller packing/return evidence upload | Viewing exists; browser upload/capture/finalization absent | Frontend gap; reuse existing evidence intents and distinguish trusted capture from uploaded evidence | P1 |
| Storefront logo/cover upload | Only text/contact/SEO settings ported | Frontend gap; authorized storage asset editor | P1 |
| Product-specific SEO metadata | Store-level SEO exists; product fields incomplete | Frontend gap; inspect secure save contract and port old fields | P1 |
| Storefront traffic analytics | Current web summaries use orders/commissions only | Frontend gap; port storefront_events visitors/views/conversion with real denominators | P1 |
| Order date/value filtering | Search/status available, date/value range incomplete | Frontend gap | P1 |
| Avatar/privacy editor | Name/username/bio supported; avatar/privacy controls absent | Frontend gap; preserve shared profile privacy contract | P1 |
| Full Creator product details | Cards and canonical old product link; not equivalent in-web detail view | Frontend gap; port detail/media without changing ownership | P1 |
| Chat attachment upload | Signed viewing exists; upload composer absent | Frontend gap; canonical chat-media/send_chat_attachment flow | P1 |
| Group creation/member details | Existing group history/text only | Frontend gap; list_group_eligible_contacts/create_group_conversation/get_group_members; investigate administration separately | P1 |
| Rich chat payloads | Poll/event/reaction interaction incomplete | Frontend gap; exact action/type inventory still required | P1 |
| Consumer order return submission | Orders read-only | Frontend gap; buyer evidence/return request path | P1 |
| Company feed post media | Text and product list only | Frontend gap; signed media viewing | P1 |
| Full Admin audit timeline | Latest notes/review state only | Further source/backend inventory before promising full event history | P1 |
| Legacy product media editing | Existing replacement service supports product-media; legacy shop-media rejected | Backend compatibility; no unsafe rewrite of legacy paths | P1 |
| Same-state old/new screenshots for all modules | No authenticated comparative sessions available this pass | Access/evidence; capture all requested modules using same authorized QA account | P1 |
| Comprehensive every-button/role acceptance | Regression and sampled browser cases do not cover every existing page/control | QA work remains; execute role/action checklist with controlled records | P1 |
| Actual installed APK | No device-level acceptance performed | Test device required; browser proof is not APK proof | P1 |
| Test-payment and buyer-KYC override tools | Old test-only operations change financial/verification records | Controlled QA policy/records required before exposing or executing | P2 |
| Automatic transfers/refunds, new providers, E2EE, agency | Not introduced | Separate product/provider/security decisions; ledger status is not money transfer | P2 |

Variants, Seller unpublish/archive and live remote KYC were not found as supported actions in the audited current Seller/Lifecycle UI. Do not invent them. Source paths and per-action qualifications are in COMPLETE_FEATURE_PARITY_MATRIX.md.
