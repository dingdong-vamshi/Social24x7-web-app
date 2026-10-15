// Focused LOCAL replicas of the live author DELETE and visibility SELECT policies
// inspected on kcuxyxqtfkxrbtmugjsn, 2026-10-15. No production mutations.
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const args=['-X','-qAt','-v','ON_ERROR_STOP=1','-h','/tmp/social-storage-policy-qa.Xjwgqi','-p','55439','-d','social_deletion_qa','-f','-'];
const sql=q=>execFileSync('/opt/homebrew/bin/psql',args,{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
sql(`create schema auth;create schema private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function private.is_business_work_identity() returns boolean language sql stable as $$select coalesce(current_setting('qa.work',true),'false')='true'$$;
grant usage on schema auth,private to authenticated,anon;
create table posts(id uuid primary key,author_id uuid,visibility text);
create table post_comments(id uuid primary key,post_id uuid references posts on delete cascade,author_id uuid,body text);
create table stories(id uuid primary key,author_id uuid,visibility text,expires_at timestamptz);
create table follows(follower_id uuid,following_id uuid);
alter table posts enable row level security;alter table post_comments enable row level security;alter table stories enable row level security;
grant select on posts,post_comments,stories,follows to authenticated,anon;
grant insert,delete on posts,post_comments,stories to authenticated;
create policy "social posts public feed" on posts for select using(visibility='public' or author_id=(select auth.uid()));
create policy "posts_business_work_isolation" on posts as restrictive for select to authenticated using(not private.is_business_work_identity());
create policy "social posts author delete" on posts for delete to authenticated using(author_id=(select auth.uid()));
create policy "social comments readable" on post_comments for select using(exists(select 1 from posts p where p.id=post_comments.post_id and (p.visibility='public' or p.author_id=(select auth.uid()))));
create policy "social comments author insert" on post_comments for insert to authenticated with check(author_id=(select auth.uid()));
create policy "social comments author delete" on post_comments for delete to authenticated using(author_id=(select auth.uid()));
create policy "social active stories readable" on stories for select using(expires_at>now() and (visibility='public' or author_id=(select auth.uid()) or (visibility='followers' and exists(select 1 from follows f where f.follower_id=(select auth.uid()) and f.following_id=stories.author_id))));
create policy "social stories author delete" on stories for delete to authenticated using(author_id=(select auth.uid()));
insert into posts values('${a}','${a}','public'),('${b}','${b}','public');
insert into post_comments values('${a}','${b}','${a}','Disposable synthetic comment'),('${b}','${b}','${b}','Other identity');
insert into stories values('${a}','${a}','public',now()+interval '1 day'),('${b}','${b}','public',now()+interval '1 day');`);
const as=(actor,q)=>sql(`set role authenticated;set request.jwt.claim.sub='${actor}';${q}`);
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
for(const table of ['posts','post_comments','stories']){
 check(table+': foreign author cannot delete',()=>assert.equal(as(b,`delete from ${table} where id='${a}' returning id`),''));
 check(table+': anonymous cannot delete',()=>assert.throws(()=>sql(`set role anon;delete from ${table} where id='${a}' returning id`)));
 check(table+': author can delete and acknowledge exact row',()=>assert.equal(as(a,`delete from ${table} where id='${a}' returning id`),a));
 check(table+': repeated delete cannot report affected row',()=>assert.equal(as(a,`delete from ${table} where id='${a}' returning id`),''));
}
check('Comment write uses authenticated author and survives readback',()=>{as(a,`insert into post_comments values('${a}','${b}','${a}','Isolated readback')`);assert.equal(as(a,`select body from post_comments where id='${a}'`),'Isolated readback')});
check('Forged comment author is rejected',()=>assert.throws(()=>as(a,`insert into post_comments values('33333333-3333-4333-8333-333333333333','${b}','${b}','forged')`)));
check('Canonical count changes after own comment deletion',()=>{assert.equal(as(a,`select count(*) from post_comments where post_id='${b}'`),'2');as(a,`delete from post_comments where id='${a}'`);assert.equal(as(a,`select count(*) from post_comments where post_id='${b}'`),'1')});
console.log('TOTAL '+count+' isolated Social policy checks passed');
