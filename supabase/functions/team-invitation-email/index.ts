import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createInvitationEmailHandler } from './handler.ts'
import { uuid } from '../_shared/team-http.ts'
const url = Deno.env.get('SUPABASE_URL')!, anon = Deno.env.get('SUPABASE_ANON_KEY')!
const key = Deno.env.get('RESEND_API_KEY'), sender = Deno.env.get('TEAM_INVITE_FROM'), replyTo = Deno.env.get('TEAM_INVITE_REPLY_TO')
const client = (token: string) => createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: token } } })
Deno.serve(createInvitationEmailHandler({
  configured: () => Boolean(key && sender),
  async authenticate(token) {
    if (url !== 'https://kcuxyxqtfkxrbtmugjsn.supabase.co') return false
    const result = await client(token).auth.getUser(token.slice(7)); return !result.error && Boolean(result.data.user)
  },
  async invite(token, input) {
    const result = await client(token).rpc('create_storefront_team_invitation', { target_storefront: input.storefrontId, p_full_name: input.fullName, p_work_email: input.workEmail, p_login_id: input.loginId, p_customer_tagline: input.customerTagline, p_job_title: input.jobTitle, p_employee_id: input.employeeId || null, p_department: input.department, p_role_id: input.roleId, p_permissions: input.permissions ?? null })
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    if (result.error || !row?.membership_id || !row.activation_code || !row.expires_at) throw Error('Invitation not confirmed')
    return { membershipId: row.membership_id, activationCode: row.activation_code, expiresAt: row.expires_at, loginId: String(input.loginId).trim().toLowerCase(), workEmail: String(input.workEmail).trim().toLowerCase() }
  },
  async send(invitation) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `team-invite-${invitation.membershipId}-${invitation.expiresAt}` }, body: JSON.stringify({ from: sender, to: [invitation.workEmail], ...(replyTo ? { reply_to: replyTo } : {}), subject: 'Your SOCIAL 24-7 Work invitation', text: `You have been invited to a separate SOCIAL 24-7 Work account.\n\nBusiness login ID: ${invitation.loginId}\nOne-time activation code: ${invitation.activationCode}\nExpires: ${invitation.expiresAt}\n\nOpen https://partner.social24-7.com/business-activate and choose your own password. Never share your password. Owner approval is required after activation. Ignore this message if you did not expect a work invitation.` }) })
    if (!response.ok) return false
    const result = await response.json(); return typeof result.id === 'string'
  },
  async resend(token, input) {
    if (!uuid(input.storefrontId) || !uuid(input.membershipId)) throw Error('Invalid identifiers')
    const caller = client(token)
    const dashboard = await caller.rpc('get_storefront_team_dashboard', { target_storefront: input.storefrontId })
    const member = dashboard.data?.members?.find((m: { id: string }) => m.id === input.membershipId)
    if (dashboard.error || !member || member.status !== 'not_activated' || typeof member.workEmail !== 'string') throw Error('Invitation unavailable')
    const result = await caller.rpc('resend_storefront_team_activation', { target_member: input.membershipId })
    const row = Array.isArray(result.data) ? result.data[0] : result.data
    if (result.error || !row?.activation_code || !row.expires_at) throw Error('Replacement not confirmed')
    return { membershipId: input.membershipId, activationCode: row.activation_code, expiresAt: row.expires_at, workEmail: member.workEmail, loginId: member.loginId }
  },
}))
