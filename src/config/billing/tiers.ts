export type Tier = 'starter' | 'creator' | 'admin';

export type TierPolicy = {
  allowedModels: string[] | 'all';
  id: Tier;
  maxChainSteps: number;
  monthlyDiamondsLimit?: number;
  signupBonusDiamonds: number;
  title: string;
};

export const TIERS: Record<Tier, TierPolicy> = {
  admin: {
    allowedModels: 'all',
    id: 'admin',
    maxChainSteps: 999,
    monthlyDiamondsLimit: 999_999_999,
    signupBonusDiamonds: 0,
    title: 'Admin',
  },
  creator: {
    allowedModels: 'all',
    id: 'creator',
    maxChainSteps: 999,
    monthlyDiamondsLimit: 20_000,
    signupBonusDiamonds: 0,
    title: 'Creator Light',
  },
  starter: {
    allowedModels: ['deepseek/chat', 'kimi/chat', 'google/gemini-flash'],
    id: 'starter',
    maxChainSteps: 3,
    signupBonusDiamonds: 1000,
    title: 'Starter',
  },
};
