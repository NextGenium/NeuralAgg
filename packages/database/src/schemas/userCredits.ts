import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from '@/database/schemas/user';

export const userTierEnum = pgEnum('user_tier', ['starter', 'creator', 'admin']);

export const userCredits = pgTable('user_credits', {
  createdAt: timestamp('created_at', { withTimezone: false }).notNull().defaultNow(),

  diamondsBalance: integer('diamonds_balance').notNull().default(0),
  monthlyLimit: integer('monthly_limit').notNull().default(0),
  monthlyResetAt: timestamp('monthly_reset_at', { mode: 'date' }).notNull().defaultNow(),
  monthlyUsed: integer('monthly_used').notNull().default(0),
  periodStartAt: timestamp('period_start_at', { withTimezone: false }),

  tier: userTierEnum('tier').notNull().default('starter'),
  updatedAt: timestamp('updated_at', { withTimezone: false }).notNull().defaultNow(),
  userId: text('user_id')
    .primaryKey()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
