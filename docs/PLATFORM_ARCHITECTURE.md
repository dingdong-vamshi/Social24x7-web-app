# Social24 platform architecture

## Surfaces

| Surface | Audience | Responsibility |
| --- | --- | --- |
| `www.social24-7.com` | Everyone | Marketing, product explanation, conversion, and routing to partner or consumer web experiences. |
| `partner.social24-7.com` | Sellers, merchants, creators, agencies, brands | Seller and creator onboarding plus ongoing Seller Studio and Creator Center operations. This repository. |
| `web.social24-7.com` | Consumers | Future lightweight messaging, real-time order tracking, account lookup, and QR/OTP access. Not implemented here. |
| Social24 mobile | Consumers and approved business users | Full mobile application, alerts, messaging, camera/barcode workflows, and on-the-go operations. Maintained separately. |

All surfaces are intended to share one Social24 account and backend system. The expected later Supabase project is `kcuxyxqtfkxrbtmugjsn`, but Phase 1 neither connects to nor modifies it.

## Operating model

Partner Web is optimized for heavy operational tasks: bulk catalog work, variant and media management, finance reconciliation, affiliate configuration, analytics, settlement review, evidence review, and team management.

Mobile remains optimal for immediate alerts, rapid order response, customer messaging, live capture, camera/barcode workflows, and work in motion. The two products share concepts and data rather than UI pixels.
