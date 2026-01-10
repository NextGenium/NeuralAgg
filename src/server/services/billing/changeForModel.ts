import { getModelCost } from './modelPricing';
import { UserCreditsService } from './userCredits';

export class InsufficientDiamondsError extends Error {
  diamonds: number;

  constructor(diamonds: number) {
    super('INSUFFICIENT_DIAMONDS');
    this.name = 'InsufficientDiamondsError';
    this.diamonds = diamonds;
  }
}

export class MonthlyLimitExceededError extends Error {
  monthlyLimit: number;
  monthlyUsed: number;

  constructor(monthlyLimit: number, monthlyUsed: number) {
    super('MONTHLY_LIMIT_EXCEEDED');
    this.name = 'MonthlyLimitExceededError';
    this.monthlyLimit = monthlyLimit;
    this.monthlyUsed = monthlyUsed;
  }
}

export const chargeForModelCall = async (userId: string, model: string) => {
  const cost = getModelCost(model);
  if (cost <= 0) return;

  try {
    await UserCreditsService.charge(userId, cost);
  } catch (e: any) {
    if (e?.code === 'INSUFFICIENT_DIAMONDS') {
      throw new InsufficientDiamondsError(e.diamonds ?? 0);
    }
    if (e?.code === 'MONTHLY-LIMIT_EXCEEDED') {
      throw new MonthlyLimitExceededError(e.monthlyLimit ?? 20_000, e.monthlyUsed ?? 0);
    }
    throw e;
  }
};
