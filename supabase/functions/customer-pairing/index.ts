import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import { createPairingHandler } from './handler.ts'
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
Deno.serve(createPairingHandler({
  // Hard-disabled, not a remotely switchable flag. Do not activate without a reviewed
  // mobile approval + supported browser Auth exchange and trusted ingress rate key.
  enabled:false,
  rateKey:async()=>null,
  async create(input){const r=await client.rpc('customer_pairing_create',input);if(r.error)throw r.error;return r.data},
  async transition(input){const r=await client.rpc('customer_pairing_transition',input);if(r.error)throw r.error;return r.data},
}))
