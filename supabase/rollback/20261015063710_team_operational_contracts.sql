-- Reviewed additive-API rollback. Does not erase messages, decisions or audit history.
-- Disable team-media-link/team-invitation-email deployments separately if needed.
begin;
set local lock_timeout = '5s';
drop function if exists public.get_storefront_team_recorded_history(uuid);
drop function if exists public.get_business_shared_content(uuid,uuid,uuid);
drop function if exists public.list_business_share_options(uuid,text);
drop function if exists public.send_business_employee_share(uuid,text,uuid,uuid);
drop function if exists public.list_business_customer_returns(uuid);
drop function if exists public.review_business_customer_return(uuid,uuid,text,text);
drop function if exists private.team_recorded_history(uuid);
drop function if exists private.team_shared_content(uuid,uuid,uuid);
drop function if exists private.team_share_options(uuid,text);
drop function if exists private.team_send_share(uuid,text,uuid,uuid);
drop function if exists private.team_return_options(uuid);
drop function if exists private.team_review_return(uuid,uuid,text,text);
drop function if exists private.team_read_scope(uuid,uuid);
drop function if exists private.team_work_actor(uuid,text);
commit;
