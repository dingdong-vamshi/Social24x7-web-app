-- Only this NEW foundation is removed. Run only after disabling/removing its HTTP adapter.
-- Private challenges are ephemeral; snapshot first if approval audit evidence is needed.
begin;
set local lock_timeout='5s';
drop function public.customer_pairing_transition(uuid,text,text,uuid);
drop function public.customer_pairing_create(uuid,text,text,text,text);
drop table private.customer_pairing_challenges;
commit;
