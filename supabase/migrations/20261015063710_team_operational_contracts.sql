-- REVIEW REQUIRED BEFORE PRODUCTION. Additive APIs; no table/RLS grants changed.
-- Public invoker wrappers expose private, explicitly authorized implementations.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create function private.team_read_scope(p_store uuid, p_conversation uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.conversations c
    join public.business_conversation_assignments a on a.conversation_id=c.id and a.storefront_id=c.storefront_id
    join public.storefronts s on s.id=c.storefront_id
    where c.id=p_conversation and s.id=p_store and c.kind='business' and c.business_context='buyer_seller'
      and s.active and s.verification_status='approved'
      and (s.owner_id=auth.uid() or exists (
        select 1 from public.storefront_team_memberships m
        where m.storefront_id=s.id and m.auth_user_id=auth.uid() and m.identity_kind='work' and m.status='verified'
          and (m.id=a.assignee_membership_id or private.storefront_team_member_permission(m.id,'business_chat_monitor'))
      ))
  );
$$;

create function private.team_work_actor(p_conversation uuid, p_permission text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare actor uuid;
begin
  if auth.uid() is null then raise exception 'Work access required.' using errcode='42501'; end if;
  select m.id into actor from public.conversations c
  join public.business_conversation_assignments a on a.conversation_id=c.id and a.storefront_id=c.storefront_id
  join public.storefront_team_memberships m on m.id=a.assignee_membership_id and m.storefront_id=a.storefront_id
  join public.storefronts s on s.id=a.storefront_id
  where c.id=p_conversation and c.kind='business' and c.business_context='buyer_seller'
    and a.status='open' and m.auth_user_id=auth.uid() and m.identity_kind='work' and m.status='verified'
    and s.active and s.verification_status='approved'
    and private.storefront_team_member_permission(m.id,p_permission);
  if actor is null then raise exception 'Current verified assignment and permission required.' using errcode='42501'; end if;
  return actor;
end;
$$;

create function private.team_recorded_history(p_store uuid)
returns table(membership_id uuid, recorded_lifetime_chats bigint, first_recorded_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not (private.storefront_team_permission(p_store,'business_team_manage') or private.storefront_team_permission(p_store,'business_chat_monitor')) then
    raise exception 'Supervisor permission required.' using errcode='42501';
  end if;
  return query
  with history as (
    select a.assignee_membership_id as member_id,a.conversation_id,a.assigned_at as recorded_at
    from public.business_conversation_assignments a where a.storefront_id=p_store
    union all
    select e.assignee_membership_id,e.conversation_id,e.created_at from public.business_conversation_assignment_events e where e.storefront_id=p_store
    union all
    select e.previous_assignee_membership_id,e.conversation_id,e.created_at from public.business_conversation_assignment_events e where e.storefront_id=p_store
  )
  select m.id,count(distinct h.conversation_id),min(h.recorded_at)
  from public.storefront_team_memberships m left join history h on h.member_id=m.id
  where m.storefront_id=p_store group by m.id;
end;
$$;

create function public.get_storefront_team_recorded_history(target_storefront uuid)
returns table(membership_id uuid, recorded_lifetime_chats bigint, first_recorded_at timestamptz)
language sql stable security invoker set search_path = '' as $$select * from private.team_recorded_history(target_storefront)$$;

create function private.team_shared_content(p_store uuid,p_conversation uuid,p_message uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare m public.messages; a public.chat_attachments; product public.products; result jsonb; identifier uuid;
begin
  if not private.team_read_scope(p_store,p_conversation) then raise exception 'Conversation access denied.' using errcode='42501'; end if;
  select * into m from public.messages where id=p_message and conversation_id=p_conversation and deleted_at is null and (expires_at is null or expires_at>now());
  if not found then raise exception 'Shared content is unavailable.' using errcode='P0002'; end if;
  if (m.payload->>'attachment_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select * into a from public.chat_attachments where id=(m.payload->>'attachment_id')::uuid and conversation_id=p_conversation and status='finalized';
    if not found or a.storage_bucket<>'chat-media' or split_part(a.storage_path,'/',1)<>p_conversation::text
      or a.storage_path ~ '(^|/)(\.{1,2})(/|$)|[:\\?#%]' or a.storage_path like '%//%' then
      raise exception 'Attachment unavailable.' using errcode='42501';
    end if;
    return jsonb_build_object('type','attachment','path',a.storage_path,'bucket',a.storage_bucket,'filename',a.original_filename,'mime',a.mime_type);
  elsif m.kind='order' and m.payload->>'storefront_id'=p_store::text and exists (
    select 1 from public.orders o join public.conversations c on c.id=p_conversation
    where o.id::text=m.payload->>'order_id' and o.storefront_id=p_store and o.customer_id=c.business_customer_id
  ) then
    return jsonb_build_object('type','order','id',m.payload->>'order_id','status',m.payload->>'order_status','items',coalesce((
      select jsonb_agg(jsonb_build_object('title',coalesce(item->>'product_title_snapshot',item->>'title',item->>'product_title','Order item'),'quantity',item->'quantity'))
      from (select value as item from jsonb_array_elements(case when jsonb_typeof(m.payload->'items')='array' then m.payload->'items' else '[]'::jsonb end) limit 100) items
    ),'[]'::jsonb));
  elsif m.kind='product' then
    if jsonb_typeof(m.payload->'post')='object' then
      return jsonb_build_object('type','post','caption',left(m.payload->'post'->>'caption',5000));
    end if;
    if coalesce(m.payload->>'product_id',m.payload->'product'->>'id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      identifier:=coalesce(m.payload->>'product_id',m.payload->'product'->>'id')::uuid;
      select * into product from public.products where id=identifier and storefront_id=p_store;
      if found then return jsonb_build_object('type','product','title',product.title,'priceMinor',coalesce(product.sale_price_minor,product.price_minor),'currency',product.currency); end if;
    end if;
  elsif m.kind='contact' then
    return jsonb_build_object('type','detail','title','Shared contact','lines',jsonb_build_array(left(m.payload->>'display_name',200),left(m.payload->>'username',100)));
  elsif m.kind='location' then
    return jsonb_build_object('type','detail','title','Shared location','lines',jsonb_build_array(left(m.payload->>'name',300),left(m.payload->>'address',1000),left(m.payload->>'latitude',30),left(m.payload->>'longitude',30)));
  elsif m.kind='poll' then
    select jsonb_build_object('type','detail','title',p.question,'lines',coalesce((select jsonb_agg(o.label order by o.position) from public.chat_poll_options o where o.poll_id=p.id),'[]'::jsonb)) into result
    from public.chat_polls p where p.id::text=m.payload->>'poll_id' and p.conversation_id=p_conversation and p.message_id=m.id;
    if result is not null then return result; end if;
  elsif m.kind='event' then
    select jsonb_build_object('type','detail','title',e.title,'lines',jsonb_build_array(e.starts_at,e.location,e.description)) into result
    from public.chat_events e where e.id::text=m.payload->>'event_id' and e.conversation_id=p_conversation and e.message_id=m.id;
    if result is not null then return result; end if;
  elsif m.kind in ('text','system') then
    return jsonb_build_object('type','detail','title','Conversation message','lines',jsonb_build_array(m.body));
  end if;
  raise exception 'This legacy shared-content format is unavailable.' using errcode='22023';
end;
$$;

create function public.get_business_shared_content(target_storefront uuid,target_conversation uuid,target_message uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$select private.team_shared_content(target_storefront,target_conversation,target_message)$$;

create function private.team_share_options(p_conversation uuid,p_kind text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.conversations;
begin
  perform private.team_work_actor(p_conversation,'business_share_products_orders');
  select * into c from public.conversations where id=p_conversation;
  if p_kind='product' then
    return coalesce((select jsonb_agg(x) from (select id,title,coalesce(sale_price_minor,price_minor) as price_minor,currency from public.products where storefront_id=c.storefront_id and status='active' and product_approval_status='approved' order by title,id limit 100) x),'[]'::jsonb);
  elsif p_kind='order' then
    return coalesce((select jsonb_agg(x) from (select id,status,created_at from public.orders where storefront_id=c.storefront_id and customer_id=c.business_customer_id and status<>'draft' order by created_at desc,id limit 100)x),'[]'::jsonb);
  end if;
  raise exception 'Choose product or order.' using errcode='22023';
end;
$$;
create function public.list_business_share_options(target_conversation uuid,share_kind text)
returns jsonb language sql stable security invoker set search_path = '' as $$select private.team_share_options(target_conversation,share_kind)$$;

create function private.team_send_share(p_conversation uuid,p_kind text,p_record uuid,p_client uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid; c public.conversations; item public.products; o public.orders; payload jsonb; body text; prior public.messages; result uuid;
begin
  if p_client is null or p_record is null or p_kind is null or p_kind not in ('product','order') then raise exception 'Valid share and retry identifiers required.' using errcode='22023'; end if;
  -- Fail fast on competing lifecycle locks; legacy APIs acquire these in differing orders.
  perform 1 from public.business_conversation_assignments where conversation_id=p_conversation for update nowait;
  actor:=private.team_work_actor(p_conversation,'business_share_products_orders');
  perform 1 from public.storefront_team_memberships where id=actor for share nowait;
  perform 1 from public.storefront_team_roles where id=(select role_id from public.storefront_team_memberships where id=actor) for share nowait;
  perform 1 from public.storefronts where id=(select storefront_id from public.storefront_team_memberships where id=actor) for share nowait;
  actor:=private.team_work_actor(p_conversation,'business_share_products_orders');
  select * into c from public.conversations where id=p_conversation;
  select * into prior from public.messages where client_id=p_client;
  if found then
    if prior.conversation_id=p_conversation and prior.sender_id=auth.uid() and prior.kind::text=p_kind
      and prior.payload->>'share_record_id'=p_record::text and prior.deleted_at is null then return prior.id; end if;
    raise exception 'Retry identifier belongs to a different action.' using errcode='23505';
  end if;
  if p_kind='product' then
    select * into item from public.products where id=p_record and storefront_id=c.storefront_id and status='active' and product_approval_status='approved' for share;
    if not found then raise exception 'Company product unavailable.' using errcode='42501'; end if;
    body:=item.title;
    payload:=jsonb_build_object('version',1,'product_id',item.id,'product',jsonb_build_object('id',item.id,'title',item.title,'price_minor',coalesce(item.sale_price_minor,item.price_minor),'currency',item.currency),'storefront_id',c.storefront_id,'share_record_id',p_record);
  else
    select * into o from public.orders where id=p_record and storefront_id=c.storefront_id and customer_id=c.business_customer_id and status<>'draft' for share;
    if not found then raise exception 'Order does not belong to this customer and company.' using errcode='42501'; end if;
    body:='Shared order';
    payload:=jsonb_build_object('version',1,'order_id',o.id,'storefront_id',o.storefront_id,'order_status',o.status,'event_type','employee_shared','share_record_id',p_record,'items',coalesce((
      select jsonb_agg(jsonb_build_object('product_title_snapshot',i.product_title_snapshot,'quantity',i.quantity)) from public.order_items i where i.order_id=o.id and i.storefront_id=o.storefront_id and i.buyer_id=o.customer_id
    ),'[]'::jsonb));
  end if;
  payload:=private.business_representative_payload(auth.uid(),p_conversation,payload);
  insert into public.messages(conversation_id,sender_id,kind,body,payload,client_id) values(p_conversation,auth.uid(),p_kind::public.message_kind,body,payload,p_client) returning id into result;
  update public.conversations set updated_at=now() where id=p_conversation;
  return result;
end;
$$;
create function public.send_business_employee_share(target_conversation uuid,share_kind text,target_record uuid,message_client_id uuid)
returns uuid language sql security invoker set search_path = '' as $$select private.team_send_share(target_conversation,share_kind,target_record,message_client_id)$$;

create function private.team_return_options(p_conversation uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.conversations;
begin
  perform private.team_work_actor(p_conversation,'business_returns_refunds');
  select * into c from public.conversations where id=p_conversation;
  return coalesce((select jsonb_agg(x) from (select r.id,r.order_id,r.status,r.reason,r.requested_at,i.product_title_snapshot as title
    from public.return_requests r join public.order_items i on i.id=r.order_item_id and i.order_id=r.order_id
    join public.orders o on o.id=r.order_id and o.storefront_id=r.storefront_id
    where r.storefront_id=c.storefront_id and r.buyer_id=c.business_customer_id and o.customer_id=c.business_customer_id
      and i.storefront_id=c.storefront_id and i.buyer_id=c.business_customer_id
    order by r.requested_at desc,r.id limit 100) x),'[]'::jsonb);
end;
$$;
create function public.list_business_customer_returns(target_conversation uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$select private.team_return_options(target_conversation)$$;

create function private.team_review_return(p_conversation uuid,p_return uuid,p_decision text,p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid; c public.conversations; r public.return_requests; i public.order_items;
begin
  if p_decision not in ('under_review','approved','rejected') or p_decision is null or length(coalesce(p_reason,''))>1000 then raise exception 'Choose a return review decision and a note of at most 1000 characters.' using errcode='22023'; end if;
  perform 1 from public.business_conversation_assignments where conversation_id=p_conversation for update nowait;
  actor:=private.team_work_actor(p_conversation,'business_returns_refunds');
  perform 1 from public.storefront_team_memberships where id=actor for share nowait;
  perform 1 from public.storefront_team_roles where id=(select role_id from public.storefront_team_memberships where id=actor) for share nowait;
  perform 1 from public.storefronts where id=(select storefront_id from public.storefront_team_memberships where id=actor) for share nowait;
  actor:=private.team_work_actor(p_conversation,'business_returns_refunds');
  select * into c from public.conversations where id=p_conversation;
  select rr.* into r from public.return_requests rr join public.orders o on o.id=rr.order_id
    where rr.id=p_return and rr.storefront_id=c.storefront_id and rr.buyer_id=c.business_customer_id
      and o.storefront_id=c.storefront_id and o.customer_id=c.business_customer_id for update of rr;
  if not found then raise exception 'Return unavailable for this customer.' using errcode='42501'; end if;
  if r.status not in ('submitted','under_review') then raise exception 'Return request is already decided.' using errcode='22023'; end if;
  select * into i from public.order_items where id=r.order_item_id and order_id=r.order_id and storefront_id=c.storefront_id and buyer_id=c.business_customer_id for update;
  if not found then raise exception 'Return item mismatch.' using errcode='42501'; end if;
  -- Preserve the canonical Seller decision state machine and pending-external bookkeeping.
  -- This function cannot execute a payment, set provider references or mark a refund paid.
  update public.return_requests set status=p_decision,admin_note=nullif(btrim(coalesce(p_reason,'')),''),reviewed_by=auth.uid(),reviewed_at=case when p_decision='under_review' then null else now() end where id=r.id;
  if p_decision='approved' then
    insert into public.refund_requests(return_request_id,checkout_group_id,order_id,buyer_id,amount_minor,status,provider)
      values(r.id,i.checkout_group_id,i.order_id,i.buyer_id,i.subtotal_minor,'external_integration_pending','external_pending') on conflict do nothing;
    update public.order_items set commission_status='reversed' where id=i.id;
    update public.creator_commissions set status='reversed',reversal_reason=coalesce(nullif(btrim(p_reason),''),'Authorized employee approved return'),updated_at=now() where order_item_id=i.id;
    update public.orders set status='return_approved',updated_at=now() where id=i.order_id;
  elsif p_decision='rejected' then
    update public.order_items set commission_status=case when commission_minor>0 then 'confirmed' else 'none' end where id=i.id;
    update public.creator_commissions set status='confirmed',updated_at=now() where order_item_id=i.id and status='withheld';
    update public.orders set status='return_rejected',updated_at=now() where id=i.order_id;
  end if;
  return jsonb_build_object('id',r.id,'status',p_decision,'moneyTransferred',false,'refundProcessing',case when p_decision='approved' then 'external_integration_pending' else 'not_requested' end);
end;
$$;
create function public.review_business_customer_return(target_conversation uuid,target_return uuid,decision text,review_note text default null)
returns jsonb language sql security invoker set search_path = '' as $$select private.team_review_return(target_conversation,target_return,decision,review_note)$$;

-- No new table SELECT/INSERT/UPDATE or Storage policies. Restrict every new API.
revoke all on function private.team_read_scope(uuid,uuid),private.team_work_actor(uuid,text),private.team_recorded_history(uuid),private.team_shared_content(uuid,uuid,uuid),private.team_share_options(uuid,text),private.team_send_share(uuid,text,uuid,uuid),private.team_return_options(uuid),private.team_review_return(uuid,uuid,text,text) from public,anon;
revoke all on function public.get_storefront_team_recorded_history(uuid),public.get_business_shared_content(uuid,uuid,uuid),public.list_business_share_options(uuid,text),public.send_business_employee_share(uuid,text,uuid,uuid),public.list_business_customer_returns(uuid),public.review_business_customer_return(uuid,uuid,text,text) from public,anon;
grant execute on function private.team_recorded_history(uuid),private.team_shared_content(uuid,uuid,uuid),private.team_share_options(uuid,text),private.team_send_share(uuid,text,uuid,uuid),private.team_return_options(uuid),private.team_review_return(uuid,uuid,text,text) to authenticated;
grant execute on function public.get_storefront_team_recorded_history(uuid),public.get_business_shared_content(uuid,uuid,uuid),public.list_business_share_options(uuid,text),public.send_business_employee_share(uuid,text,uuid,uuid),public.list_business_customer_returns(uuid),public.review_business_customer_return(uuid,uuid,text,text) to authenticated;
commit;
