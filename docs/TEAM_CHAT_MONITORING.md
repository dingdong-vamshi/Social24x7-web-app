# Team customer-chat monitoring

Implemented 2026-10-14 to close a missing web view, not introduce a new chat policy.

## Existing scope and mobile behavior

The earlier platform brief requested reuse of team chat assignment, permissions and supervisor monitoring. The mobile app already implements this in `src/features/teamManagement/TeamManagementPanel.tsx` and `teamRepository.ts`. The web Team & verification page previously showed memberships and permissions only.

## Using the web view

Open Seller Studio → Team & verification → Assigned customer chats. Select an employee and optionally Open/Resolved, then select a conversation. The panel shows customer and representative attribution, message text and timestamps. An empty employee list result means no currently authorized assignments match; a suspended/removed membership is not reactivated by viewing history.

## Authorization and limits

- Reuses existing authenticated `get_business_workspace_inbox` and `get_business_workspace_messages` RPCs. Their deployed definitions were inspected read-only in project `kcuxyxqtfkxrbtmugjsn`.
- Inbox access remains governed by verified assignment or existing storefront monitoring permissions. History authorization remains enforced by the backend.
- Explicit storefront filtering and a fresh assignment check precede history requests. Previous history is cleared when a filter changes or refresh fails.
- Only business/customer conversations are included, never employees' Personal Chat.
- This panel is read-only. No reply, takeover, reassignment, activation, permission change, read-receipt mutation or production data write was added.
- Foreground refresh occurs every 30 seconds, on reconnection, when returning to the tab, or using Refresh chats. This is polling, not a new Realtime subscription.
- Rich attachment rendering and employee work-login flows remain in the existing application. The web panel identifies non-text messages but does not claim complete attachment playback.
- No schema, RLS, Auth settings or mobile code changes.

## Verification

Build, lint and 115 automated tests passed, including storefront isolation, changed assignments, backend denial, no reply controls and history removal on refresh failure. Isolated browser checks of the actual component passed at widths 1440, 1280, 1024, 768 and 430 with no horizontal document overflow or JavaScript page errors. Screenshots use clearly labeled fictional local fixtures and no backend connection.

An authenticated production Seller walkthrough of this new panel remains an acceptance test; fixture browser checks are not evidence of a successful live account history fetch. Verify with an authorized Seller who has existing customer-chat assignments. Do not create assignments or reactivate employees solely to populate a screenshot.
