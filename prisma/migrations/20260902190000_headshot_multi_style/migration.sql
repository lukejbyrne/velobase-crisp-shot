-- A batch may now mix up to four styles, so the style moves onto each image
-- and the batch records the set that was chosen.
--
-- Written by hand so existing rows are backfilled rather than dropped: every
-- current image inherits its batch's single style, which is exactly what it
-- was rendered with.

-- 1. Add the new columns, nullable at first so the backfill can run.
ALTER TABLE "headshot_batches" ADD COLUMN IF NOT EXISTS "style_keys" TEXT[];
ALTER TABLE "headshot_images"  ADD COLUMN IF NOT EXISTS "style_key" TEXT;

-- 2. Backfill from the batch's existing single style.
UPDATE "headshot_batches"
   SET "style_keys" = ARRAY["style_key"]
 WHERE "style_keys" IS NULL;

UPDATE "headshot_images" i
   SET "style_key" = b."style_key"
  FROM "headshot_batches" b
 WHERE i."batch_id" = b."id"
   AND i."style_key" IS NULL;

-- 3. Anything still null has no batch to inherit from; fall back to the
--    default style rather than failing the migration.
UPDATE "headshot_batches" SET "style_keys" = ARRAY['corporate'] WHERE "style_keys" IS NULL;
UPDATE "headshot_images"  SET "style_key"  = 'corporate'        WHERE "style_key"  IS NULL;

-- 4. Now they can be required.
ALTER TABLE "headshot_batches" ALTER COLUMN "style_keys" SET NOT NULL;
ALTER TABLE "headshot_images"  ALTER COLUMN "style_key"  SET NOT NULL;

-- 5. The batch-level single style is superseded.
ALTER TABLE "headshot_batches" DROP COLUMN IF EXISTS "style_key";
