import { TIERS, Tier } from '@/config/billing/tiers';

export class BillingError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 400, message?: string) {
    super(message || code);
    this.code = code;
    this.status = status;
  }
}

export const assertModelAllowed = (tier: Tier, model: string) => {
  const policy = TIERS[tier];

  if (policy.allowedModels === 'all') return;

  if (!policy.allowedModels.includes(model)) {
    throw new BillingError('MODEL_NOT_ALLOWED_FOR_TIER', 403);
  }
};

export const assertChainStepsAllowed = (tier: Tier, stepIndex: number) => {
  const policy = TIERS[tier];

  if (stepIndex > policy.maxChainSteps) {
    throw new BillingError('CHAIN_STEP_LIMIT', 403, `Max steps: ${policy.maxChainSteps}`);
  }
};
