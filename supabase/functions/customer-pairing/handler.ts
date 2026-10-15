// Foundation only: deliberately unavailable until mobile + Auth exchange are reviewed.
// No approval/redemption route and no way to create an Auth session here.
const origin = 'https://web.social24-7.com'
const hex = (bytes: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('')
export const proofHash = async (value: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
export async function newPairingChallenge() {
  const browserProof = hex(crypto.getRandomValues(new Uint8Array(32)))
  const scanProof = hex(crypto.getRandomValues(new Uint8Array(32)))
  const id = crypto.randomUUID()
  return { id, browserProof, browserHash: await proofHash(browserProof), scanHash: await proofHash(scanProof),
    // A fragment avoids sending the scan proof in URL access logs/referrers.
    qrPayload: `${origin}/link-device#${id}.${scanProof}` }
}
type Row = {id:string;state:string;expiresAt:string;device:string}
type Dependencies = {
  enabled: boolean
  rateKey(request: Request): Promise<string | null>
  create(input: {challenge_id:string;browser_proof_hash:string;scan_proof_hash:string;client_rate_hash:string;device:string}): Promise<Row>
  transition(input: {challenge_id:string;proof_hash:string;operation:'status'|'cancel'}): Promise<Row>
}
export function createPairingHandler(deps: Dependencies) {
  return async (request: Request) => {
    const headers = {'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Vary':'Origin',
      'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Referrer-Policy':'no-referrer'}
    const respond=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers})
    if(request.headers.get('origin') !== origin) return respond(403,{error:'Origin not permitted'})
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers})
    if(request.method!=='POST') return respond(405,{error:'POST required'})
    if(!deps.enabled) return respond(503,{error:'Mobile approval and secure session exchange are not integrated. Use account login.'})
    try {
      if(Number(request.headers.get('content-length'))>1024) return respond(413,{error:'Request too large'})
      const reader=request.body?.getReader(); if(!reader) return respond(400,{error:'Request required'})
      const chunks:Uint8Array[]=[]; let size=0
      while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>1024){await reader.cancel();return respond(413,{error:'Request too large'})}chunks.push(item.value)}
      const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.length}
      const body=JSON.parse(new TextDecoder().decode(buffer))
      if(body.action==='create') {
        const rateKey=await deps.rateKey(request)
        if(!rateKey || !/^[0-9a-f]{64}$/.test(rateKey)) return respond(503,{error:'Pairing protection unavailable'})
        const challenge=await newPairingChallenge()
        const device=typeof body.device==='string' ? (body.device as string).split('').filter(c=>c.charCodeAt(0)>=32 && c.charCodeAt(0)!==127).join('').trim().slice(0,80) : ''
        const row=await deps.create({challenge_id:challenge.id,browser_proof_hash:challenge.browserHash,scan_proof_hash:challenge.scanHash,client_rate_hash:rateKey,device:device||'Customer Web browser'})
        return respond(201,{...row,browserProof:challenge.browserProof,qrPayload:challenge.qrPayload})
      }
      if(!['status','cancel'].includes(body.action)) return respond(400,{error:'Unsupported pairing action'})
      if(!/^[0-9a-f-]{36}$/.test(body.id||'') || !/^[0-9a-f]{64}$/.test(body.browserProof||'')) return respond(400,{error:'Invalid pairing proof'})
      const row=await deps.transition({challenge_id:body.id,proof_hash:await proofHash(body.browserProof),operation:body.action})
      return respond(200,row)
    } catch {
      // No database internals, submitted proofs, IPs, tokens or account identifiers in errors/logs.
      return respond(400,{error:'Pairing challenge unavailable or rate limited. Start a new attempt later.'})
    }
  }
}
