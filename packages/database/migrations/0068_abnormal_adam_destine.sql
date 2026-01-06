CREATE TYPE "public"."user_tier" AS ENUM('starter', 'creator', 'admin');--> statement-breakpoint
CREATE TABLE "neutral_chain_steps" (
	"chain_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index" integer NOT NULL,
	"models" jsonb NOT NULL,
	"prompt" text NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neural_chains" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"summary" text,
	"title" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"created_at" timestamp DEFAULT now() NOT NULL,
	"diamonds_balance" integer DEFAULT 0 NOT NULL,
	"monthly_limit" integer DEFAULT 0 NOT NULL,
	"period_start_at" timestamp,
	"tier" "user_tier" DEFAULT 'starter' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "neutral_chain_steps" ADD CONSTRAINT "neutral_chain_steps_chain_id_neural_chains_id_fk" FOREIGN KEY ("chain_id") REFERENCES "public"."neural_chains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neural_chains" ADD CONSTRAINT "neural_chains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_credits" ADD CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;