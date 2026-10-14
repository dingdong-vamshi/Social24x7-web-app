import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured, requireSupabase } from '../lib/supabase'
import type { BusinessWorkContext } from '../features/businessWorkspace/businessAuth'
import { businessLoginEmail } from '../features/businessWorkspace/businessAuth'
import { forgetWorkspace } from './routing'

export interface Profile { id: string; display_name: string; username: string; avatar_path: string | null }
export interface CommerceAccess { user_id: string; seller_status: string; creator_status: string; professional_status: string; buyer_kyc_status: string; admin_access: boolean }
export interface Storefront { id: string; name: string; slug: string; active: boolean; verification_status: string }
interface AuthState { workContext: BusinessWorkContext | null; session: Session | null; profile: Profile | null; access: CommerceAccess | null; storefronts: Storefront[] }
interface AuthValue extends AuthState { user: User | null; loading: boolean; error: string | null; configured: boolean; refreshProfile: () => Promise<void>; signIn: (credentials: { email: string; phone: string; password: string }) => Promise<void>; signOut: () => Promise<void>; signInWork: (credentials: {loginId:string;password:string}) => Promise<void> }
const empty: AuthState = { workContext: null, session: null, profile: null, access: null, storefronts: [] }
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
      if (session.user.app_metadata?.account_type === 'business_employee') {
        const { data, error } = await supabase.rpc('get_my_business_work_context')
        if (request !== version.current) return
        if (error) throw error
        if (!data || data.status !== 'verified') throw new Error('This work account is awaiting approval, suspended, removed or unavailable. Contact your business owner.')
        setState({ ...empty, session, workContext: data as BusinessWorkContext }); setError(null); return
      }
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
      setState({ workContext: null, session, profile: profile.data, access: Array.isArray(access.data) ? access.data[0] ?? null : access.data, storefronts: stores.data ?? [] })
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
        throw new Error('Incorrect email, phone number or password. Business work accounts use Work account login.')
      }
      await hydrate(result.data.session)
    } catch (cause) {
      currentUserId.current = null; setState(empty); setLoading(false)
      throw cause
    } finally { verifyingCredentials.current = false }
  }, [hydrate])
  const signInWork = useCallback(async (credentials: {loginId:string;password:string}) => {
    const client=requireSupabase();verifyingCredentials.current=true;version.current++;setState(empty);setLoading(true);setError(null)
    try {
      const result=await client.auth.signInWithPassword({email:businessLoginEmail(credentials.loginId),password:credentials.password})
      if(result.error)throw result.error
      const context=await client.rpc('get_my_business_work_context')
      if(result.data.user?.app_metadata?.account_type!=='business_employee'||context.error||context.data?.status!=='verified'){
        const logout=await client.auth.signOut({scope:'local'})
        if(logout.error)throw new Error('Work verification failed and sign-out could not be confirmed. Close this browser and retry.')
        throw new Error('Work access is not verified. Ask your owner to check activation, approval or suspension.')
      }
      await hydrate(result.data.session)
    }catch(cause){currentUserId.current=null;setState(empty);setLoading(false);throw cause}finally{verifyingCredentials.current=false}
  },[hydrate])
  const refreshProfile = useCallback(async () => {
    const { data, error } = await requireSupabase().auth.getSession()
    if (error) throw error
    await hydrate(data.session)
  }, [hydrate])
  const signOut = useCallback(async () => {
    // Leave other origins and the installed app signed in. Device-wide revocation
    // is a separate explicit action, not the ordinary Partner logout button.
    const { error } = await requireSupabase().auth.signOut({ scope: 'local' })
    if (error) throw error
    forgetWorkspace(currentUserId.current)
    version.current++; currentUserId.current = null; setState(empty); setError(null); setLoading(false)
  }, [])
  return <Context.Provider value={{ ...state, user: state.session?.user ?? null, loading, error, configured: supabaseConfigured, refreshProfile, signIn, signOut, signInWork }}>{children}</Context.Provider>
}
// The hook shares the provider context and intentionally lives beside it.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const value = useContext(Context)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
