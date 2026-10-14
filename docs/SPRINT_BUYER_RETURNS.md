# Buyer return request recovery

## Integration

`BuyerReturns` from `src/features/buyerReturns/BuyerReturns.tsx` accepts `{ orderId: string; onChanged?: () => void }`. Mount inside a buyer order detail. It performs no reads until its Returns disclosure is opened. Account/order changes reset the subtree and drafts. Collapsing retains unsaved text/files. Business work identities do not receive this buyer component.

## Verified contracts (read-only inspection, 14 October 2026)

Old mobile `src/features/creatorCommerce/lifecycleRepository.ts` uses `submit_creator_commerce_return` and buyer-owned `order_items`. Actual project `kcuxyxqtfkxrbtmugjsn` metadata confirms the current three-parameter function: `p_order_item_id`, nonempty trimmed `p_reason`, optional `p_details`. It checks `auth.uid()` against the item buyer, locks the item/order, requires delivered/return_requested/return_approved/return_rejected order state, and rejects an elapsed non-null return deadline or an existing return. A null deadline is not replaced with an invented duration. Current return table status constraint: submitted, under_review, approved, rejected, cancelled, received, refunded.

Submission inserts the return, changes the order to return_requested, and withholds applicable creator commissions. It does **not** execute a refund, payment, shipping, or inventory movement. UI explicitly asks for acknowledgment of seller review/no automatic refund. Existing request status/reason/details are readable; a rejected/cancelled request is not silently resubmitted.

Buyer read policies were inspected for order_items, return_requests and commerce_order_evidence. Client also filters buyer/owner and order ID. Repository checks the current authenticated user against the editor's expected account before requests, again before mutation. The RPC remains the authoritative eligibility check; UI checks are not authorization.

## Supporting evidence

The submit RPC does not require trusted evidence. An optional ordinary upload is available only after an existing buyer request has submitted/under_review status. It uses `begin_uploaded_commerce_evidence_capture` with kind return and exact order/item/request IDs, upload to creator-commerce-private with no upsert, then `finalize_commerce_evidence_capture`. No trusted/live capture intent is used or simulated. Accepted MIME and 15 MiB limit match actual finalization constraints: JPEG/PNG/WebP/MP4/MOV/WebM (not PDF).

The intent helper validates the buyer's open request. The client validates the server-issued owner/order/request path prefix and traversal segments. Unknown finalization outcomes preserve the uploaded object because a committed evidence row may reference it. The UI blocks immediate repeated upload/submission and asks for explicit refresh/reconciliation. Actual return evidence labels distinguish uploaded_file, existing live_capture records, and unknown sources.

## Evidence boundary

12 scoped unit/component tests pass: delivery/deadline/duplicate eligibility, invalid file MIME/size, ownership/account switching, exact RPC parameter whitelist, no refund RPC, unknown outcomes, uploaded-only intent, wrong path denial, no cleanup after ambiguous finalization, retained drafts, acknowledgment, closed requests, lazy loading. TypeScript build and scoped ESLint pass.

No production return or evidence mutation was performed by this implementation agent. There is no live submission/approval/refund proof. Browser integration and authorized test-order round trip remain parent QA work; do not present unit coverage as live lifecycle verification. This component does not add cancellation/withdrawal, trusted camera capture, refunds, return shipping, or review/approval permissions. Evidence list displays up to the latest 500 files for the order; oversized item/return lists fail visibly instead of silently giving incomplete eligibility.
