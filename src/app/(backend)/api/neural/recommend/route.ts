import { NextRequest, NextResponse } from 'next/server';

//import { auth } from '@/auth';
import { InsufficientDiamondsError } from '@/server/services/billing/changeForModel';
import { attachGuestCookies, chargeGuestDiamonds } from '@/server/services/billing/guestBilling';
import { safeGetUserId } from '@/server/utils/safeAuthSession';
import recommendServices from '@/services/neuralRecommend';

export const runtime = 'nodejs';

// ✅ фиксированная цена нейро-гида в госте
const GUEST_RECOMMEND_COST = 10;

async function getUserId(req: NextRequest): Promise<string | null> {
  return safeGetUserId(req);
  //const session = await auth.api.getSession({ headers: req.headers });
  //return session?.user?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query: string | undefined = body.query;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const userId = await getUserId(req);

    // ✅ GUEST MODE: списываем cookie и вызываем recommend без userId (чтобы он не лез в billing DB)
    if (!userId) {
      const nextState = chargeGuestDiamonds(req, GUEST_RECOMMEND_COST);

      const result = await recommendServices(query.trim(), undefined);

      const res = NextResponse.json(
        {
          ...result,
          charged: GUEST_RECOMMEND_COST,
          diamondsLeft: nextState.diamonds,
          guest: true,
          tier: nextState.tier,
        },
        { status: 200 },
      );

      attachGuestCookies(res, nextState);
      return res;
    }

    // ✅ AUTH MODE
    const result = await recommendServices(query.trim(), userId);
    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    if (e instanceof InsufficientDiamondsError) {
      return NextResponse.json(
        { diamonds: e.diamonds, error: 'INSUFFICIENT_DIAMONDS' },
        { status: 402 },
      );
    }

    console.error('Neural recommend API error:', e);
    // ✅ для демо не уходим в 500
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 200 });
  }
}
