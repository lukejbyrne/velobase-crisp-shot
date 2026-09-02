-- Adds the Kie.ai image generation provider.
-- Written by hand and made idempotent: ALTER TYPE ... ADD VALUE cannot run
-- inside a transaction on older PostgreSQL, and re-running a deploy must not
-- fail on an already-present value.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'ImageGenerationProvider' AND e.enumlabel = 'KIE'
  ) THEN
    ALTER TYPE "ImageGenerationProvider" ADD VALUE 'KIE';
  END IF;
END
$$;
