import { boolean, index, pgTable, primaryKey, text } from 'drizzle-orm/pg-core';

import { timestamps, varchar255 } from './_helpers';
import { users } from './user';

export const neuralTags = pgTable(
  'neural_tags',
  {
    description: text('description'),
    id: text('id').primaryKey().notNull(),

    name: varchar255('name').notNull().unique(),
    // uuid / короткий id
    slug: varchar255('slug').notNull().unique(),
    ...timestamps,
  },
  (self) => ({
    slugIndex: index('neural_tags_slug_idx').on(self.slug),
  }),
);

export const neuralServices = pgTable(
  'neural_services',
  {
    iconUrl: text('icon_url'),
    id: text('id').primaryKey().notNull(),
    // 'external' | 'openrouter' | ...
    isActive: boolean('is_active').notNull().default(true),

    name: varchar255('name').notNull(),

    shortDesc: text('short_desc'),

    slug: varchar255('slug').notNull().unique(),

    source: varchar255('source').default('external'),
    url: text('url'),
    ...timestamps,
  },
  (self) => ({
    activeIndex: index('neural_services_active_idx').on(self.isActive),
    slugIndex: index('neural_services_slug_idx').on(self.slug),
  }),
);

export const neuralServiceTags = pgTable(
  'neural_service_tags',
  {
    serviceId: text('service_id')
      .notNull()
      .references(() => neuralServices.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => neuralTags.id, { onDelete: 'cascade' }),
  },
  (self) => ({
    pk: primaryKey({ columns: [self.serviceId, self.tagId], name: 'neural_service_tags_pk' }),
  }),
);

export const neuralFavoriteServices = pgTable(
  'neural_favorite_services',
  {
    serviceId: text('service_id')
      .notNull()
      .references(() => neuralServices.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (self) => ({
    pk: primaryKey({
      columns: [self.userId, self.serviceId],
      name: 'neural_favorite_services_pk',
    }),
    userIndex: index('neural_favorite_services_user_idx').on(self.userId),
  }),
);

export const neuralFavoriteModels = pgTable(
  'neural_favorite_models',
  {
    modelId: text('model_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }), // OpenRouter model id
    ...timestamps,
  },
  (self) => ({
    pk: primaryKey({
      columns: [self.userId, self.modelId],
      name: 'neural_favorite_models_pk',
    }),
    userIndex: index('neural_favorite_models_user_idx').on(self.userId),
  }),
);

export type NeuralTag = typeof neuralTags.$inferSelect;
export type NewNeuralTag = typeof neuralTags.$inferInsert;

export type NeuralService = typeof neuralServices.$inferSelect;
export type NewNeuralService = typeof neuralServices.$inferInsert;

export type NeuralFavoriteService = typeof neuralFavoriteServices.$inferSelect;
export type NeuralFavoriteModel = typeof neuralFavoriteModels.$inferSelect;
