import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

//import { auth } from '@/auth';
import { userCredits } from '@/database/schemas';
import { serverDB } from '@/database/server';
import {
  GUEST_DEFAULT_DIAMONDS,
  GUEST_TIER,
  attachGuestCookies,
  readGuestState,
} from '@/server/services/billing/guestBilling';
import { UserCreditsService } from '@/server/services/billing/userCredits';
import { safeGetUserId } from '@/server/utils/safeAuthSession';

export const runtime = 'nodejs';

async function getUserId(req: NextRequest): Promise<string | null> {
  return safeGetUserId(req);
  //const session = await auth.api.getSession({ headers: req.headers });
  //return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req);

    // ✅ GUEST MODE
    if (!userId) {
      const state = readGuestState(req);

      const res = NextResponse.json(
        {
          diamonds: state.diamonds,
          monthlyLimit: 0,
          monthlyUsed: 0,
          periodStartAt: null,
          tier: state.tier,
        },
        { status: 200 },
      );

      // если это первый заход — поставим cookies
      if (state.isNew) attachGuestCookies(res, state);

      return res;
    }

    // ✅ AUTH MODE
    // если записи нет — создаём дефолт (1000 diamonds, starter)
    let balance: any;
    try {
      balance = await UserCreditsService.getBalance(userId);
    } catch {
      // fallback если сервис кидает CREDITS_NOT_FOUND или что-то похожее
      const db = serverDB;

      const [row] = await db
        .select()
        .from(userCredits)
        .where(eq(userCredits.userId, userId))
        .limit(1);

      if (!row) {
        await db.insert(userCredits).values({
          diamondsBalance: GUEST_DEFAULT_DIAMONDS,
          monthlyLimit: 0,
          monthlyUsed: 0,
          tier: GUEST_TIER,
          userId,
          // monthlyResetAt/createdAt/updatedAt имеют defaultNow в схеме
        });

        balance = await UserCreditsService.getBalance(userId);
      } else {
        balance = await UserCreditsService.getBalance(userId);
      }
    }

    return NextResponse.json(
      {
        diamonds: balance.diamonds,
        monthlyLimit: balance.monthlyLimit,
        monthlyUsed: balance.monthlyUsed,
        periodStartAt: balance.periodStartAt,
        tier: balance.tier,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[GET /api/billing/credits] error', e);
    // Важно: не 500 и не HTML
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 200 });
  }
}

//export const runtime = 'nodejs';

//const GUEST_STARTER_DIAMONDS = 1000;

//export async function GET(req: Request) {
//  try {
//    const userId = await getRequestUserId(req);

// ✅ Гость: даём “виртуальный Starter”
//    if (!userId) {
//      return NextResponse.json(
//        {
//          diamonds: GUEST_STARTER_DIAMONDS,
//          guest: true,
//          monthlyLimit: 0,
//          periodStartAt: null,
//          tier: 'starter',
//        },
//        { status: 200 },
//      );
//    }

// ✅ Авторизован: реальный баланс из БД
//    const balance = await UserCreditsService.getBalance(userId);

//    return NextResponse.json(
//      {
//        diamonds: balance.diamonds,
//        guest: false,
//        monthlyLimit: balance.monthlyLimit,
//        periodStartAt: balance.periodStartAt,
//        tier: balance.tier,
//     },
//      { status: 200 },
//    );
//  } catch (e) {
//    console.error('[GET /api/billing/credits] error', e);
//    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
//  }
//}
