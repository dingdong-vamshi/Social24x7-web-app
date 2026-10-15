import { teamHandler, uuid } from '../_shared/team-http.ts'
export function createTeamMediaHandler(deps: {
  authorize: (token: string, store: string, conversation: string, message: string) => Promise<{ type?: string; bucket?: string; path?: string } | null>
  sign: (path: string, seconds: number) => Promise<string | null>
}) {
  return teamHandler(async (token, body) => {
    if (![body.storefrontId, body.conversationId, body.messageId].every(uuid)) throw Error('Invalid identifiers')
    const content = await deps.authorize(token, String(body.storefrontId), String(body.conversationId), String(body.messageId))
    const path = content?.path || ''
    if (content?.type !== 'attachment' || content.bucket !== 'chat-media' || !path.startsWith(`${body.conversationId}/`) || path.split('/').some(part => !part || part === '.' || part === '..') || /[:\\?#%]/.test(path)) throw Error('Unavailable')
    const url = await deps.sign(path, 60)
    if (!url?.startsWith('https://')) throw Error('Signing failed')
    return { url, expiresIn: 60 }
  })
}
