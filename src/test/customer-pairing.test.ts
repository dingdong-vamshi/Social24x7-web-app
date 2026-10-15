import { describe,expect,it,vi } from 'vitest'
import { createPairingHandler,newPairingChallenge,proofHash } from '../../supabase/functions/customer-pairing/handler'
const request=(body:unknown,origin='https://web.social24-7.com')=>new Request('https://example.invalid/customer-pairing',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)})
const fixture=(enabled=true)=>({enabled,rateKey:vi.fn().mockResolvedValue('a'.repeat(64)),create:vi.fn().mockResolvedValue({id:'id',state:'pending'}),transition:vi.fn().mockResolvedValue({state:'cancelled'})})
describe('disabled pairing foundation (not live Auth)',()=>{
  it('generates independent 256-bit browser and scan proofs without personal data or tokens in QR',async()=>{
    const a=await newPairingChallenge(),b=await newPairingChallenge()
    expect(a.id).not.toBe(b.id);expect(a.browserProof).not.toBe(b.browserProof);expect(a.qrPayload).not.toBe(b.qrPayload)
    expect(a.browserProof).toMatch(/^[a-f0-9]{64}$/);expect(a.qrPayload).not.toContain(a.browserProof)
    expect(a.browserHash).toBe(await proofHash(a.browserProof));expect(a.qrPayload).not.toMatch(/access_token|refresh_token|@|password/)
    expect(new URL(a.qrPayload).search).toBe('')
  })
  it('production-disabled adapter issues no challenges or sessions',async()=>{const d=fixture(false);expect((await createPairingHandler(d)(request({action:'create'}))).status).toBe(503);expect(d.create).not.toHaveBeenCalled()})
  it('rejects foreign origins before any database access',async()=>{const d=fixture();expect((await createPairingHandler(d)(request({action:'create'},'https://evil.invalid'))).status).toBe(403);expect(d.create).not.toHaveBeenCalled()})
  it('stores hashes only and returns no Auth session',async()=>{const d=fixture();const r=await createPairingHandler(d)(request({action:'create',device:'Test browser',userId:'forged'}));const b=await r.json();expect(r.status).toBe(201);expect(r.headers.get('cache-control')).toBe('no-store');expect(JSON.stringify(d.create.mock.calls)).not.toContain(b.browserProof);expect(d.create.mock.calls[0][0]).not.toHaveProperty('userId');expect(b).not.toHaveProperty('session')})
  it.each(['approve','consume','redeem'])('rejects %s: scanning cannot establish an identity',async action=>{const d=fixture();expect((await createPairingHandler(d)(request({action,userId:'forged'}))).status).toBe(400);expect(d.transition).not.toHaveBeenCalled()})
  it('fails closed without a trusted rate key',async()=>{const d=fixture();d.rateKey.mockResolvedValue(null);expect((await createPairingHandler(d)(request({action:'create'}))).status).toBe(503);expect(d.create).not.toHaveBeenCalled()})
  it('requires a browser proof for status and cancellation',async()=>{const d=fixture();expect((await createPairingHandler(d)(request({action:'cancel',id:crypto.randomUUID()}))).status).toBe(400);expect(d.transition).not.toHaveBeenCalled()})
  it('hashes a valid cancellation proof before persistence',async()=>{const d=fixture();const proof='a'.repeat(64),id=crypto.randomUUID();expect((await createPairingHandler(d)(request({action:'cancel',id,browserProof:proof}))).status).toBe(200);expect(d.transition).toHaveBeenCalledWith({challenge_id:id,proof_hash:await proofHash(proof),operation:'cancel'})})
})
