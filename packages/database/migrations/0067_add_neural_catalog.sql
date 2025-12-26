-- neural_tags
CREATE TABLE IF NOT EXISTS "neural_tags" (
                                           "id" text PRIMARY KEY NOT NULL,
                                           "slug" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "accessed_at" timestamptz DEFAULT now() NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS "neural_tags_slug_idx"
  ON "neural_tags" USING btree ("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "neural_tags_name_key"
  ON "neural_tags" USING btree ("name");

-- neural_services
CREATE TABLE IF NOT EXISTS "neural_services" (
                                               "id" text PRIMARY KEY NOT NULL,
                                               "slug" varchar(255) NOT NULL,
  "name" varchar(255) NOT NULL,
  "short_desc" text,
  "url" text,
  "icon_url" text,
  "source" varchar(255) DEFAULT 'external',
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "accessed_at" timestamptz DEFAULT now() NOT NULL
  );

CREATE UNIQUE INDEX IF NOT EXISTS "neural_services_slug_idx"
  ON "neural_services" USING btree ("slug");

CREATE INDEX IF NOT EXISTS "neural_services_active_idx"
  ON "neural_services" USING btree ("is_active");

-- neural_service_tags
CREATE TABLE IF NOT EXISTS "neural_service_tags" (
                                                   "service_id" text NOT NULL,
                                                   "tag_id" text NOT NULL,
                                                   CONSTRAINT "neural_service_tags_pk" PRIMARY KEY ("service_id","tag_id")
  );

ALTER TABLE "neural_service_tags"
  ADD CONSTRAINT "neural_service_tags_service_id_neural_services_id_fk"
    FOREIGN KEY ("service_id") REFERENCES "neural_services"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "neural_service_tags"
  ADD CONSTRAINT "neural_service_tags_tag_id_neural_tags_id_fk"
    FOREIGN KEY ("tag_id") REFERENCES "neural_tags"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

-- neural_favorite_services
CREATE TABLE IF NOT EXISTS "neural_favorite_services" (
                                                        "user_id" text NOT NULL,
                                                        "service_id" text NOT NULL,
                                                        "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "accessed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "neural_favorite_services_pk" PRIMARY KEY ("user_id","service_id")
  );

CREATE INDEX IF NOT EXISTS "neural_favorite_services_user_idx"
  ON "neural_favorite_services" USING btree ("user_id");

ALTER TABLE "neural_favorite_services"
  ADD CONSTRAINT "neural_favorite_services_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "neural_favorite_services"
  ADD CONSTRAINT "neural_favorite_services_service_id_neural_services_id_fk"
    FOREIGN KEY ("service_id") REFERENCES "neural_services"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;

-- neural_favorite_models
CREATE TABLE IF NOT EXISTS "neural_favorite_models" (
                                                      "user_id" text NOT NULL,
                                                      "model_id" text NOT NULL,
                                                      "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "accessed_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "neural_favorite_models_pk" PRIMARY KEY ("user_id","model_id")
  );

CREATE INDEX IF NOT EXISTS "neural_favorite_models_user_idx"
  ON "neural_favorite_models" USING btree ("user_id");

ALTER TABLE "neural_favorite_models"
  ADD CONSTRAINT "neural_favorite_models_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE NO ACTION;
