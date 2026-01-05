import { NextRequest, NextResponse } from 'next/server';

import { InsufficientDiamondsError } from '@/server/billing/changeForModel';
import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';
import { recommendServices } from '@/services/neuralRecommend';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserIdOrThrow(req);

    const body = await req.json();
    const query: string | undefined = body.query;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const result = await recommendServices(query.trim(), userId);

    return NextResponse.json(result, { status: 200 });
  } catch (e: any) {
    if (e instanceof InsufficientDiamondsError) {
      return NextResponse.json(
        {
          diamonds: e.diamonds,
          error: 'INSUFFICIENT_DIAMONDS',
        },
        { status: 402 },
      );
    }

    // если getRequestUserIdOrThrow выбросил — это 401
    if (e?.message === 'UNAUTHORIZED' || e?.code === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    console.error('Neural recommend API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
