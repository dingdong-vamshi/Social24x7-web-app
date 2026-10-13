# Actual SOCIAL 24-7 roles and account access

Audited 2026-10-13 against the read-only mobile checkout at `e207f7526f140976630b92c09782a87998f6a8c6` and the existing Supabase project `kcuxyxqtfkxrbtmugjsn`. This web display spelling follows the latest client instruction; historical database/repository identifiers are unchanged.

| Identity | Existing? | Auth method | Backend source | Web access | Mobile access | Approval | Notes |
|---|---|---|---|---|---|---|---|
| Customer | YES, ordinary account rather than an exclusive commerce role | Existing Supabase email/password account; mobile also checks registered phone with `verify_my_login_phone` | `auth.users`, `profiles`; authorized conversations/orders | Consumer conversations and order history | Consumer app | Normal account confirmation; order/other operations retain their own gates | Seller/Creator application is not required to use the personal account |
| Seller | YES, additional capability | Same personal Supabase session | `creator_commerce_access.seller_status`, `seller_applications`, owned `storefronts` | Seller Studio only when server status is `approved` | Seller Studio | Commerce Admin controls application state and activation | A query parameter or local fixture cannot approve a user |
| Creator | YES, additional capability | Same personal Supabase session | `creator_commerce_access.creator_status`, `creator_applications` | Creator Center only when server status is `approved` | Creator Center | Commerce Admin review | Promotes seller-owned products; no duplicate inventory |
| Professional Creator | YES, conditional subtype/capability | Same personal Supabase session | Creator `creator_type`; `creator_specialization_policies`; `professional_verification_requests`; `professional_status` | Conditional credential step; separate status displayed | Conditional professional verification | Professional credential approval is distinct from Creator approval | Regulated specializations only; this is not an automatic paid Blue Tick |
| Partner / agency | NOT IMPLEMENTED as a distinct production role in audited model | None | No corresponding role/onboarding entity identified | Information page only | No agency workspace identified | Undefined | The business-surface name Partner does not grant agency permissions |
| Business Owner | YES, ownership relationship | Personal Supabase session | `storefronts.owner_id`, approved Seller capability, team permissions/RPCs | Owned storefront operations allowed by RLS | Seller Studio and Team Management | Existing storefront/Seller approval | Ownership is not a new login type |
| Business Employee | YES, separate work identity | Existing synthetic `loginId@work.social24x7.app` Auth credential and `get_my_business_work_context` | Trusted `app_metadata.account_type=business_employee`, `storefront_team_memberships`, permission tables, work-context RPC | Work identities are explicitly denied personal/owner workspace entry in this delivery; continue in existing mobile business workspace | Existing permission-scoped business workspace | Activation, owner approval, verified membership; suspended/removed blocked | No forced conversion into a personal Seller account; no employee login or team mutations added here |
| Admin | YES | Existing account session | Server `creator_commerce_access.admin_access`, existing Admin RPC enforcement | No new public Admin panel; retain authorized mobile Admin review | Commerce Admin | Existing administrative grants | Client-editable `user_metadata` is never used to authorize |

## Actual authentication configuration

Read-only `/auth/v1/settings` returned HTTP 200 on 2026-10-13: email enabled; phone disabled; Google/Apple and all other OAuth providers disabled; signup enabled; email confirmation required. Thus **phone OTP cannot be delivered by the current project configuration**. The web exposes the working mobile email + phone + password contract and does not simulate SMS verification or offer inactive OAuth controls.

Mobile source evidence: `src/lib/AuthContext.tsx` (`signIn`, `signUp`, `signInBusiness`), `src/features/auth/authValidation.ts`, `src/features/businessWorkspace/businessAuth.ts`, `src/features/teamManagement/rules.ts`. The live `verify_my_login_phone` definition compares `auth.uid()` against `private.account_phone_credentials` using normalized E.164 input.

The web resolves profile by authenticated user ID, access through `get_my_creator_commerce_access`, and owned storefronts by `owner_id`. Route guards wait for access loading, deny on errors, require approved server status, and clear the previous account's data during sign-out/account changes. Database RLS remains authoritative. A user can hold both Seller and Creator approval simultaneously because they are separate columns, not an exclusive selected role. Personal access remains available to these ordinary accounts.

## Seller onboarding field mapping

| Web step / field | Existing mobile/backend mapping |
|---|---|
| Seller type | `seller_type=gst/non_gst`; corresponding `seller_tier` and `business_type` |
| Legal name, trade name, store name | `legal_name`, `business_name`, `storefront_name`, normalized `storefront_slug` |
| Registered state, city, phone, email | `registered_state`, `state_code`, `city`, `phone`, `email` |
| GST / non-GST | `gstin` for GST; `pan_number`, payload `localSellerId` and `declarationAccepted` for non-GST |
| Store/pickup/return address and PIN | `address_line`, `pickup_address`, `return_address`, payload `postalCode` |
| Business document/exterior/interior | `document_path`, `exterior_evidence_path`, `interior_evidence_path`; private evidence upload |
| Business location | `location_latitude`, `location_longitude`; captured by explicit geolocation action |
| Bank details | Existing application payload `bankAccountHolder`, `bankAccountNumber`, `bankIfsc`; manual review |
| Verification video | `business_verification_video_path`; MP4/WebM/MOV up to 15 MB |
| Save/continue/back | Existing `save_creator_commerce_onboarding_draft(p_kind,p_payload)` RPC; no browser KYC draft |
| Submit | Existing mobile upsert shape for `seller_applications`, status `submitted`; no client approval or storefront creation |

The earlier illustrative Representative/Tax/Store sequence was replaced with the actual mobile six-step Seller flow: Seller type → Business → Store & pickup → Bank → Business Verification → Review. No unsupported fields were added.

## Creator onboarding field mapping

Category and one to three specializations use the complete mobile taxonomy (91 live policy rows audited), with the same professional credential rules and legacy aliases. Category → Social presence → Identity & payout → conditional Professional verification → Review matches mobile. General creators do not see credential fields.

Social handles and audience tier remain self-declared. Identity name, PAN, private identity document and either UPI or bank information use the existing columns/payload. Professional credentials use the existing `professional_verification_requests` fields and separate submitted state, attached to the Creator draft ID. Creator submission retains the existing mobile upsert contract; locked professional requests are not silently overwritten.

## Storage, persistence and review

Private bucket `creator-commerce-private` was verified with `public=false`, 15 MB limit and existing image/video/PDF MIME allowlist. Upload paths remain `<auth-user>/<application-kind>/<document-kind>/<timestamp>.<extension>`. The UI reports success only after both Storage upload and `creator_commerce_documents` insert succeed. Unsaved form values remain in memory; save actions use the existing protected draft RPC. Bank/KYC values and document contents are not written to browser localStorage. Supabase Auth persists its session separately through the supported client.

Submitted, under-review, approved and suspended applications are locked. Draft/rejected/more-information-required applications can resume; reviewer notes/corrections and professional status come from the backend. There is no preview-approval control. Neither subscription payments nor provider verification are claimed.

## Verification limits and remaining checks

No Auth users, application records, RLS, schema, Storage settings or provider settings were changed by this Auth/onboarding implementation. Unit/component tests cover redirects, phone normalization, taxonomy, required evidence/payout, MIME limits, save failure preservation, locked applications and forward/back persistence. Authorized QA credentials recovered by the coordinating agent were used successfully in the real browser UI: both Naveen and Yogesh log in and resolve their actual profiles and permissions. Both currently have approved Seller and Creator capabilities; Naveen also has approved professional capability. Yogesh must not be described as buyer-only. No QA roles were changed to make tests pass. No passwords, phone numbers or tokens are included here.

Actual private evidence uploads and application submission remain untested in production to avoid altering existing approved QA applications. Email-confirmation redirect allowlisting, email delivery and signup callback completion need live QA confirmation. No working password-recovery UI was identified in the inspected mobile Auth implementation, and none is advertised here.

Latest user direction: **keep the existing email/password authentication now; prefer email OTP in the future because SMS has a cost**. The current mobile registered-phone match remains part of the existing login contract. Email OTP is a future authentication improvement, not enabled or advertised as functioning in this delivery. Its implementation will need an OTP email template, delivery configuration, anti-abuse limits and same-account linking/lookup verification. SMS sign-in is disabled and is not being activated.

## Auth security review

- The shared client uses PKCE and detects the confirmation code in the callback URL. Signup redirects only to the current origin's `/onboarding`, not to user-supplied external URLs. Permission guards wait for session restoration; callback/restoration errors are displayed. End-to-end confirmation still needs a permitted redirect and a real confirmation email.
- Password login is coordinated inside AuthProvider. Supabase's early `SIGNED_IN` event is withheld until the registered-phone RPC succeeds; mismatches trigger local sign-out and never release profile/workspace access to the UI. Tests cover both success and failure.
- Account data is cleared on account switch/sign-out; request sequencing prevents late queries for a prior session from replacing the current account. Access comes from the server RPC, not user-editable metadata.
- Token refresh and returning to the tab refresh server capabilities. Background refresh does not reset an in-progress onboarding form for the same user. RLS still authorizes every operation, including between UI refreshes.
- Plaintext messages, KYC documents and bank details are not persisted in browser drafts. Only Supabase's supported Auth session persistence remains. Backend application payloads follow the existing mobile model; this does not claim local encryption or E2EE.

Supabase changelog and current Auth documentation were checked before implementation. Current hosted-browser Auth APIs are supported; no schema or protocol migration was needed. The announced November TLS cipher change affects obsolete clients rather than these current browser APIs.
