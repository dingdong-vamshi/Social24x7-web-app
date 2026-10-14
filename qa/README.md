# Isolated visual QA

Run npx vite --config vite.qa.config.ts. Open /qa/preview.html with view=seller&step=4, view=creator&step=1, view=admin or view=chat.

LinkedIn fixtures: Seller review `view=seller&step=5`; Creator review `view=creator&step=3`; Creator Admin detail `view=admin&kind=creator`. Seller fields contain all five requested links; Creator selects LinkedIn, Instagram, Facebook and TikTok. All values are synthetic, including the displayed review state.

Real components use memory-only repository adapters and a synthetic identity. No Supabase client is created. Network-backed methods, submission, upload and Admin decisions throw. Drafts reset on reload. Yellow banner identifies isolated QA.

Normal Vite build has no QA route/entrypoint. .vercelignore excludes this folder/config. Screenshots prove local layout/interaction, never live authorization or persistence.
