import { NextRequest, NextResponse } from 'next/server';

import {
  NeuralChainsService,
  NeuralChainsStepResult,
} from '@/server/services/neural/neuralChainsService';
import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';

export const runtime = 'nodejs';

type CreateChainBody = {
  models: string[];
  prompt: string;
  results: NeuralChainsStepResult[];
};

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const chains = await NeuralChainsService.listChainsForUser(userId);

    return NextResponse.json({ chains }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/neural/chains] error', e);
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const body = (await req.json()) as CreateChainBody;
    const prompt = body.prompt?.trim();
    const models = Array.isArray(body.models) ? body.models : [];
    const results = Array.isArray(body.results) ? body.results : [];

    if (!prompt) {
      return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
    }

    if (!models.length) {
      return NextResponse.json({ error: 'MODELS_REQUIRED' }, { status: 400 });
    }

    if (!results.length) {
      return NextResponse.json({ error: 'RESULTS_REQUIRED' }, { status: 400 });
    }

    const { chain, step } = await NeuralChainsService.createChainWithFirstStep(userId, {
      models,
      prompt,
      results,
    });

    return NextResponse.json(
      {
        chain,
        step,
      },
      { status: 201 },
    );
  } catch (e) {
    console.error('[POST /api/neural/chains] error', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
