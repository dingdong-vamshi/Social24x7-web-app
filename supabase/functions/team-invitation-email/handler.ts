import { object, teamHandler } from '../_shared/team-http.ts'
export type Invitation = { membershipId: string; activationCode: string; expiresAt: string; loginId: string; workEmail: string }
export function createInvitationEmailHandler(deps: {
  authenticate: (token: string) => Promise<boolean>
  configured: () => boolean
  invite: (token: string, input: Record<string, unknown>) => Promise<Invitation>
  resend: (token: string, input: Record<string, unknown>) => Promise<Invitation>
  send: (invitation: Invitation) => Promise<boolean>
}) {
  return teamHandler(async (token, body) => {
    if (!await deps.authenticate(token)) throw Error('Authentication required')
    if (body.action === 'capabilities') return { configured: deps.configured() }
    if (!['invite', 'resend'].includes(String(body.action)) || !deps.configured()) throw Error('Email is not configured')
    // Caller-scoped RPC performs permission/role/email validation and creates one invitation.
    const invitation = await (body.action === 'resend' ? deps.resend : deps.invite)(token, object(body.input))
    let accepted = false
    try { accepted = await deps.send(invitation) } catch { /* Return the created invitation for explicit private delivery, never silently create another. */ }
    return { membershipId: invitation.membershipId, activationCode: invitation.activationCode, expiresAt: invitation.expiresAt, emailStatus: accepted ? 'accepted' : 'failed' }
  })
}
