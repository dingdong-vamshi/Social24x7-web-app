# Official domains

Updated 2026-10-14. Existing Vercel project: social24x7-web-app. No DNS changes.

| Host | Purpose | Start |
| --- | --- | --- |
| www.social24-7.com | Public marketing and role-specific entry | / |
| partner.social24-7.com | Seller, Creator, Admin, work accounts and account Social | /partner |
| web.social24-7.com | Customer device-linking entry | /web |
| social24-7.com | Existing Vercel permanent redirect | 308 to www |
| social24x7-web-app.vercel.app | Existing path-based regression deployment | / |

All five resolve over HTTPS. Vercel Domains shows Valid Configuration, with the three subdomains assigned to Production. The .in domain remains untouched. The application and backend are not duplicated.

Production environment inspection: only VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are configured. URL is https://kcuxyxqtfkxrbtmugjsn.supabase.co. No stale callback-origin environment setting exists. Official origins are centralized in src/lib/domains.ts, not runtime secrets. No environment changes needed.
