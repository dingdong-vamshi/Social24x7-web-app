// PRIVATE local-only PostgreSQL fixture. No production connection or real identities.
const fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path');
const args=['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-h','/tmp/social-storage-policy-qa.Xjwgqi','-p','55439','-d',process.env.SOCIAL_POLICY_TEST_DB||'closure_storage_20261014'];
function run(sql){return cp.spawnSync('/opt/homebrew/bin/psql',args,{input:sql,encoding:'utf8'});}
function must(sql){const r=run(sql);if(r.status)throw Error(r.stderr);return r.stdout.trim();}
const report={environment:'Disposable local PostgreSQL 14.19; production is 17.6',productionWrites:0,checks:[]};
const A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002',UA='00000000-0000-0000-0000-000000000011',UB='00000000-0000-0000-0000-000000000012',EMP='00000000-0000-0000-0000-000000000013';
const states=['draft','changes_required','rejected','approved','under_review','suspended','archived'];
const products=Object.fromEntries(states.map((s,i)=>[s,'00000000-0000-0000-0000-'+String(101+i).padStart(12,'0')]));
const BP='00000000-0000-0000-0000-000000000201';
const literal=s=>"'"+s.replaceAll("'","''")+"'";
function test(name,sql,{user=UA,role='authenticated',denied=false,rows=null}={}){
 const body=rows===null?sql:`DO $test$ DECLARE n bigint; BEGIN ${sql}; GET DIAGNOSTICS n=ROW_COUNT; IF n <> ${rows} THEN RAISE EXCEPTION 'unexpected affected rows %',n; END IF; END $test$;`;
 const r=run(`BEGIN; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claim.sub=${literal(user)}; ${body}; ROLLBACK;`);
 const pass=denied?r.status!==0&&/row-level security/.test(r.stderr):r.status===0;
 report.checks.push({name,pass});if(!pass)throw Error(name+': '+r.stderr);
}
function insert(p,bucket='shop-media',owner=UA){return `INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES(${literal(bucket)},${literal(p)},${literal(owner)})`;}
const snapshot=()=>JSON.parse(must("select json_agg(json_build_object('policyname',policyname,'permissive',permissive,'roles',roles::text,'cmd',cmd,'qual',qual,'with_check',with_check) order by policyname) from pg_policies where schemaname='storage' and tablename='objects'"));
try{
 must(fs.readFileSync(path.join(__dirname,'storage-fixture.sql'),'utf8'));
 must(`INSERT INTO public.storefronts VALUES('${A}','${UA}','${A}/Synthetic QA name'),('${B}','${UB}','Normal Store B');`);
 for(const [status,id]of Object.entries(products))must(`INSERT INTO public.products VALUES('${id}','${A}','${status}'); INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('shop-media','${A}/products/${id}/existing.png','${UA}');`);
 must(`INSERT INTO public.products VALUES('${BP}','${B}','draft'); INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('shop-media','${B}/products/${BP}/existing.png','${UB}'),('shop-media','${A}/branding/logo/existing.png','${UA}'),('shop-media','${B}/branding/logo/existing.png','${UB}');`);
 const before=snapshot();
 test('Pre-fix defect reproduced: cross-store INSERT on synthetic records only',insert(B+'/branding/logo/pre-fix.png'));
 test('Pre-fix defect reproduced: cross-store UPDATE on synthetic records only',`UPDATE storage.objects SET metadata='{"qa":true}' WHERE name='${B}/branding/logo/existing.png'`,{rows:1});
 test('Pre-fix defect reproduced: cross-store DELETE on synthetic records only',`DELETE FROM storage.objects WHERE name='${B}/branding/logo/existing.png'`,{rows:1});
 must(fs.readFileSync(path.join(__dirname,'storage-generic-baseline.sql'),'utf8'));
 const baseline=snapshot();
 must(fs.readFileSync(path.join(__dirname,'../migrations/20261014175833_closure_shop_media_source_policy.sql'),'utf8'));
 const repaired=snapshot();
 const unchanged=JSON.stringify(before.filter(p=>!p.policyname.startsWith('shop_media_owner_') && p.policyname!=='creator_commerce_shop_media_seller_update'))===JSON.stringify(repaired.filter(p=>!p.policyname.startsWith('shop_media_owner_') && p.policyname!=='creator_commerce_shop_media_seller_update'));
 report.checks.push({name:'Only reviewed generic baseline and product UPDATE source differ from historic snapshot',pass:unchanged});if(!unchanged)throw Error('Unexpected policy change');
 for(const kind of ['logo','cover'])test('Owner can INSERT new own branding '+kind,insert(A+'/branding/'+kind+'/new.png'));
 test('Cross-store branding INSERT denied',insert(B+'/branding/logo/new.png'),{denied:true});
 test('Employee identity cannot INSERT owner branding',insert(A+'/branding/logo/new.png','shop-media',EMP),{user:EMP,denied:true});
 test('Anonymous branding INSERT denied',insert(A+'/branding/logo/new.png'),{role:'anon',user:'',denied:true});
 test('Authenticated role without user identity denied',insert(A+'/branding/logo/new.png'),{user:'',denied:true});
 test('Spoofed object owner denied',insert(A+'/branding/logo/new.png','shop-media',UB),{denied:true});
 for(const p of ['new.png',A+'/new.png',A+'/branding/new.png',A+'/branding/other/new.png',A+'/unknown/new.png'])test('Malformed/unapproved branding path denied: '+p,insert(p),{denied:true});
 test('Other bucket denied',insert(A+'/branding/logo/new.png','not-shop'),{denied:true});
 test('Cross-store UPDATE denied',`UPDATE storage.objects SET metadata='{"qa":true}' WHERE name='${B}/branding/logo/existing.png'`,{rows:0});
 test('Cross-store DELETE denied',`DELETE FROM storage.objects WHERE name='${B}/branding/logo/existing.png'`,{rows:0});
 test('Own branding overwrite not granted',`UPDATE storage.objects SET metadata='{"qa":true}' WHERE name='${A}/branding/logo/existing.png'`,{rows:0});
 test('Own branding delete not granted',`DELETE FROM storage.objects WHERE name='${A}/branding/logo/existing.png'`,{rows:0});
 for(const [status,id]of Object.entries(products)){
  const allowed=['draft','changes_required','rejected','approved'].includes(status);
  test('Product INSERT rule preserved: '+status,insert(`${A}/products/${id}/new.png`),{denied:!allowed});
  test('Product UPDATE rule preserved: '+status,`UPDATE storage.objects SET metadata='{"qa":true}' WHERE name='${A}/products/${id}/existing.png'`,{rows:allowed?1:0});
  test('Product DELETE rule preserved: '+status,`DELETE FROM storage.objects WHERE name='${A}/products/${id}/existing.png'`,{rows:allowed?1:0});
 }
 test('Other Seller product INSERT denied',insert(B+'/products/'+BP+'/new.png'),{denied:true});
 test('Other Seller product UPDATE denied',`UPDATE storage.objects SET metadata='{"qa":true}' WHERE name='${B}/products/${BP}/existing.png'`,{rows:0});
 test('Other Seller product DELETE denied',`DELETE FROM storage.objects WHERE name='${B}/products/${BP}/existing.png'`,{rows:0});
 test('UPDATE cannot change product object owner',`UPDATE storage.objects SET owner_id='${UB}' WHERE name='${A}/products/${products.draft}/existing.png'`,{denied:true});
 test('UPDATE cannot move product to another storefront',`UPDATE storage.objects SET name='${B}/products/${BP}/moved.png' WHERE name='${A}/products/${products.draft}/existing.png'`,{denied:true});
 test('Public image SELECT retains all ten fixture rows',"DO $test$ DECLARE n bigint; BEGIN SELECT count(*) INTO n FROM storage.objects WHERE bucket_id='shop-media'; IF n <> 10 THEN RAISE EXCEPTION 'Public read count mismatch %',n; END IF; END $test$",{role:'anon',user:''});
 test('Branding source to product move denied',`UPDATE storage.objects SET name='${A}/products/${products.draft}/moved-brand.png' WHERE name='${A}/branding/logo/existing.png'`,{rows:0});
 test('Review-pending source move denied',`UPDATE storage.objects SET name='${A}/products/${products.draft}/moved-pending.png' WHERE name='${A}/products/${products.under_review}/existing.png'`,{rows:0});

 const forward=fs.readFileSync(path.join(__dirname,'../migrations/20261014175833_closure_shop_media_source_policy.sql'),'utf8');
 const rollback=fs.readFileSync(path.join(__dirname,'storage-source-rollback.sql'),'utf8');
 function check(name,value){report.checks.push({name,pass:!!value});if(!value)throw Error(name);}
 const allowed=['draft','changes_required','rejected','approved'];
 for(const source of states)for(const dest of allowed)test('Source matrix '+source+' -> '+dest,`UPDATE storage.objects SET name='${A}/products/${products[dest]}/matrix.png' WHERE name='${A}/products/${products[source]}/existing.png'`,{rows:allowed.includes(source)?1:0});
 for(const dest of ['under_review','suspended','archived'])test('Destination state denied '+dest,`UPDATE storage.objects SET name='${A}/products/${products[dest]}/matrix.png' WHERE name='${A}/products/${products.draft}/existing.png'`,{denied:true});
 for(const actor of [{user:UB},{user:EMP},{user:'',role:'anon'},{user:''}]) {
  test('Unauthorized actor UPDATE '+JSON.stringify(actor),`UPDATE storage.objects SET metadata='{}' WHERE name='${A}/products/${products.draft}/existing.png'`,{...actor,rows:0});
  test('Unauthorized actor DELETE '+JSON.stringify(actor),`DELETE FROM storage.objects WHERE name='${A}/products/${products.draft}/existing.png'`,{...actor,rows:0});
 }
 test('Seller B own product update',`UPDATE storage.objects SET metadata='{}' WHERE name='${B}/products/${BP}/existing.png'`,{user:UB,rows:1});
 test('Seller B own product insert',insert(B+'/products/'+BP+'/new.png','shop-media',UB),{user:UB});
 test('Seller B own product delete',`DELETE FROM storage.objects WHERE name='${B}/products/${BP}/existing.png'`,{user:UB,rows:1});
 must(`INSERT INTO storage.objects(bucket_id,name,owner_id) VALUES('shop-media','${B}/products/${BP}/uploader-a.png','${UA}'),('shop-media','${A}/products/${BP}/mismatch.png','${UA}')`);
 for(const name of [B+'/products/'+BP+'/uploader-a.png',A+'/products/'+BP+'/mismatch.png'])test('Invalid source ownership/product '+name,`UPDATE storage.objects SET name='${A}/products/${products.draft}/move.png' WHERE name='${name}'`,{rows:0});
 for(const name of [A+'/branding/logo/move.png','malformed.png',A+'/products/'+BP+'/move.png'])test('Invalid destination '+name,`UPDATE storage.objects SET name='${name}' WHERE name='${A}/products/${products.draft}/existing.png'`,{denied:true});
 test('Cross-bucket update rejected',`UPDATE storage.objects SET bucket_id='other' WHERE name='${A}/products/${products.draft}/existing.png'`,{denied:true});
 check('Repeated application rejects drift',run(forward).status!==0);
 must('CREATE POLICY unexpected_fixture_grant ON storage.objects FOR INSERT TO authenticated WITH CHECK(true)');
 check('Rollback drift guard',run(rollback).status!==0);
 must('DROP POLICY unexpected_fixture_grant ON storage.objects');
 must(rollback);check('Rollback restores exact prior production policy snapshot',JSON.stringify(snapshot())===JSON.stringify(baseline));
 must('CREATE POLICY unexpected_fixture_grant ON storage.objects FOR INSERT TO authenticated WITH CHECK(true)');
 check('Forward drift guard',run(forward).status!==0);
 must('DROP POLICY unexpected_fixture_grant ON storage.objects');
 must(forward);check('Reapply matches repaired snapshot',JSON.stringify(snapshot())===JSON.stringify(repaired));
 check('Other 33 policies unchanged',JSON.stringify(baseline.filter(p=>p.policyname!=='creator_commerce_shop_media_seller_update'))===JSON.stringify(repaired.filter(p=>p.policyname!=='creator_commerce_shop_media_seller_update')));
 report.status='PASS';
}catch(e){report.status='FAIL';report.failure=e.message;process.exitCode=1;}
fs.writeFileSync(path.join(__dirname,'closure-storage-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
