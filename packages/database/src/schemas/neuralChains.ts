import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from '@/database/schemas/user';

export const neuralChains = pgTable('neural_chains', {
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  id: uuid('id').primaryKey().defaultRandom(),
  summary: text('summary'),
  title: text('title'),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

export const neuralChainSteps = pgTable('neutral_chain_steps', {
  chainId: uuid('chain_id')
    .notNull()
    .references(() => neuralChains.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),
  id: uuid('id').primaryKey().defaultRandom(),
  index: integer('index').notNull(),
  models: jsonb('models').$type<string[]>().notNull(),
  prompt: text('prompt').notNull(),

  results: jsonb('results')
    .$type<
      {
        error?: string;
        model: string;
        ok: boolean;
        output?: string;
      }[]
    >()
    .notNull(),
});
