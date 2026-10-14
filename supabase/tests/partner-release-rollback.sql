-- MANUAL INCIDENT PROCEDURE ONLY. First roll the web app back to c055fd2 and
-- disable/delete the newly introduced partner-login Edge Function.
-- Preserves the rate-limit table and consent guard. Do not remove the guard:
-- doing so would restore a proven pre-accepted-request/identity-forgery flaw.
-- These names did not exist before this release; no CASCADE and no user data
-- deletion. Apply only after checking the live function definitions for drift.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
revoke execute on function public.resolve_partner_login(text,text) from service_role;
revoke execute on function private.resolve_partner_login(text,text) from service_role;
revoke execute on function public.get_partner_display_names(uuid[]) from authenticated;
revoke execute on function private.get_partner_display_names(uuid[]) from authenticated;
revoke execute on function public.search_partner_chat_usernames(text) from authenticated;
revoke execute on function private.search_partner_chat_usernames(text) from authenticated;
revoke execute on function public.partner_chat_request(uuid,text) from authenticated;
revoke execute on function private.partner_chat_request(uuid,text) from authenticated;
revoke execute on function public.list_partner_chat_requests() from authenticated;
revoke execute on function private.list_partner_chat_requests() from authenticated;
commit;
