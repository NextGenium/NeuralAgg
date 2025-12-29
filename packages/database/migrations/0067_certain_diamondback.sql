CREATE TABLE "neural_favorite_models" (
	"model_id" text NOT NULL,
	"user_id" text NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "neural_favorite_models_pk" PRIMARY KEY("user_id","model_id")
);
--> statement-breakpoint
CREATE TABLE "neural_favorite_services" (
	"service_id" text NOT NULL,
	"user_id" text NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "neural_favorite_services_pk" PRIMARY KEY("user_id","service_id")
);
--> statement-breakpoint
CREATE TABLE "neural_service_tags" (
	"service_id" text NOT NULL,
	"tag_id" text NOT NULL,
	CONSTRAINT "neural_service_tags_pk" PRIMARY KEY("service_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "neural_services" (
	"icon_url" text,
	"id" text PRIMARY KEY NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_desc" text,
	"slug" varchar(255) NOT NULL,
	"source" varchar(255) DEFAULT 'external',
	"url" text,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "neural_services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "neural_tags" (
	"description" text,
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"accessed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "neural_tags_name_unique" UNIQUE("name"),
	CONSTRAINT "neural_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "neural_favorite_models" ADD CONSTRAINT "neural_favorite_models_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neural_favorite_services" ADD CONSTRAINT "neural_favorite_services_service_id_neural_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."neural_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neural_favorite_services" ADD CONSTRAINT "neural_favorite_services_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neural_service_tags" ADD CONSTRAINT "neural_service_tags_service_id_neural_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."neural_services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "neural_service_tags" ADD CONSTRAINT "neural_service_tags_tag_id_neural_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."neural_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "neural_favorite_models_user_idx" ON "neural_favorite_models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "neural_favorite_services_user_idx" ON "neural_favorite_services" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "neural_services_active_idx" ON "neural_services" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "neural_services_slug_idx" ON "neural_services" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "neural_tags_slug_idx" ON "neural_tags" USING btree ("slug");