CREATE TYPE "user_tier" AS ENUM ('starter', 'creator', 'admin');

CREATE TABLE IF NOT EXISTS "user_credits" (
                                            "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "diamonds_balance" integer NOT NULL DEFAULT 0,
  "tier" "user_tier" NOT NULL DEFAULT 'starter',
  "monthly_limit" integer NOT NULL DEFAULT 0,
  "period_start_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
  );

