// LOCAL synthetic fixtures only. No production connection arguments are accepted.
const {execFileSync,spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','/tmp/social-storage-policy-qa.Xjwgqi','-p','55439','-d','customer_pairing_qa','-f','-'];
const sql=q=>execFileSync('/opt/homebrew/bin/psql',args,{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const service=q=>sql('set role service_role;'+q);
const denied=run=>assert.throws(run);
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',browser='a'.repeat(64),scan='b'.repeat(64),rate='c'.repeat(64);
const make=n=>service(`select customer_pairing_create('${id(n)}','${browser}','${scan}','${rate}','Synthetic browser');`);
const transition=(n,op,proof=browser,actor=null)=>service(`select customer_pairing_transition('${id(n)}','${proof}','${op}',${actor?`'${actor}'`:'null'});`);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
check('RLS enabled on private pairing records',()=>assert.equal(sql("select relrowsecurity from pg_class where oid='private.customer_pairing_challenges'::regclass"),'t'));
for(const role of ['anon','authenticated']){
 check(role+' cannot read challenges',()=>denied(()=>sql(`set role ${role};select * from private.customer_pairing_challenges;`)));
 check(role+' cannot create challenges through RPC',()=>denied(()=>sql(`set role ${role};select customer_pairing_create('${id(1)}','${browser}','${scan}','${rate}','Browser');`)));
 check(role+' cannot approve through RPC',()=>denied(()=>sql(`set role ${role};select customer_pairing_transition('${id(1)}','${scan}','approve','${a}');`)));
}
check('Create stores a two-minute pending challenge',()=>{const r=JSON.parse(make(1));assert.equal(r.state,'pending');assert(Date.parse(r.expiresAt)-Date.now()>110000);assert(!('approved_user'in r))});
check('Duplicate challenge ID is denied',()=>denied(()=>make(1)));
check('Wrong browser proof cannot poll',()=>denied(()=>transition(1,'status',scan)));
check('Browser proof cannot act as scan proof',()=>denied(()=>transition(1,'approve',browser,a)));
check('Unauthenticated approval denied',()=>denied(()=>transition(1,'approve',scan)));
check('Scanning alone leaves challenge pending',()=>assert.equal(JSON.parse(transition(1,'inspect',scan,a)).state,'pending'));
check('Unapproved consumption denied',()=>denied(()=>transition(1,'consume',browser,a)));
check('Explicit trusted identity approval is recorded',()=>assert.equal(JSON.parse(transition(1,'approve',scan,a)).state,'approved'));
check('Another identity cannot overwrite approval',()=>denied(()=>transition(1,'approve',scan,b)));
check('Cross-account redemption denied',()=>denied(()=>transition(1,'consume',browser,b)));
check('Only browser proof + same approving identity can consume',()=>assert.equal(JSON.parse(transition(1,'consume',browser,a)).state,'consumed'));
check('Consumed challenge cannot replay',()=>denied(()=>transition(1,'consume',browser,a)));
check('Status exposes no identity or credential',()=>assert.deepEqual(Object.keys(JSON.parse(transition(1,'status'))).sort(),['device','expiresAt','id','state']));
check('Cancel is browser-bound and terminal',()=>{make(2);denied(()=>transition(2,'cancel',scan));assert.equal(JSON.parse(transition(2,'cancel')).state,'cancelled');denied(()=>transition(2,'approve',scan,a))});
check('Expired challenge cannot approve or redeem',()=>{make(3);sql(`update private.customer_pairing_challenges set created_at=clock_timestamp()-interval '3 minutes',expires_at=clock_timestamp()-interval '1 minute' where id='${id(3)}'`);assert.equal(JSON.parse(transition(3,'status')).state,'expired');denied(()=>transition(3,'approve',scan,a));denied(()=>transition(3,'consume',browser,a))});
check('Rate limit allows five then denies the sixth within a minute',()=>{make(4);make(5);make(6);denied(()=>make(7))});
check('New challenge uses an independent identifier',()=>assert.equal(sql('select count(distinct id)=count(*) from private.customer_pairing_challenges'),'t'));
check('Functions are invoker with fixed search paths',()=>assert.equal(sql("select bool_and(not prosecdef and proconfig @> array['search_path=\"\"']) from pg_proc where proname like 'customer_pairing_%'"),'t'));
// One-time redemption is a locked transaction, including simultaneous attempts.
sql(`update private.customer_pairing_challenges set created_at=clock_timestamp()-interval '3 minutes',expires_at=clock_timestamp()-interval '1 minute'`);
make(8);transition(8,'approve',scan,a);
const run=()=>new Promise(resolve=>{const p=spawn('/opt/homebrew/bin/psql',args,{stdio:['pipe','pipe','pipe']});p.stdout.resume();p.stderr.resume();p.on('close',code=>resolve(code));p.stdin.end(`set role service_role;select customer_pairing_transition('${id(8)}','${browser}','consume','${a}');`)});
Promise.all([run(),run()]).then(codes=>{check('Concurrent redemption permits exactly one consumer',()=>assert.equal(codes.filter(c=>c===0).length,1));console.log(`TOTAL ${checks} pairing SQL checks passed`)}).catch(e=>{console.error(e);process.exitCode=1});
