# Partner Auth flow

Public Seller/Creator links now navigate directly to Partner registration with role=seller/creator. Existing-account links preserve that intent. Current login requires registered mobile number, email and password. SMS OTP is not offered. Registration additionally asks display name, username and password confirmation. No accounts or applications are created by this domain integration QA.

After authentication, existing server-backed access resolution controls routing:

- Admin capability → Admin Dashboard (even if a role was requested).
- Approved requested role → Seller Studio / Creator Center.
- No application, draft, corrections or rejected application → appropriate existing application editor.
- Submitted/review status → application status, never automatic approval.

Same account can switch roles; approval remains independent. Workspace switching uses existing backend access and user-keyed session preferences. Seller Social uses Partner Auth; it does not ask for Customer QR linking. Work identities retain their separate login and authorization restrictions. Logout clears the active Partner session; it is not a claim to unlink every device.

Fresh onboarding is not claimed verified using already approved accounts. No production KYC, bank records, approvals or business data were changed during domain QA.
