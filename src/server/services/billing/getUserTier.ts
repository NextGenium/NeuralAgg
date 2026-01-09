import { Tier } from '@/config/billing/tiers';
import { UserCreditsService } from '@/server/services/billing/userCredits';

export const getUserTier = async (userId: string): Promise<Tier> => {
  const row = await UserCreditsService.getOrCreateForUser(userId);
  return (row.tier as Tier) ?? 'starter';
};
