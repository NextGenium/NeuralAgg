import { eq } from 'drizzle-orm';

import { TIERS, type Tier } from '@/config/billing/tiers';
import { userCredits } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { BillingError } from '@/server/services/billing/guard';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const isPastResetWindow = (resetAt: Date) => {
  return Date.now() - resetAt.getTime() > 30 * MS_PER_DAY;
};

export async function chargeDiamonds(userId: string, cost: number) {
  if (!cost || cost <= 0) return;

  const db = serverDB;

  const [row] = await db.select().from(userCredits).where(eq(userCredits.userId, userId)).limit(1);

  if (!row) throw new BillingError('CREDITS_NOT_FOUND', 500);

  const tier = (row.tier ?? 'starter') as Tier;

  // админ не платит
  if (tier === 'admin') return;

  const policy = TIERS[tier];

  const diamondsBalance = row.diamondsBalance ?? 0;

  // ✅ Creator: тратим monthlyUsed, не баланс
  if (policy.monthlyDiamondsLimit) {
    let monthlyUsed = row.monthlyUsed ?? 0;
    let monthlyResetAt = row.monthlyResetAt ?? new Date();

    // сброс "месяца"
    if (isPastResetWindow(monthlyResetAt)) {
      monthlyUsed = 0;
      monthlyResetAt = new Date();
    }

    // лимит: либо из policy, либо (если хотите) можно брать из row.monthlyLimit
    const limit = policy.monthlyDiamondsLimit;

    if (monthlyUsed + cost > limit) {
      throw new BillingError('MONTHLY_LIMIT_EXCEEDED', 402);
    }

    await db
      .update(userCredits)
      .set({
        monthlyResetAt,
        monthlyUsed: monthlyUsed + cost,
        updatedAt: new Date(),
      })
      .where(eq(userCredits.userId, userId));

    return;
  }

  // ✅ Starter: тратим diamondsBalance
  if (diamondsBalance < cost) {
    throw new BillingError('INSUFFICIENT_DIAMONDS', 402);
  }

  await db
    .update(userCredits)
    .set({
      diamondsBalance: diamondsBalance - cost,
      updatedAt: new Date(),
    })
    .where(eq(userCredits.userId, userId));
}
