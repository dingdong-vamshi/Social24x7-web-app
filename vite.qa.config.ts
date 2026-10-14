import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
const qa = (name: string) => fileURLToPath(new URL('./qa/' + name, import.meta.url))
export default defineConfig({
  plugins: [{ name: 'isolated-qa-adapters', enforce: 'pre', resolveId(source) {
    if (source.endsWith('/auth/AuthContext')) return qa('auth.ts')
    if (source.endsWith('/lib/supabase')) return qa('supabase.ts')
    if (source.endsWith('/auth/onboardingRepository')) return qa('onboarding.ts')
    if (source.endsWith('/repositories/admin')) return qa('admin.ts')
  } }, react()],
  server: { host: '127.0.0.1', port: 5181, strictPort: true },
})
