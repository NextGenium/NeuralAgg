import { NextRequest, NextResponse } from 'next/server';

import {
  NeuralChainsService,
  NeuralChainsStepResult,
} from '@/server/services/neural/neuralChainsService';
import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type AppendStepBody = {
  models: string[];
  prompt: string;
  results: NeuralChainsStepResult[];
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const { id } = await context.params;
    const chainWithSteps = await NeuralChainsService.getChainWithSteps(id, userId);

    if (!chainWithSteps) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(chainWithSteps, { status: 200 });
  } catch (e) {
    console.error('[GET /api/neural/chains[id]] error', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const { id } = await context.params;
    const body = (await req.json()) as AppendStepBody;
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

    const { chain, step } = await NeuralChainsService.appendStep(userId, id, {
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
  } catch (e: any) {
    console.error('[POST /api/neural/chains/[id]] error', e);
    if (e?.message === 'CHAIN_NOT_FOUND_OR_FORBIDDEN') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
