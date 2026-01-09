ALTER TABLE "user_credits"
  ADD COLUMN IF NOT EXISTS 'monthly_used' integer NOT NULL DEFAULT 0;

ALTER TABLE "user_credits"
  ADD COLUMN IF NOT EXISTS "monthly_reset_at" timestamp NOT NULL DEFAULT now();
