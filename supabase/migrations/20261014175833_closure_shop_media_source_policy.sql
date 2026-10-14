-- User-approved minimal repair; exact drift guards must pass before application.
-- Target: kcuxyxqtfkxrbtmugjsn. One UPDATE policy USING expression only.
-- Captured 2026-10-14 after the approved generic three-policy repair.
-- MD5 is a deterministic catalog drift fingerprint, not a security credential.
-- Applied migration version: 20261014175833 (Supabase-assigned).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $repair$
DECLARE
  snapshot jsonb;
  destination_predicate text;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'policyname', policyname, 'permissive', permissive, 'roles', roles::text,
    'cmd', cmd, 'qual', qual, 'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb)
  INTO snapshot FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';

  IF jsonb_array_length(snapshot) <> 34
     OR md5(snapshot::text) <> '9634c380ea0ca9c2f251a3c4d37cddb4' THEN
    RAISE EXCEPTION 'Product source repair policy drift: stop and review';
  END IF;

  SELECT with_check INTO STRICT destination_predicate
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'creator_commerce_shop_media_seller_update';

  -- The exact fingerprint above pins this predicate to the reviewed destination
  -- rule: shop-media, object uploader, products path, matching owner storefront,
  -- matching product and draft/changes_required/rejected/approved source status.
  -- Destination WITH CHECK is deliberately unchanged.
  EXECUTE format(
    'ALTER POLICY %I ON storage.objects USING (%s)',
    'creator_commerce_shop_media_seller_update', destination_predicate
  );

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'policyname', policyname, 'permissive', permissive, 'roles', roles::text,
    'cmd', cmd, 'qual', qual, 'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb)
  INTO snapshot FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';

  IF jsonb_array_length(snapshot) <> 34
     OR md5(snapshot::text) <> '2530a5eb1428253ccc9f2b3a77dc28ee' THEN
    RAISE EXCEPTION 'Product source repair postcondition mismatch: rolling back';
  END IF;
END
$repair$;
COMMIT;
