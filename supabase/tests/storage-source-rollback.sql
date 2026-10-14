-- EMERGENCY REVIEW ONLY. NOT APPLIED. Restores the known source-path weakness.
-- Does NOT revert the already-approved generic branding policy repair.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE storage.objects IN SHARE ROW EXCLUSIVE MODE;
DO $rollback$
DECLARE snapshot jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'policyname', policyname, 'permissive', permissive, 'roles', roles::text,
    'cmd', cmd, 'qual', qual, 'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb)
  INTO snapshot FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';

  IF jsonb_array_length(snapshot) <> 34
     OR md5(snapshot::text) <> '2530a5eb1428253ccc9f2b3a77dc28ee' THEN
    RAISE EXCEPTION 'Product source rollback policy drift: stop and review';
  END IF;

  ALTER POLICY creator_commerce_shop_media_seller_update ON storage.objects
  USING ((bucket_id = 'shop-media'::text)
    AND (owner_id = (SELECT (auth.uid())::text AS uid)));

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'policyname', policyname, 'permissive', permissive, 'roles', roles::text,
    'cmd', cmd, 'qual', qual, 'with_check', with_check
  ) ORDER BY policyname), '[]'::jsonb)
  INTO snapshot FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects';

  IF jsonb_array_length(snapshot) <> 34
     OR md5(snapshot::text) <> '9634c380ea0ca9c2f251a3c4d37cddb4' THEN
    RAISE EXCEPTION 'Product source rollback postcondition mismatch: rolling back';
  END IF;
END
$rollback$;
COMMIT;

