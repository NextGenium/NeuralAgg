import { eq } from 'drizzle-orm';

import { userCredits } from '@/database/schemas/userCredits';
import { serverDB } from '@/database/server';

export type UserTier = 'starter' | 'creator' | 'admin';

const STARTER_INITIAL_DIAMONDS = 1000;
export const UserCreditsService = {
  async changeBalance(userId: string, delta: number) {
    const db = serverDB;

    const current = await this.getOrCreateForUser(userId);
    const next = Math.max(0, (current.diamondsBalance ?? 0) + delta);

    const [updated] = await db
      .update(userCredits)
      .set({
        diamondsBalance: next,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))
      .returning();

    return updated;
  },

  async charge(userId: string, cost: number) {
    if (cost <= 0) return this.getOrCreateForUser(userId);

    const db = serverDB;

    const row = await this.getOrCreateForUser(userId);

    if (row.tier === 'admin') {
      return row;
    }

    if ((row.diamondsBalance ?? 0) < cost) {
      const error: any = new Error('INSUFFICIENT_DIAMONDS');
      error.code = 'INSUFFICIENT_DIAMONDS';
      error.diamonds = row.diamondsBalance ?? 0;
      throw error;
    }

    const [updated] = await db
      .update(userCredits)
      .set({
        diamondsBalance: (row.diamondsBalance ?? 0) - cost,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId))
      .returning();

    return updated;
  },

  async getBalance(userId: string) {
    const row = await this.getOrCreateForUser(userId);

    return {
      createdAt: row.createdAt,
      diamonds: row.diamondsBalance,
      monthlyLimit: row.monthlyLimit,
      periodStartAt: row.periodStartAt,
      tier: row.tier as UserTier,
      updatedAt: row.updatedAt,
    };
  },

  async getOrCreateForUser(userId: string) {
    const db = serverDB;

    const [row] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (row) return row;

    const [created] = await db
      .insert(userCredits)
      .values({
        diamondsBalance: STARTER_INITIAL_DIAMONDS,
        monthlyLimit: 0,
        tier: 'starter',
        userId,
      })
      .returning();

    return created;
  },

  async initStarterForUser(userId: string) {
    const db = serverDB;

    const [existing] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1);

    if (existing) return existing;

    const [created] = await db
      .insert(userCredits)
      .values({
        diamondsBalance: STARTER_INITIAL_DIAMONDS,
        monthlyLimit: 0,
        tier: 'starter',
        userId,
      })
      .returning();

    return created;
  },
};
