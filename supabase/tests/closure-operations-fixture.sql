-- ISOLATED RPC CONTRACT FIXTURE ONLY. Never apply to Supabase.
-- Catalog snapshot: kcuxyxqtfkxrbtmugjsn, 2026-10-14.
-- Exact selected function bodies, column/default definitions and CHECK/PK/UNIQUE constraints.
-- No production records. Auth users below are synthetic. This is not a full RLS/trigger/Storage server replica.
CREATE SCHEMA auth;
CREATE SCHEMA private;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
CREATE TABLE auth.users(id uuid PRIMARY KEY, raw_app_meta_data jsonb);
GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
SET check_function_bodies = off;
create type public.business_conversation_work_status as enum ('open','resolved');
create type public.buyer_kyc_status as enum ('not_submitted','submitted','under_review','verified','rejected','more_information_required','suspended');
create type public.commerce_approval_status as enum ('not_applied','draft','submitted','under_review','approved','rejected','more_information_required','suspended');
create type public.conversation_kind as enum ('personal','business','group','support');
create type public.message_kind as enum ('text','image','file','voice','product','cart','order','system','video','location','contact','poll','event');
create type public.order_status as enum ('draft','placed','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','return_requested','refunded');
create type public.role_kind as enum ('consumer','seller','creator','professional','support','moderator','verifier','finance','admin');
create type public.storefront_team_member_status as enum ('not_activated','awaiting_approval','verified','suspended','removed');
create type public.verification_status as enum ('draft','submitted','automated_review','manual_review','approved','rejected','suspended','expired');
create table public.business_conversation_assignment_events (id uuid not null default gen_random_uuid(), conversation_id uuid not null, storefront_id uuid not null, previous_assignee_membership_id uuid, assignee_membership_id uuid, actor_user_id uuid, event_type text not null, created_at timestamp with time zone not null default now());
create table public.business_conversation_assignments (conversation_id uuid not null, storefront_id uuid not null, assignee_membership_id uuid, status business_conversation_work_status not null default 'open'::business_conversation_work_status, assigned_by uuid, assigned_at timestamp with time zone, resolved_by uuid, resolved_at timestamp with time zone, version bigint not null default 1, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.commerce_order_evidence (id uuid not null default gen_random_uuid(), owner_id uuid not null, order_id uuid, order_item_id uuid, evidence_kind text not null, storage_path text not null, file_name text, mime_type text, file_size integer, created_at timestamp with time zone not null default now(), evidence_source text not null default 'uploaded_file'::text, return_request_id uuid, captured_at timestamp with time zone);
create table public.conversation_participants (conversation_id uuid not null, user_id uuid not null, joined_at timestamp with time zone not null default now(), last_read_at timestamp with time zone, muted boolean not null default false, archived_at timestamp with time zone, manually_unread_at timestamp with time zone, pinned_at timestamp with time zone, cleared_at timestamp with time zone, member_role text not null default 'member'::text);
create table public.conversations (id uuid not null default gen_random_uuid(), kind conversation_kind not null default 'personal'::conversation_kind, storefront_id uuid, created_by uuid not null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), business_customer_id uuid, title text, image_path text, business_context text);
create table public.creator_commerce_access (user_id uuid not null, seller_status commerce_approval_status not null default 'not_applied'::commerce_approval_status, creator_status commerce_approval_status not null default 'not_applied'::commerce_approval_status, professional_status commerce_approval_status not null default 'not_applied'::commerce_approval_status, buyer_kyc_status buyer_kyc_status not null default 'not_submitted'::buyer_kyc_status, admin_access boolean not null default false, reviewed_by uuid, reviewed_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.creator_commissions (id uuid not null default gen_random_uuid(), creator_id uuid not null, seller_id uuid not null, storefront_id uuid not null, product_id uuid, promotion_id uuid, promotion_click_id uuid, checkout_group_id uuid not null, order_id uuid not null, order_item_id uuid not null, eligible_item_minor integer not null, commission_bps_snapshot integer not null, commission_minor integer not null, status text not null default 'pending'::text, confirmed_at timestamp with time zone, eligible_at timestamp with time zone, payout_requested_at timestamp with time zone, paid_at timestamp with time zone, reversal_reason text, external_integration_status text not null default 'EXTERNAL INTEGRATION PENDING'::text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.messages (id uuid not null default gen_random_uuid(), conversation_id uuid not null, sender_id uuid, kind message_kind not null default 'text'::message_kind, body text, payload jsonb not null default '{}'::jsonb, client_id uuid, created_at timestamp with time zone not null default now(), edited_at timestamp with time zone, deleted_at timestamp with time zone, expires_at timestamp with time zone);
create table public.order_events (id uuid not null default gen_random_uuid(), order_id uuid not null, actor_id uuid, status text not null, detail text not null default ''::text, created_at timestamp with time zone not null default now());
create table public.order_fulfillments (order_id uuid not null, status text not null default 'confirmed'::text, carrier text not null default ''::text, tracking_number text not null default ''::text, package_reference text not null default ''::text, customer_note text not null default ''::text, updated_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.order_items (id uuid not null default gen_random_uuid(), order_id uuid not null, checkout_group_id uuid not null, buyer_id uuid not null, storefront_id uuid not null, seller_id uuid not null, product_id uuid, product_title_snapshot text not null, product_slug_snapshot text not null, storefront_name_snapshot text not null, unit_price_minor integer not null, quantity integer not null, subtotal_minor integer not null, promotion_id uuid, promotion_click_id uuid, creator_id uuid, commission_bps_snapshot integer not null default 0, commission_minor integer not null default 0, commission_status text not null default 'none'::text, return_window_ends_at timestamp with time zone, created_at timestamp with time zone not null default now());
create table public.orders (id uuid not null default gen_random_uuid(), customer_id uuid not null, storefront_id uuid not null, status text not null default 'draft'::text, currency character(3) not null default 'INR'::bpchar, subtotal_minor integer not null, total_minor integer not null, payment_method text not null, payment_status text not null default 'not_configured'::text, idempotency_key uuid not null, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), checkout_group_id uuid, delivery_address_snapshot jsonb not null default '{}'::jsonb, platform_fee_minor integer not null default 0, delivered_at timestamp with time zone, external_integration_status text not null default 'EXTERNAL INTEGRATION PENDING'::text);
create table public.product_media (id uuid not null default gen_random_uuid(), product_id uuid not null, path text not null, media_type text not null default 'image'::text, alt_text text not null default ''::text, "position" integer not null default 0, is_primary boolean not null default false, created_at timestamp with time zone not null default now(), storage_bucket text not null default 'shop-media'::text, moderation_state text not null default 'public'::text, original_filename text, mime_type text, bytes integer, width integer, height integer);
create table public.products (id uuid not null default gen_random_uuid(), storefront_id uuid not null, title text not null, slug text not null, brand text not null default ''::text, category text not null, short_description text not null default ''::text, description text not null default ''::text, sku text not null default ''::text, price_minor integer not null, currency character(3) not null default 'INR'::bpchar, inventory integer not null default 0, status text not null default 'draft'::text, cover_path text, tags text[] not null default '{}'::text[], search_keywords text[] not null default '{}'::text[], attributes jsonb not null default '{}'::jsonb, seo_title text, seo_description text, llm_summary text, featured boolean not null default false, published_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), indexable boolean not null default true, geo_enabled boolean not null default true, sale_price_minor integer, inventory_reserved integer not null default 0, fulfillment_type text not null default 'seller_self_fulfilled'::text, return_window_days integer not null default 7, creator_promotion_enabled boolean not null default false, creator_commission_bps integer not null default 0, product_approval_status text not null default 'draft'::text, approval_requested_at timestamp with time zone, reviewed_by uuid, reviewed_at timestamp with time zone, review_note text, suspended_at timestamp with time zone, archived_at timestamp with time zone, external_integration_status text not null default 'EXTERNAL INTEGRATION PENDING'::text);
create table public.refund_requests (id uuid not null default gen_random_uuid(), return_request_id uuid not null, checkout_group_id uuid not null, order_id uuid not null, buyer_id uuid not null, amount_minor integer not null, status text not null default 'external_integration_pending'::text, provider text not null default 'external_pending'::text, provider_reference text, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.return_requests (id uuid not null default gen_random_uuid(), order_item_id uuid not null, order_id uuid not null, buyer_id uuid not null, seller_id uuid not null, storefront_id uuid not null, creator_id uuid, status text not null default 'submitted'::text, reason text not null, admin_note text, requested_at timestamp with time zone not null default now(), reviewed_by uuid, reviewed_at timestamp with time zone, details text);
create table public.storefront_members (storefront_id uuid not null, user_id uuid not null, permission text not null, created_at timestamp with time zone not null default now());
create table public.storefront_team_audit_events (id uuid not null default gen_random_uuid(), storefront_id uuid not null, membership_id uuid, actor_user_id uuid, event_type text not null, detail jsonb not null default '{}'::jsonb, created_at timestamp with time zone not null default now());
create table public.storefront_team_invitations (id uuid not null default gen_random_uuid(), membership_id uuid not null, code_hash text not null, expires_at timestamp with time zone not null, attempts integer not null default 0, max_attempts integer not null default 8, last_attempt_at timestamp with time zone, activation_claim_hash text, activation_claim_expires_at timestamp with time zone, consumed_at timestamp with time zone, revoked_at timestamp with time zone, created_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.storefront_team_member_permissions (membership_id uuid not null, permission_code text not null, allowed boolean not null, granted_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.storefront_team_memberships (id uuid not null default gen_random_uuid(), storefront_id uuid not null, auth_user_id uuid, role_id uuid not null, full_name text not null, verified_display_name text, work_email text not null, login_id text not null, customer_tagline text not null, job_title text not null, employee_id text, department text not null, status storefront_team_member_status not null default 'not_activated'::storefront_team_member_status, identity_kind text not null default 'work'::text, invited_by uuid, approved_by uuid, approved_at timestamp with time zone, activated_at timestamp with time zone, suspended_at timestamp with time zone, removed_at timestamp with time zone, last_seen_at timestamp with time zone, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.storefront_team_permissions (code text not null, label text not null, description text not null, created_at timestamp with time zone not null default now());
create table public.storefront_team_role_permissions (role_id uuid not null, permission_code text not null, created_at timestamp with time zone not null default now());
create table public.storefront_team_roles (id uuid not null default gen_random_uuid(), storefront_id uuid not null, name text not null, system_key text, description text not null default ''::text, is_system boolean not null default false, archived_at timestamp with time zone, created_by uuid, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now());
create table public.storefronts (id uuid not null default gen_random_uuid(), owner_id uuid not null, name text not null, slug text not null, tagline text not null default ''::text, description text not null default ''::text, seller_tier text not null default 'local'::text, verification_status text not null default 'approved'::text, business_type text not null default 'independent'::text, state_code text not null default ''::text, city text not null default ''::text, support_phone text not null default ''::text, support_email text not null default ''::text, primary_category text not null default 'Everyday'::text, logo_path text, banner_path text, seo_title text, seo_description text, llm_summary text, active boolean not null default true, featured boolean not null default false, created_at timestamp with time zone not null default now(), updated_at timestamp with time zone not null default now(), indexable boolean not null default true, geo_enabled boolean not null default true);
alter table public.business_conversation_assignment_events add constraint business_conversation_assignment_events_event_type_check CHECK ((event_type = ANY (ARRAY['assigned'::text, 'reassigned'::text, 'unassigned'::text, 'resolved'::text, 'reopened'::text])));
alter table public.business_conversation_assignment_events add constraint business_conversation_assignment_events_pkey PRIMARY KEY (id);
alter table public.business_conversation_assignments add constraint business_conversation_assignments_pkey PRIMARY KEY (conversation_id);
alter table public.commerce_order_evidence add constraint commerce_order_evidence_kind_check CHECK ((evidence_kind = ANY (ARRAY['packing'::text, 'handoff'::text, 'delivery'::text, 'unboxing'::text, 'return'::text, 'return_pickup'::text, 'return_received'::text])));
alter table public.commerce_order_evidence add constraint commerce_order_evidence_pkey PRIMARY KEY (id);
alter table public.commerce_order_evidence add constraint commerce_order_evidence_source_check CHECK ((evidence_source = ANY (ARRAY['live_capture'::text, 'uploaded_file'::text])));
alter table public.commerce_order_evidence add constraint commerce_order_evidence_storage_path_key UNIQUE (storage_path);
alter table public.conversation_participants add constraint conversation_participants_member_role_check CHECK ((member_role = ANY (ARRAY['member'::text, 'admin'::text])));
alter table public.conversation_participants add constraint conversation_participants_pkey PRIMARY KEY (conversation_id, user_id);
alter table public.conversations add constraint conversations_business_context_check CHECK ((((kind = 'business'::conversation_kind) AND (business_context = ANY (ARRAY['buyer_seller'::text, 'creator_seller'::text]))) OR ((kind <> 'business'::conversation_kind) AND (business_context IS NULL))));
alter table public.conversations add constraint conversations_business_identity_check CHECK ((((kind = 'business'::conversation_kind) AND (storefront_id IS NOT NULL) AND (business_customer_id IS NOT NULL)) OR ((kind <> 'business'::conversation_kind) AND (business_customer_id IS NULL))));
alter table public.conversations add constraint conversations_pkey PRIMARY KEY (id);
alter table public.creator_commerce_access add constraint creator_commerce_access_pkey PRIMARY KEY (user_id);
alter table public.creator_commissions add constraint creator_commissions_amount_check CHECK (((eligible_item_minor >= 0) AND (commission_minor >= 0)));
alter table public.creator_commissions add constraint creator_commissions_bps_check CHECK (((commission_bps_snapshot >= 500) AND (commission_bps_snapshot <= 7000)));
alter table public.creator_commissions add constraint creator_commissions_order_item_id_key UNIQUE (order_item_id);
alter table public.creator_commissions add constraint creator_commissions_pkey PRIMARY KEY (id);
alter table public.creator_commissions add constraint creator_commissions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'eligible'::text, 'payable'::text, 'paid'::text, 'withheld'::text, 'reversed'::text, 'cancelled'::text])));
alter table public.messages add constraint messages_authoritative_never_expire_check CHECK (((kind <> ALL (ARRAY['order'::message_kind, 'system'::message_kind])) OR (expires_at IS NULL)));
alter table public.messages add constraint messages_body_check CHECK ((char_length(body) <= 10000));
alter table public.messages add constraint messages_client_id_key UNIQUE (client_id);
alter table public.messages add constraint messages_pkey PRIMARY KEY (id);
alter table public.order_events add constraint order_events_detail_check CHECK ((char_length(detail) <= 1000));
alter table public.order_events add constraint order_events_pkey PRIMARY KEY (id);
alter table public.order_events add constraint order_events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'placed'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text, 'return_requested'::text, 'refunded'::text])));
alter table public.order_fulfillments add constraint order_fulfillments_carrier_check CHECK ((char_length(carrier) <= 120));
alter table public.order_fulfillments add constraint order_fulfillments_customer_note_check CHECK ((char_length(customer_note) <= 1000));
alter table public.order_fulfillments add constraint order_fulfillments_package_reference_check CHECK ((char_length(package_reference) <= 120));
alter table public.order_fulfillments add constraint order_fulfillments_pkey PRIMARY KEY (order_id);
alter table public.order_fulfillments add constraint order_fulfillments_status_check CHECK ((status = ANY (ARRAY['confirmed'::text, 'processing'::text, 'shipped'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text])));
alter table public.order_fulfillments add constraint order_fulfillments_tracking_number_check CHECK ((char_length(tracking_number) <= 160));
alter table public.order_items add constraint order_items_commission_status_check CHECK ((commission_status = ANY (ARRAY['none'::text, 'pending'::text, 'withheld'::text, 'reversed'::text, 'confirmed'::text, 'paid'::text])));
alter table public.order_items add constraint order_items_money_check CHECK (((unit_price_minor >= 0) AND (subtotal_minor >= 0) AND (commission_minor >= 0)));
alter table public.order_items add constraint order_items_pkey PRIMARY KEY (id);
alter table public.order_items add constraint order_items_quantity_check CHECK ((quantity > 0));
alter table public.orders add constraint orders_idempotency_key_key UNIQUE (idempotency_key);
alter table public.orders add constraint orders_payment_method_check CHECK ((payment_method = ANY (ARRAY['cod'::text, 'external'::text])));
alter table public.orders add constraint orders_pkey PRIMARY KEY (id);
alter table public.orders add constraint orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'placed'::text, 'confirmed'::text, 'processing'::text, 'shipped'::text, 'out_for_delivery'::text, 'delivered'::text, 'cancelled'::text, 'return_requested'::text, 'return_approved'::text, 'return_rejected'::text, 'refunded'::text])));
alter table public.orders add constraint orders_subtotal_minor_check CHECK ((subtotal_minor >= 0));
alter table public.orders add constraint orders_total_minor_check CHECK ((total_minor >= 0));
alter table public.product_media add constraint product_media_alt_text_check CHECK ((char_length(alt_text) <= 180));
alter table public.product_media add constraint product_media_bytes_check CHECK (((bytes IS NULL) OR ((bytes >= 1) AND (bytes <= 10485760))));
alter table public.product_media add constraint product_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])));
alter table public.product_media add constraint product_media_moderation_state_check CHECK ((moderation_state = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'public'::text])));
alter table public.product_media add constraint product_media_pkey PRIMARY KEY (id);
alter table public.product_media add constraint product_media_position_check CHECK ((("position" IS NULL) OR (("position" >= 0) AND ("position" <= 9))));
alter table public.product_media add constraint product_media_product_id_path_key UNIQUE (product_id, path);
alter table public.product_media add constraint product_media_storage_bucket_check CHECK ((storage_bucket = ANY (ARRAY['shop-media'::text, 'product-media'::text])));
alter table public.products add constraint products_brand_check CHECK ((char_length(brand) <= 120));
alter table public.products add constraint products_category_check CHECK ((category = ANY (ARRAY['Wellness'::text, 'Home'::text, 'Travel'::text, 'Everyday'::text])));
alter table public.products add constraint products_creator_commission_bps_check CHECK ((((creator_promotion_enabled = false) AND (creator_commission_bps = 0)) OR ((creator_promotion_enabled = true) AND ((creator_commission_bps >= 500) AND (creator_commission_bps <= 7000)))));
alter table public.products add constraint products_description_check CHECK ((char_length(description) <= 8000));
alter table public.products add constraint products_fulfillment_type_check CHECK ((fulfillment_type = ANY (ARRAY['seller_self_fulfilled'::text, 'external_3pl_pending'::text])));
alter table public.products add constraint products_inventory_check CHECK ((inventory >= 0));
alter table public.products add constraint products_inventory_reserved_check CHECK (((inventory_reserved >= 0) AND (inventory_reserved <= inventory)));
alter table public.products add constraint products_pkey PRIMARY KEY (id);
alter table public.products add constraint products_price_minor_check CHECK ((price_minor >= 0));
alter table public.products add constraint products_product_approval_status_check CHECK ((product_approval_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'under_review'::text, 'approved'::text, 'changes_required'::text, 'rejected'::text, 'suspended'::text, 'archived'::text])));
alter table public.products add constraint products_return_window_days_check CHECK (((return_window_days >= 0) AND (return_window_days <= 30)));
alter table public.products add constraint products_sale_price_minor_check CHECK (((sale_price_minor IS NULL) OR (sale_price_minor >= 0)));
alter table public.products add constraint products_short_description_check CHECK ((char_length(short_description) <= 180));
alter table public.products add constraint products_sku_check CHECK ((char_length(sku) <= 80));
alter table public.products add constraint products_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'::text));
alter table public.products add constraint products_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])));
alter table public.products add constraint products_storefront_id_sku_key UNIQUE (storefront_id, sku);
alter table public.products add constraint products_storefront_id_slug_key UNIQUE (storefront_id, slug);
alter table public.products add constraint products_title_check CHECK (((char_length(title) >= 2) AND (char_length(title) <= 180)));
alter table public.refund_requests add constraint refund_requests_amount_check CHECK ((amount_minor >= 0));
alter table public.refund_requests add constraint refund_requests_pkey PRIMARY KEY (id);
alter table public.refund_requests add constraint refund_requests_status_check CHECK ((status = ANY (ARRAY['external_integration_pending'::text, 'approved'::text, 'paid'::text, 'failed'::text, 'cancelled'::text])));
alter table public.return_requests add constraint return_requests_pkey PRIMARY KEY (id);
alter table public.return_requests add constraint return_requests_status_check CHECK ((status = ANY (ARRAY['submitted'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'received'::text, 'refunded'::text])));
alter table public.storefront_members add constraint storefront_members_permission_check CHECK ((permission = ANY (ARRAY['catalogue_editor'::text, 'order_manager'::text, 'chat_agent'::text, 'analyst'::text, 'finance_viewer'::text, 'admin'::text])));
alter table public.storefront_members add constraint storefront_members_pkey PRIMARY KEY (storefront_id, user_id, permission);
alter table public.storefront_team_audit_events add constraint storefront_team_audit_events_pkey PRIMARY KEY (id);
alter table public.storefront_team_audit_events add constraint storefront_team_audit_events_type_check CHECK ((event_type = ANY (ARRAY['invited'::text, 'activation_resent'::text, 'activated'::text, 'approved'::text, 'role_changed'::text, 'permissions_changed'::text, 'profile_updated'::text, 'assigned'::text, 'reassigned'::text, 'resolved'::text, 'reopened'::text, 'suspended'::text, 'removed'::text, 'reactivated'::text, 'role_created'::text, 'role_updated'::text, 'role_archived'::text])));
alter table public.storefront_team_invitations add constraint storefront_team_invitations_attempts_check CHECK (((attempts >= 0) AND ((max_attempts >= 3) AND (max_attempts <= 20))));
alter table public.storefront_team_invitations add constraint storefront_team_invitations_membership_id_key UNIQUE (membership_id);
alter table public.storefront_team_invitations add constraint storefront_team_invitations_pkey PRIMARY KEY (id);
alter table public.storefront_team_member_permissions add constraint storefront_team_member_permissions_pkey PRIMARY KEY (membership_id, permission_code);
alter table public.storefront_team_memberships add constraint storefront_team_memberships_email_check CHECK (((work_email = lower(btrim(work_email))) AND (POSITION(('@'::text) IN (work_email)) > 1)));
alter table public.storefront_team_memberships add constraint storefront_team_memberships_id_storefront_id_key UNIQUE (id, storefront_id);
alter table public.storefront_team_memberships add constraint storefront_team_memberships_identity_kind_check CHECK ((identity_kind = ANY (ARRAY['work'::text, 'owner_personal'::text])));
alter table public.storefront_team_memberships add constraint storefront_team_memberships_login_check CHECK (((login_id = lower(btrim(login_id))) AND (login_id ~ '^[a-z0-9][a-z0-9._-]{2,39}$'::text)));
alter table public.storefront_team_memberships add constraint storefront_team_memberships_name_check CHECK (((length(btrim(full_name)) >= 2) AND (length(btrim(full_name)) <= 100)));
alter table public.storefront_team_memberships add constraint storefront_team_memberships_owner_identity_check CHECK (((identity_kind <> 'owner_personal'::text) OR (status = 'verified'::storefront_team_member_status)));
alter table public.storefront_team_memberships add constraint storefront_team_memberships_pkey PRIMARY KEY (id);
alter table public.storefront_team_memberships add constraint storefront_team_memberships_storefront_id_auth_user_id_key UNIQUE (storefront_id, auth_user_id);
alter table public.storefront_team_memberships add constraint storefront_team_memberships_storefront_id_employee_id_key UNIQUE (storefront_id, employee_id);
alter table public.storefront_team_permissions add constraint storefront_team_permissions_code_check CHECK ((code ~ '^business_[a-z0-9_]+$'::text));
alter table public.storefront_team_permissions add constraint storefront_team_permissions_pkey PRIMARY KEY (code);
alter table public.storefront_team_role_permissions add constraint storefront_team_role_permissions_pkey PRIMARY KEY (role_id, permission_code);
alter table public.storefront_team_roles add constraint storefront_team_roles_id_storefront_id_key UNIQUE (id, storefront_id);
alter table public.storefront_team_roles add constraint storefront_team_roles_name_check CHECK (((length(btrim(name)) >= 2) AND (length(btrim(name)) <= 60)));
alter table public.storefront_team_roles add constraint storefront_team_roles_pkey PRIMARY KEY (id);
alter table public.storefront_team_roles add constraint storefront_team_roles_system_consistency_check CHECK (((is_system AND (system_key IS NOT NULL)) OR ((NOT is_system) AND (system_key IS NULL))));
alter table public.storefront_team_roles add constraint storefront_team_roles_system_key_check CHECK (((system_key IS NULL) OR (system_key = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text, 'agent'::text, 'sales'::text, 'support'::text]))));
alter table public.storefronts add constraint storefronts_city_check CHECK ((char_length(city) <= 80));
alter table public.storefronts add constraint storefronts_description_check CHECK ((char_length(description) <= 4000));
alter table public.storefronts add constraint storefronts_name_check CHECK (((char_length(name) >= 2) AND (char_length(name) <= 120)));
alter table public.storefronts add constraint storefronts_owner_id_key UNIQUE (owner_id);
alter table public.storefronts add constraint storefronts_pkey PRIMARY KEY (id);
alter table public.storefronts add constraint storefronts_primary_category_check CHECK ((primary_category = ANY (ARRAY['Wellness'::text, 'Home'::text, 'Travel'::text, 'Everyday'::text])));
alter table public.storefronts add constraint storefronts_seller_tier_check CHECK ((seller_tier = ANY (ARRAY['local'::text, 'gst'::text])));
alter table public.storefronts add constraint storefronts_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'::text));
alter table public.storefronts add constraint storefronts_slug_key UNIQUE (slug);
alter table public.storefronts add constraint storefronts_state_code_check CHECK ((char_length(state_code) <= 10));
alter table public.storefronts add constraint storefronts_support_email_check CHECK ((char_length(support_email) <= 120));
alter table public.storefronts add constraint storefronts_support_phone_check CHECK ((char_length(support_phone) <= 30));
alter table public.storefronts add constraint storefronts_tagline_check CHECK ((char_length(tagline) <= 140));
alter table public.storefronts add constraint storefronts_verification_status_check CHECK ((verification_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'suspended'::text])));
CREATE OR REPLACE FUNCTION private.is_business_work_identity()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'account_type', '') = 'business_employee';
$function$;

CREATE OR REPLACE FUNCTION private.normalize_business_login_id(value text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select lower(regexp_replace(btrim(coalesce(value, '')), '[^a-zA-Z0-9._-]+', '', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.claim_business_team_activation(p_login_id text, p_code text)
 RETURNS TABLE(membership_id uuid, storefront_id uuid, synthetic_email text, full_name text, claim_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  member public.storefront_team_memberships%rowtype;
  invitation public.storefront_team_invitations%rowtype;
  token text := gen_random_uuid()::text || encode(gen_random_bytes(16), 'hex');
begin
  select membership.* into member
  from public.storefront_team_memberships membership
  where membership.login_id = private.normalize_business_login_id(p_login_id)
    and membership.identity_kind = 'work'
  limit 1;
  if member.id is null or member.status <> 'not_activated' then return; end if;

  select * into invitation
  from public.storefront_team_invitations candidate
  where candidate.membership_id = member.id
  for update;
  if invitation.id is null
    or invitation.consumed_at is not null
    or invitation.revoked_at is not null
    or invitation.expires_at <= now()
    or invitation.attempts >= invitation.max_attempts then
    return;
  end if;

  if invitation.code_hash <> encode(digest(btrim(coalesce(p_code, '')), 'sha256'), 'hex') then
    update public.storefront_team_invitations
    set attempts = attempts + 1, last_attempt_at = now(), updated_at = now()
    where id = invitation.id;
    return;
  end if;

  update public.storefront_team_invitations
  set activation_claim_hash = encode(digest(token, 'sha256'), 'hex'),
      activation_claim_expires_at = now() + interval '5 minutes',
      last_attempt_at = now(),
      updated_at = now()
  where id = invitation.id;

  return query select
    member.id,
    member.storefront_id,
    member.login_id || '@work.social24x7.app',
    member.full_name,
    token;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_business_team_activation(target_member uuid, target_auth_user uuid, p_claim_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  member public.storefront_team_memberships%rowtype;
  invitation public.storefront_team_invitations%rowtype;
begin
  select * into member from public.storefront_team_memberships where id = target_member for update;
  select * into invitation from public.storefront_team_invitations where membership_id = target_member for update;
  if member.id is null or member.status <> 'not_activated' or member.auth_user_id is not null
    or invitation.id is null or invitation.activation_claim_hash is null
    or invitation.activation_claim_expires_at <= now()
    or invitation.activation_claim_hash <> encode(digest(p_claim_token, 'sha256'), 'hex') then
    raise exception 'Activation claim is invalid or expired.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from auth.users identity
    where identity.id = target_auth_user
      and identity.raw_app_meta_data ->> 'account_type' = 'business_employee'
      and identity.raw_app_meta_data ->> 'membership_id' = target_member::text
      and identity.raw_app_meta_data ->> 'storefront_id' = member.storefront_id::text
  ) then
    raise exception 'Work identity does not match this invitation.' using errcode = '42501';
  end if;
  update public.storefront_team_memberships
  set auth_user_id = target_auth_user,
      status = 'awaiting_approval',
      activated_at = now(),
      updated_at = now()
  where id = member.id;
  update public.storefront_team_invitations
  set consumed_at = now(), code_hash = encode(digest(gen_random_uuid()::text, 'sha256'), 'hex'),
      activation_claim_hash = null, activation_claim_expires_at = null, updated_at = now()
  where id = invitation.id;
  insert into public.storefront_team_audit_events (
    storefront_id, membership_id, actor_user_id, event_type
  ) values (member.storefront_id, member.id, target_auth_user, 'activated');
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_storefront(target uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.storefronts storefront
    where storefront.id = target
      and storefront.owner_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.storefront_members member
    where member.storefront_id = target
      and member.user_id = (select auth.uid())
      and member.permission in ('catalogue_editor', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_storefront_team_invitation(target_storefront uuid, p_full_name text, p_work_email text, p_login_id text, p_customer_tagline text, p_job_title text, p_employee_id text, p_department text, p_role_id uuid, p_permissions text[] DEFAULT NULL::text[])
 RETURNS TABLE(membership_id uuid, login_id text, activation_code text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'extensions'
AS $function$
declare
  viewer uuid := auth.uid();
  normalized_login text := private.normalize_business_login_id(p_login_id);
  normalized_email text := lower(btrim(coalesce(p_work_email, '')));
  created_member uuid;
  code text := upper(encode(gen_random_bytes(6), 'hex'));
  expiration timestamptz := now() + interval '24 hours';
  storefront_name text;
  permission text;
begin
  if viewer is null
    or not private.storefront_team_permission(target_storefront, 'business_team_manage') then
    raise exception 'Team management permission required.' using errcode = '42501';
  end if;
  select storefront.name into storefront_name
  from public.storefronts storefront
  where storefront.id = target_storefront
    and storefront.active
    and storefront.verification_status = 'approved';
  if storefront_name is null then
    raise exception 'A verified active storefront is required.' using errcode = '42501';
  end if;
  if normalized_login !~ '^[a-z0-9][a-z0-9._-]{2,39}$' then
    raise exception 'Login ID must use 3-40 letters, numbers, dots, underscores or hyphens.' using errcode = '22023';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid work email is required.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.storefront_team_roles role
    where role.id = p_role_id
      and role.storefront_id = target_storefront
      and role.archived_at is null
      and role.system_key is distinct from 'owner'
  ) then
    raise exception 'Selected role is unavailable.' using errcode = '22023';
  end if;
  if p_permissions is not null then
    foreach permission in array p_permissions loop
      if not exists (select 1 from public.storefront_team_permissions catalog where catalog.code = permission) then
        raise exception 'Unknown permission: %', permission using errcode = '22023';
      end if;
      if not exists (
        select 1 from public.storefronts storefront
        where storefront.id = target_storefront and storefront.owner_id = viewer
      ) and not private.storefront_team_permission(target_storefront, permission) then
        raise exception 'Cannot grant a permission you do not hold.' using errcode = '42501';
      end if;
    end loop;
  end if;

  insert into public.storefront_team_memberships (
    storefront_id, role_id, full_name, work_email, login_id,
    customer_tagline, job_title, employee_id, department,
    status, identity_kind, invited_by
  ) values (
    target_storefront,
    p_role_id,
    btrim(p_full_name),
    normalized_email,
    normalized_login,
    coalesce(nullif(btrim(p_customer_tagline), ''), 'from ' || storefront_name),
    btrim(p_job_title),
    nullif(btrim(p_employee_id), ''),
    coalesce(nullif(btrim(p_department), ''), 'Customer Support'),
    'not_activated',
    'work',
    viewer
  ) returning id into created_member;

  if p_permissions is not null then
    insert into public.storefront_team_member_permissions (
      membership_id, permission_code, allowed, granted_by
    )
    select created_member, catalog.code, catalog.code = any(p_permissions), viewer
    from public.storefront_team_permissions catalog;
  end if;

  insert into public.storefront_team_invitations (
    membership_id, code_hash, expires_at, created_by
  ) values (
    created_member, encode(digest(code, 'sha256'), 'hex'), expiration, viewer
  );

  insert into public.storefront_team_audit_events (
    storefront_id, membership_id, actor_user_id, event_type, detail
  ) values (
    target_storefront, created_member, viewer, 'invited',
    jsonb_build_object('loginId', normalized_login, 'roleId', p_role_id)
  );

  return query select created_member, normalized_login, code, expiration;
end;
$function$;

CREATE OR REPLACE FUNCTION private.effective_storefront_team_permissions(target_member uuid)
 RETURNS SETOF text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select permission.code
  from public.storefront_team_permissions permission
  join public.storefront_team_memberships member on member.id = target_member
  where coalesce(
    (
      select override.allowed
      from public.storefront_team_member_permissions override
      where override.membership_id = member.id
        and override.permission_code = permission.code
    ),
    exists (
      select 1
      from public.storefront_team_role_permissions role_permission
      where role_permission.role_id = member.role_id
        and role_permission.permission_code = permission.code
    ),
    false
  )
  order by permission.code;
$function$;

CREATE OR REPLACE FUNCTION private.storefront_team_member_permission(target_member uuid, target_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.storefront_team_memberships member
    where member.id = target_member
      and member.status = 'verified'
      and coalesce(
        (
          select override.allowed
          from public.storefront_team_member_permissions override
          where override.membership_id = member.id
            and override.permission_code = target_permission
        ),
        exists (
          select 1
          from public.storefront_team_role_permissions role_permission
          where role_permission.role_id = member.role_id
            and role_permission.permission_code = target_permission
        ),
        false
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.storefront_team_permission(target_storefront uuid, target_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.storefronts storefront
    where storefront.id = target_storefront
      and storefront.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.storefront_team_memberships member
    where member.storefront_id = target_storefront
      and member.auth_user_id = auth.uid()
      and member.status = 'verified'
      and coalesce(
        (
          select override.allowed
          from public.storefront_team_member_permissions override
          where override.membership_id = member.id
            and override.permission_code = target_permission
        ),
        exists (
          select 1
          from public.storefront_team_role_permissions role_permission
          where role_permission.role_id = member.role_id
            and role_permission.permission_code = target_permission
        ),
        false
      )
  );
$function$;

CREATE OR REPLACE FUNCTION public.approve_storefront_team_member(target_member uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  viewer uuid := auth.uid();
  member public.storefront_team_memberships%rowtype;
begin
  select * into member from public.storefront_team_memberships where id = target_member for update;
  if member.id is null
    or not private.storefront_team_permission(member.storefront_id, 'business_team_manage') then
    raise exception 'Team management permission required.' using errcode = '42501';
  end if;
  if member.status <> 'awaiting_approval' or member.auth_user_id is null then
    raise exception 'Member must activate before approval.' using errcode = '22023';
  end if;
  update public.storefront_team_memberships
  set status = 'verified', approved_by = viewer, approved_at = now(),
      suspended_at = null, removed_at = null, updated_at = now()
  where id = member.id;
  insert into public.storefront_team_audit_events (
    storefront_id, membership_id, actor_user_id, event_type
  ) values (member.storefront_id, member.id, viewer, 'approved');
end;
$function$;

CREATE OR REPLACE FUNCTION public.publish_creator_commerce_product(p_product_id uuid)
 RETURNS products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  viewer uuid := auth.uid();
  result public.products;
begin
  if viewer is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.creator_commerce_access
    where user_id = viewer and seller_status = 'approved'
  ) then
    raise exception 'Approved Seller access is required.' using errcode = '42501';
  end if;

  select product.* into result
  from public.products product
  join public.storefronts storefront on storefront.id = product.storefront_id
  where product.id = p_product_id and storefront.owner_id = viewer
  for update of product;
  if result.id is null then
    raise exception 'Product not found or Seller access denied.' using errcode = '42501';
  end if;
  if nullif(trim(result.title), '') is null or nullif(trim(result.slug), '') is null
     or nullif(trim(result.sku), '') is null or result.price_minor <= 0 then
    raise exception 'Complete Product title, slug, SKU and price before publishing.';
  end if;
  if result.inventory <= 0 then
    raise exception 'Add available inventory before publishing.';
  end if;
  if not exists (select 1 from public.product_media where product_id = p_product_id) then
    raise exception 'Add at least one Product image before publishing.';
  end if;
  if result.creator_promotion_enabled and not (result.creator_commission_bps between 500 and 7000) then
    raise exception 'Creator commission must be between 5%% and 70%%.';
  end if;

  update public.products
  set status = 'active',
      product_approval_status = 'approved',
      approval_requested_at = null,
      reviewed_by = null,
      reviewed_at = null,
      review_note = null,
      published_at = coalesce(published_at, now()),
      suspended_at = null,
      archived_at = null,
      attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('publicationMode','seller_direct'),
      updated_at = now()
  where id = p_product_id
  returning * into result;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.reassign_business_conversation(target_conversation uuid, target_member uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  viewer uuid := auth.uid();
  assignment public.business_conversation_assignments%rowtype;
  previous_member public.storefront_team_memberships%rowtype;
  next_member public.storefront_team_memberships%rowtype;
  customer_id uuid;
  owner_id uuid;
begin
  select * into assignment
  from public.business_conversation_assignments
  where conversation_id = target_conversation
  for update;
  if assignment.conversation_id is null
    or not private.storefront_team_permission(assignment.storefront_id, 'business_chat_assign') then
    raise exception 'Chat assignment permission required.' using errcode = '42501';
  end if;
  select * into next_member
  from public.storefront_team_memberships
  where id = target_member and storefront_id = assignment.storefront_id
    and status = 'verified' and auth_user_id is not null
  for update;
  if next_member.id is null
    or not private.storefront_team_member_permission(next_member.id, 'business_chat_reply') then
    raise exception 'Assignee must be an active representative with reply permission.' using errcode = '22023';
  end if;
  if assignment.assignee_membership_id = next_member.id then return; end if;
  select * into previous_member
  from public.storefront_team_memberships
  where id = assignment.assignee_membership_id;
  select conversation.business_customer_id, storefront.owner_id
  into customer_id, owner_id
  from public.conversations conversation
  join public.storefronts storefront on storefront.id = conversation.storefront_id
  where conversation.id = target_conversation;

  update public.business_conversation_assignments
  set assignee_membership_id = next_member.id,
      status = 'open', assigned_by = viewer, assigned_at = now(),
      resolved_by = null, resolved_at = null,
      version = version + 1, updated_at = now()
  where conversation_id = target_conversation;

  if previous_member.auth_user_id is not null
    and previous_member.auth_user_id <> owner_id
    and previous_member.auth_user_id <> customer_id then
    delete from public.conversation_participants
    where conversation_id = target_conversation and user_id = previous_member.auth_user_id;
  end if;
  insert into public.conversation_participants(conversation_id, user_id)
  values (target_conversation, next_member.auth_user_id)
  on conflict do nothing;
  insert into public.business_conversation_assignment_events (
    conversation_id, storefront_id, previous_assignee_membership_id,
    assignee_membership_id, actor_user_id, event_type
  ) values (
    target_conversation, assignment.storefront_id, assignment.assignee_membership_id,
    next_member.id, viewer,
    case when assignment.assignee_membership_id is null then 'assigned' else 'reassigned' end
  );
  insert into public.storefront_team_audit_events (
    storefront_id, membership_id, actor_user_id, event_type, detail
  ) values (
    assignment.storefront_id, next_member.id, viewer,
    case when assignment.assignee_membership_id is null then 'assigned' else 'reassigned' end,
    jsonb_build_object('conversationId', target_conversation, 'previousMembershipId', assignment.assignee_membership_id)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.save_creator_commerce_product(p_product_id uuid, p_title text, p_slug text, p_category text, p_price_minor integer, p_sale_price_minor integer, p_inventory integer, p_sku text, p_short_description text, p_description text, p_creator_promotion_enabled boolean, p_creator_commission_bps integer, p_return_window_days integer)
 RETURNS products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  viewer uuid := auth.uid();
  storefront public.storefronts;
  result public.products;
begin
  if viewer is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.creator_commerce_access
    where user_id = viewer and seller_status = 'approved'
  ) then
    raise exception 'Approved Seller access is required.' using errcode = '42501';
  end if;

  select * into storefront from public.storefronts where owner_id = viewer limit 1;
  if storefront.id is null then
    raise exception 'Create the Seller storefront before adding Products.';
  end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_slug), '') is null or nullif(trim(p_sku), '') is null then
    raise exception 'Product title, slug and SKU are required.';
  end if;
  if p_creator_promotion_enabled and not (p_creator_commission_bps between 500 and 7000) then
    raise exception 'Creator commission must be between 5%% and 70%%.';
  end if;

  if p_product_id is null then
    insert into public.products (
      storefront_id, title, slug, brand, category, price_minor,
      sale_price_minor, inventory, sku, short_description, description,
      creator_promotion_enabled, creator_commission_bps, return_window_days,
      status, product_approval_status
    ) values (
      storefront.id, trim(p_title), trim(p_slug), storefront.name, p_category,
      greatest(p_price_minor, 0), case when p_sale_price_minor > 0 then p_sale_price_minor else null end,
      greatest(p_inventory, 0), trim(p_sku), left(trim(p_short_description), 180),
      trim(p_description), p_creator_promotion_enabled,
      case when p_creator_promotion_enabled then p_creator_commission_bps else 0 end,
      greatest(0, least(30, p_return_window_days)), 'draft', 'draft'
    ) returning * into result;
  else
    update public.products product set
      title = trim(p_title),
      slug = trim(p_slug),
      category = p_category,
      price_minor = greatest(p_price_minor, 0),
      sale_price_minor = case when p_sale_price_minor > 0 then p_sale_price_minor else null end,
      inventory = greatest(p_inventory, 0),
      sku = trim(p_sku),
      short_description = left(trim(p_short_description), 180),
      description = trim(p_description),
      creator_promotion_enabled = p_creator_promotion_enabled,
      creator_commission_bps = case when p_creator_promotion_enabled then p_creator_commission_bps else 0 end,
      return_window_days = greatest(0, least(30, p_return_window_days)),
      updated_at = now()
    where product.id = p_product_id and product.storefront_id = storefront.id
    returning * into result;
    if result.id is null then
      raise exception 'Product not found or Seller access denied.';
    end if;
  end if;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seller_review_creator_commerce_return(p_return_request_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS return_requests
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_user uuid := auth.uid();
  v_return public.return_requests;
  v_item public.order_items;
begin
  if v_user is null then raise exception 'Authentication required.'; end if;
  if p_decision not in ('approved', 'rejected', 'under_review') then
    raise exception 'Return decision must be approved, rejected, or under_review.';
  end if;

  select * into v_return from public.return_requests where id = p_return_request_id for update;
  if not found then raise exception 'Return request not found.'; end if;
  if not public.can_manage_storefront(v_return.storefront_id) then raise exception 'Seller access required.'; end if;
  if v_return.status not in ('submitted', 'under_review') then raise exception 'Return request is already decided.'; end if;

  update public.return_requests
  set status = p_decision,
      admin_note = nullif(trim(coalesce(p_reason, '')), ''),
      reviewed_by = v_user,
      reviewed_at = case when p_decision = 'under_review' then null else now() end
  where id = p_return_request_id
  returning * into v_return;

  if p_decision = 'under_review' then return v_return; end if;
  select * into v_item from public.order_items where id = v_return.order_item_id;

  if p_decision = 'approved' then
    insert into public.refund_requests (
      return_request_id, checkout_group_id, order_id, buyer_id, amount_minor, status,
      provider
    ) values (
      v_return.id, v_item.checkout_group_id, v_item.order_id, v_item.buyer_id,
      v_item.subtotal_minor, 'external_integration_pending', 'external_pending'
    ) on conflict do nothing;
    update public.order_items set commission_status = 'reversed' where id = v_item.id;
    update public.creator_commissions
    set status = 'reversed', reversal_reason = coalesce(nullif(trim(p_reason), ''), 'Seller approved return'), updated_at = now()
    where order_item_id = v_item.id;
    update public.orders set status = 'return_approved', updated_at = now() where id = v_item.order_id;
  else
    update public.order_items
    set commission_status = case when commission_minor > 0 then 'confirmed' else 'none' end
    where id = v_item.id;
    update public.creator_commissions set status = 'confirmed', updated_at = now()
    where order_item_id = v_item.id and status = 'withheld';
    update public.orders set status = 'return_rejected', updated_at = now() where id = v_item.order_id;
  end if;

  return v_return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.seller_update_creator_commerce_fulfillment(p_order_id uuid, p_status text, p_carrier text DEFAULT ''::text, p_tracking_number text DEFAULT ''::text, p_package_reference text DEFAULT ''::text, p_customer_note text DEFAULT ''::text, p_packing_evidence_path text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  current_order public.orders%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;
  if p_status not in ('confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled') then
    raise exception 'Unsupported fulfillment status.';
  end if;

  select candidate.*
  into current_order
  from public.orders candidate
  where candidate.id = p_order_id
    and public.can_manage_storefront(candidate.storefront_id)
  for update;

  if not found then
    raise exception 'Order not found or seller access denied.';
  end if;
  if current_order.payment_method = 'external'
    and current_order.payment_status not in ('captured', 'captured_test') then
    raise exception 'Online payment must be captured before fulfillment.';
  end if;
  if not (
    (current_order.status = 'placed' and p_status = 'confirmed')
    or (current_order.status = 'confirmed' and p_status = 'processing')
    or (current_order.status = 'processing' and p_status = 'shipped')
    or (current_order.status = 'shipped' and p_status = 'out_for_delivery')
    or (current_order.status = 'out_for_delivery' and p_status = 'delivered')
    or (current_order.status in ('placed', 'confirmed', 'processing') and p_status = 'cancelled')
  ) then
    raise exception 'Invalid fulfillment transition: % -> %', current_order.status, p_status;
  end if;

  update public.orders
  set status = p_status,
      delivered_at = case when p_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
      updated_at = now()
  where id = p_order_id
  returning * into current_order;

  insert into public.order_fulfillments (
    order_id,
    status,
    carrier,
    tracking_number,
    package_reference,
    customer_note,
    updated_by
  ) values (
    p_order_id,
    p_status,
    trim(coalesce(p_carrier, '')),
    trim(coalesce(p_tracking_number, '')),
    trim(coalesce(p_package_reference, '')),
    trim(coalesce(p_customer_note, '')),
    current_user_id
  )
  on conflict (order_id) do update
  set status = excluded.status,
      carrier = excluded.carrier,
      tracking_number = excluded.tracking_number,
      package_reference = excluded.package_reference,
      customer_note = excluded.customer_note,
      updated_by = excluded.updated_by,
      updated_at = now();

  insert into public.order_events (order_id, actor_id, status, detail)
  values (
    p_order_id,
    current_user_id,
    p_status,
    coalesce(nullif(trim(p_customer_note), ''), 'Fulfillment status updated.')
  );

  if p_packing_evidence_path is not null then
    insert into public.commerce_order_evidence (owner_id, order_id, evidence_kind, storage_path)
    values (current_user_id, p_order_id, 'packing', p_packing_evidence_path)
    on conflict (storage_path) do nothing;
  end if;

  if p_status = 'delivered' then
    update public.products product
    set inventory = greatest(0, product.inventory - sold.quantity),
        inventory_reserved = greatest(0, product.inventory_reserved - sold.quantity),
        updated_at = now()
    from (
      select item.product_id, sum(item.quantity)::integer as quantity
      from public.order_items item
      where item.order_id = p_order_id
      group by item.product_id
    ) sold
    where product.id = sold.product_id;

    update public.order_items
    set return_window_ends_at = now() + make_interval(days => coalesce((
          select max(product.return_window_days)
          from public.products product
          where product.id = order_items.product_id
        ), 7)),
        commission_status = case when commission_status = 'pending' then 'confirmed' else commission_status end
    where order_id = p_order_id;

    update public.creator_commissions
    set status = 'confirmed',
        confirmed_at = coalesce(confirmed_at, now()),
        updated_at = now()
    where order_id = p_order_id
      and status = 'pending';
  elsif p_status = 'cancelled' then
    update public.products product
    set inventory_reserved = greatest(0, product.inventory_reserved - released.quantity),
        updated_at = now()
    from (
      select item.product_id, sum(item.quantity)::integer as quantity
      from public.order_items item
      where item.order_id = p_order_id
      group by item.product_id
    ) released
    where product.id = released.product_id;

    update public.order_items
    set commission_status = case when commission_status = 'pending' then 'reversed' else commission_status end
    where order_id = p_order_id;

    update public.creator_commissions
    set status = 'cancelled',
        reversal_reason = coalesce(reversal_reason, 'Order cancelled before delivery.'),
        updated_at = now()
    where order_id = p_order_id
      and status = 'pending';
  end if;

  return current_order;
end;
$function$;

CREATE OR REPLACE FUNCTION public.transition_storefront_team_member(target_member uuid, target_action text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  viewer uuid := auth.uid();
  member public.storefront_team_memberships%rowtype;
  next_status public.storefront_team_member_status;
  audit_type text;
  affected record;
begin
  select * into member from public.storefront_team_memberships where id = target_member for update;
  if member.id is null
    or not private.storefront_team_permission(member.storefront_id, 'business_team_manage') then
    raise exception 'Team management permission required.' using errcode = '42501';
  end if;
  if member.identity_kind = 'owner_personal' then
    raise exception 'The root Owner membership cannot be suspended or removed.' using errcode = '42501';
  end if;
  if target_action = 'suspend' and member.status in ('verified', 'awaiting_approval') then
    next_status := 'suspended'; audit_type := 'suspended';
  elsif target_action = 'remove' and member.status <> 'removed' then
    next_status := 'removed'; audit_type := 'removed';
  elsif target_action = 'reactivate' and member.status = 'suspended' and member.auth_user_id is not null then
    next_status := 'verified'; audit_type := 'reactivated';
  else
    raise exception 'Invalid member state transition.' using errcode = '22023';
  end if;
  update public.storefront_team_memberships
  set status = next_status,
      suspended_at = case when next_status = 'suspended' then now() else null end,
      removed_at = case when next_status = 'removed' then now() else null end,
      updated_at = now()
  where id = member.id;

  if next_status in ('suspended', 'removed') then
    for affected in
      update public.business_conversation_assignments assignment
      set assignee_membership_id = null,
          assigned_by = viewer,
          assigned_at = now(),
          version = assignment.version + 1,
          updated_at = now()
      where assignment.assignee_membership_id = member.id
      returning assignment.conversation_id, assignment.storefront_id
    loop
      delete from public.conversation_participants participant
      where participant.conversation_id = affected.conversation_id
        and participant.user_id = member.auth_user_id;
      insert into public.business_conversation_assignment_events (
        conversation_id, storefront_id, previous_assignee_membership_id,
        actor_user_id, event_type
      ) values (affected.conversation_id, affected.storefront_id, member.id, viewer, 'unassigned');
    end loop;
  end if;

  insert into public.storefront_team_audit_events (
    storefront_id, membership_id, actor_user_id, event_type
  ) values (member.storefront_id, member.id, viewer, audit_type);
end;
$function$;
