import { NextResponse } from 'next/server';

import { UserCreditsService } from '@/server/services/billing/userCredits';
import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const userId = await getRequestUserIdOrThrow(req);

    const balance = await UserCreditsService.getBalance(userId);

    return NextResponse.json(
      {
        diamonds: balance.diamonds,
        monthlyLimit: balance.monthlyLimit,
        periodStartAt: balance.periodStartAt,
        tier: balance.tier,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[GET /api/billing/credits] error', e);
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}
