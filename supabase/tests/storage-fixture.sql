DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE plpgsql IMMUTABLE AS $$ DECLARE _parts text[]; BEGIN SELECT string_to_array(name,'/') INTO _parts; RETURN _parts[1:array_length(_parts,1)-1]; END $$;
CREATE TABLE public.storefronts(id uuid PRIMARY KEY, owner_id uuid NOT NULL,name text NOT NULL);
CREATE TABLE public.products(id uuid PRIMARY KEY,storefront_id uuid NOT NULL,product_approval_status text NOT NULL);
CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text NOT NULL,name text NOT NULL,owner_id text,owner uuid, metadata jsonb DEFAULT '{}',UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public,auth,storage TO authenticated,anon;
GRANT SELECT ON public.storefronts,public.products TO authenticated,anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated,anon;

CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO authenticated,anon;
CREATE TABLE public.stories(media_path text,thumbnail_path text,expires_at timestamptz,visibility text,author_id uuid);
CREATE TABLE public.follows(follower_id uuid,following_id uuid);
CREATE TABLE public.profiles(id uuid,is_private boolean);
CREATE TABLE public.orders(id uuid,customer_id uuid,storefront_id uuid);
CREATE TABLE public.commerce_order_evidence(storage_path text,order_id uuid);
GRANT SELECT ON public.stories,public.follows,public.profiles,public.orders,public.commerce_order_evidence TO authenticated,anon;
CREATE FUNCTION private.can_read_chat_media_path(text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION private.can_write_chat_media_path(text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION private.is_creator_commerce_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION private.can_manage_product_media_path(text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION private.can_read_product_media_path(text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public.can_manage_storefront(uuid) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE POLICY "active story objects readable" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'social-stories'::text) AND (EXISTS ( SELECT 1
   FROM stories s
  WHERE (((s.media_path = objects.name) OR (s.thumbnail_path = objects.name)) AND (s.expires_at > now()) AND ((s.visibility = 'public'::text) OR (s.author_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM follows f
          WHERE ((f.follower_id = ( SELECT auth.uid() AS uid)) AND (f.following_id = s.author_id))))))))));
CREATE POLICY "chat_media_member_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'chat-media'::text) AND private.can_read_chat_media_path(name)));
CREATE POLICY "chat_media_sender_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'chat-media'::text) AND private.can_write_chat_media_path(name)));
CREATE POLICY "chat_media_sender_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'chat-media'::text) AND private.can_write_chat_media_path(name)));
CREATE POLICY "chat_media_sender_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'chat-media'::text) AND private.can_write_chat_media_path(name))) WITH CHECK (((bucket_id = 'chat-media'::text) AND private.can_write_chat_media_path(name)));
CREATE POLICY "creator_commerce_private_admin_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'creator-commerce-private'::text) AND ( SELECT private.is_creator_commerce_admin() AS is_creator_commerce_admin)));
CREATE POLICY "creator_commerce_private_order_participant_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'creator-commerce-private'::text) AND (EXISTS ( SELECT 1
   FROM (commerce_order_evidence evidence
     JOIN orders commerce_order ON ((commerce_order.id = evidence.order_id)))
  WHERE ((evidence.storage_path = objects.name) AND ((commerce_order.customer_id = ( SELECT auth.uid() AS uid)) OR can_manage_storefront(commerce_order.storefront_id)))))));
CREATE POLICY "creator_commerce_private_owner_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'creator-commerce-private'::text) AND (owner = ( SELECT auth.uid() AS uid)) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "creator_commerce_private_owner_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'creator-commerce-private'::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "creator_commerce_private_owner_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'creator-commerce-private'::text) AND (owner = ( SELECT auth.uid() AS uid)))) WITH CHECK (((bucket_id = 'creator-commerce-private'::text) AND (owner = ( SELECT auth.uid() AS uid)) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
CREATE POLICY "creator_commerce_shop_media_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'shop-media'::text));
CREATE POLICY "creator_commerce_shop_media_seller_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'shop-media'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid)) AND ((storage.foldername(name))[2] = 'products'::text) AND (EXISTS ( SELECT 1
   FROM (storefronts storefront
     JOIN products product ON ((product.storefront_id = storefront.id)))
  WHERE ((storefront.owner_id = ( SELECT auth.uid() AS uid)) AND ((storefront.id)::text = (storage.foldername(objects.name))[1]) AND ((product.id)::text = (storage.foldername(objects.name))[3]) AND (product.product_approval_status = ANY (ARRAY['draft'::text, 'changes_required'::text, 'rejected'::text, 'approved'::text])))))));
CREATE POLICY "creator_commerce_shop_media_seller_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'shop-media'::text) AND ((storage.foldername(name))[2] = 'products'::text) AND (EXISTS ( SELECT 1
   FROM (storefronts storefront
     JOIN products product ON ((product.storefront_id = storefront.id)))
  WHERE ((storefront.owner_id = ( SELECT auth.uid() AS uid)) AND ((storefront.id)::text = (storage.foldername(objects.name))[1]) AND ((product.id)::text = (storage.foldername(objects.name))[3]) AND (product.product_approval_status = ANY (ARRAY['draft'::text, 'changes_required'::text, 'rejected'::text, 'approved'::text])))))));
CREATE POLICY "creator_commerce_shop_media_seller_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'shop-media'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid)))) WITH CHECK (((bucket_id = 'shop-media'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid)) AND ((storage.foldername(name))[2] = 'products'::text) AND (EXISTS ( SELECT 1
   FROM (storefronts storefront
     JOIN products product ON ((product.storefront_id = storefront.id)))
  WHERE ((storefront.owner_id = ( SELECT auth.uid() AS uid)) AND ((storefront.id)::text = (storage.foldername(objects.name))[1]) AND ((product.id)::text = (storage.foldername(objects.name))[3]) AND (product.product_approval_status = ANY (ARRAY['draft'::text, 'changes_required'::text, 'rejected'::text, 'approved'::text])))))));
CREATE POLICY "missing photos owner insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'missing-person-photos'::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "missing photos owner update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'missing-person-photos'::text) AND (owner = ( SELECT auth.uid() AS uid)))) WITH CHECK (((bucket_id = 'missing-person-photos'::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "missing photos public read" ON storage.objects AS PERMISSIVE FOR SELECT TO public USING ((bucket_id = 'missing-person-photos'::text));
CREATE POLICY "product_media_private_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'product-media'::text) AND private.can_manage_product_media_path(name)));
CREATE POLICY "product_media_private_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'product-media'::text) AND private.can_manage_product_media_path(name)));
CREATE POLICY "product_media_private_read" ON storage.objects AS PERMISSIVE FOR SELECT TO anon,authenticated USING (((bucket_id = 'product-media'::text) AND private.can_read_product_media_path(name)));
CREATE POLICY "product_media_private_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'product-media'::text) AND private.can_manage_product_media_path(name))) WITH CHECK (((bucket_id = 'product-media'::text) AND private.can_manage_product_media_path(name)));
CREATE POLICY "profile_media_authenticated_read" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated USING (((bucket_id = 'profile-media'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND ((NOT p.is_private) OR (p.id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "profile_media_owner_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'profile-media'::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "profile_media_owner_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'profile-media'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "profile_media_owner_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'profile-media'::text) AND (owner = ( SELECT auth.uid() AS uid)))) WITH CHECK (((bucket_id = 'profile-media'::text) AND (owner = ( SELECT auth.uid() AS uid))));
CREATE POLICY "shop_media_owner_delete" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'shop-media'::text) AND (EXISTS ( SELECT 1
   FROM storefronts storefront
  WHERE (((storefront.id)::text = (storage.foldername(storefront.name))[1]) AND (storefront.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "shop_media_owner_insert" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'shop-media'::text) AND (EXISTS ( SELECT 1
   FROM storefronts storefront
  WHERE (((storefront.id)::text = (storage.foldername(storefront.name))[1]) AND (storefront.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "shop_media_owner_update" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'shop-media'::text) AND (EXISTS ( SELECT 1
   FROM storefronts storefront
  WHERE (((storefront.id)::text = (storage.foldername(storefront.name))[1]) AND (storefront.owner_id = ( SELECT auth.uid() AS uid))))))) WITH CHECK (((bucket_id = 'shop-media'::text) AND (EXISTS ( SELECT 1
   FROM storefronts storefront
  WHERE (((storefront.id)::text = (storage.foldername(storefront.name))[1]) AND (storefront.owner_id = ( SELECT auth.uid() AS uid)))))));
CREATE POLICY "shop_media_public_read" ON storage.objects AS PERMISSIVE FOR SELECT TO anon,authenticated USING ((bucket_id = 'shop-media'::text));
CREATE POLICY "social post owners delete objects" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'social-posts'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid))));
CREATE POLICY "social post owners update objects" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated USING (((bucket_id = 'social-posts'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid)))) WITH CHECK (((bucket_id = 'social-posts'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid)) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));
CREATE POLICY "social post uploads in own folder" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'social-posts'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));
CREATE POLICY "social story owners delete objects" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated USING (((bucket_id = 'social-stories'::text) AND (owner_id = ( SELECT (auth.uid())::text AS uid))));
CREATE POLICY "social story uploads in own folder" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'social-stories'::text) AND ((storage.foldername(name))[1] = ( SELECT (auth.uid())::text AS uid))));

