import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured, requireSupabase } from '../lib/supabase'
import { forgetWorkspace } from './routing'

export interface Profile { id: string; display_name: string; username: string; avatar_path: string | null }
export interface CommerceAccess { user_id: string; seller_status: string; creator_status: string; professional_status: string; buyer_kyc_status: string; admin_access: boolean }
export interface Storefront { id: string; name: string; slug: string; active: boolean; verification_status: string }
interface AuthState { session: Session | null; profile: Profile | null; access: CommerceAccess | null; storefronts: Storefront[] }
interface AuthValue extends AuthState { user: User | null; loading: boolean; error: string | null; configured: boolean; refreshProfile: () => Promise<void>; signIn: (credentials: { email: string; phone: string; password: string }) => Promise<void>; signOut: () => Promise<void> }
const empty: AuthState = { session: null, profile: null, access: null, storefronts: [] }
const Context = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(empty)
  const [loading, setLoading] = useState(supabaseConfigured)
  const [error, setError] = useState<string | null>(null)
  const version = useRef(0)
  const verifyingCredentials = useRef(false)
  const currentUserId = useRef<string | null>(null)
  const hydrate = useCallback(async (session: Session | null, background = false) => {
    const request = ++version.current
    const sameAccount = session?.user.id === currentUserId.current
    if (!sameAccount) forgetWorkspace(currentUserId.current)
    currentUserId.current = session?.user.id ?? null
    if (!background || !sameAccount) setLoading(true)
    if (!background || !sameAccount) setError(null)
    // Clear old account data immediately, including during account switching.
    if (!background || !sameAccount) setState({ ...empty, session })
    if (!session || !supabase) { setLoading(false); return }
    try {
      const [profile, access, stores] = await Promise.all([
        supabase.from('profiles').select('id,display_name,username,avatar_path').eq('id', session.user.id).maybeSingle(),
        supabase.rpc('get_my_creator_commerce_access'),
        supabase.from('storefronts').select('id,name,slug,active,verification_status').eq('owner_id', session.user.id),
      ])
      if (profile.error) throw profile.error
      if (access.error) throw access.error
      if (stores.error) throw stores.error
      if (request !== version.current) return
      setError(null)
      setState({ session, profile: profile.data, access: Array.isArray(access.data) ? access.data[0] ?? null : access.data, storefronts: stores.data ?? [] })
    } catch (cause) {
      if (request === version.current) { setState({ ...empty, session }); setError(cause instanceof Error ? cause.message : 'Unable to load your account permissions. Please retry.') }
    } finally { if (request === version.current) setLoading(false) }
  }, [])
  useEffect(() => {
    if (!supabase) return
    let active = true
    // Do not await other Supabase calls inside the Auth event callback.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && !verifyingCredentials.current) window.setTimeout(() => { if (active && !verifyingCredentials.current) void hydrate(session, event === 'TOKEN_REFRESHED') }, 0)
    })
    const initialVersion = version.current
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active || verifyingCredentials.current || initialVersion !== version.current) return
      if (error) { setError(error.message); setLoading(false) } else void hydrate(data.session)
    }).catch(() => { if (active) { setError('Unable to restore your account session. Please sign in again.'); setLoading(false) } })
    const refreshOnReturn = () => {
      if (document.visibilityState !== 'visible' || verifyingCredentials.current) return
      void supabase!.auth.getSession().then(({ data, error }) => {
        if (!active || verifyingCredentials.current) return
        if (error) { setError('Your account session could not be refreshed. Please sign in again.'); return }
        void hydrate(data.session, true)
      }).catch(() => { if (active) setError('Unable to refresh account access. Check your connection.') })
    }
    window.addEventListener('focus', refreshOnReturn)
    document.addEventListener('visibilitychange', refreshOnReturn)
    return () => { active = false; data.subscription.unsubscribe(); window.removeEventListener('focus', refreshOnReturn); document.removeEventListener('visibilitychange', refreshOnReturn) }
  }, [hydrate])
  const signIn = useCallback(async (credentials: { email: string; phone: string; password: string }) => {
    const client = requireSupabase()
    verifyingCredentials.current = true
    version.current++
    setState(empty); setLoading(true); setError(null)
    try {
      const result = await client.auth.signInWithPassword({ email: credentials.email.trim().toLowerCase(), password: credentials.password })
      if (result.error) throw result.error
      const { data, error } = await client.rpc('verify_my_login_phone', { p_phone: credentials.phone })
      if (error || data !== true || result.data.user?.app_metadata?.account_type === 'business_employee') {
        const logout = await client.auth.signOut({ scope: 'local' })
        if (logout.error) throw new Error('Account verification failed and the session could not be cleared. Close this browser and retry.')
        throw new Error('Incorrect email, phone number or password. Business work accounts use the existing business workspace.')
      }
      await hydrate(result.data.session)
    } catch (cause) {
      currentUserId.current = null; setState(empty); setLoading(false)
      throw cause
    } finally { verifyingCredentials.current = false }
  }, [hydrate])
  const refreshProfile = useCallback(async () => {
    const { data, error } = await requireSupabase().auth.getSession()
    if (error) throw error
    await hydrate(data.session)
  }, [hydrate])
  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut()
    if (error) throw error
    forgetWorkspace(currentUserId.current)
    version.current++; currentUserId.current = null; setState(empty); setError(null); setLoading(false)
  }, [])
  return <Context.Provider value={{ ...state, user: state.session?.user ?? null, loading, error, configured: supabaseConfigured, refreshProfile, signIn, signOut }}>{children}</Context.Provider>
}
// The hook shares the provider context and intentionally lives beside it.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(Context)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
