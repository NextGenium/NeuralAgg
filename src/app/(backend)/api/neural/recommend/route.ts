import { NextRequest, NextResponse } from 'next/server';

import { recommendServices } from '@/services/neuralRecommend';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query: string | undefined = body.query;

    if (!query || query.trim()) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const result = await recommendServices(query.trim());

    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    console.error('Neural recommend API error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
