CREATE TABLE IF NOT EXISTS "neural_chains" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "summary" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "neural_chain_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "chain_id" uuid NOT NULL REFERENCES "neural_chains"("id") ON DELETE CASCADE,
  "index" integer NOT NULL,
  "prompt" text NOT NULL,
  "models" jsonb NOT NULL,
  "results" jsonb NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);
