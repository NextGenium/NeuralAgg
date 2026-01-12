import { NextRequest, NextResponse } from 'next/server';

import { GuestChainsStore } from '@/server/services/neural/guestChainsStore';
import {
  NeuralChainsService,
  NeuralChainsStepResult,
} from '@/server/services/neural/neuralChainsService';
import { getActor } from '@/server/utils/actor';

export const runtime = 'nodejs';

type CreateChainBody = {
  models: string[];
  prompt: string;
  results: NeuralChainsStepResult[];
};

export async function GET(req: NextRequest) {
  const { actor, setCookie } = await getActor(req);

  try {
    // ✅ USER: из БД
    if (actor.kind === 'user') {
      const chains = await NeuralChainsService.listChainsForUser(actor.id);
      const res = NextResponse.json({ chains }, { status: 200 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    // ✅ GUEST: из in-memory store
    const chains = GuestChainsStore.list(actor.id);
    const res = NextResponse.json({ chains }, { status: 200 });
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (e) {
    console.error('[GET /api/neural/chains] error', e);
    const res = NextResponse.json({ chains: [], warning: 'CHAINS_FALLBACK' }, { status: 200 });
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  }
}

export async function POST(req: NextRequest) {
  const { actor, setCookie } = await getActor(req);

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<CreateChainBody>;
    const prompt = (body.prompt ?? '').trim();
    const models = Array.isArray(body.models) ? body.models.filter(Boolean) : [];
    const results = Array.isArray(body.results) ? body.results : [];

    // ❗️никаких 400 — для демо возвращаем 200 + описание
    if (!prompt) {
      const res = NextResponse.json(
        { error: 'PROMPT_REQUIRED', message: 'Введите промпт для цепочки.', ok: false },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (!models.length) {
      const res = NextResponse.json(
        { error: 'MODELS_REQUIRED', message: 'Выберите хотя бы одну модель.', ok: false },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (!results.length) {
      const res = NextResponse.json(
        {
          error: 'RESULTS_REQUIRED',
          message: 'Нет результатов сравнения для сохранения.',
          ok: false,
        },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    // ✅ USER: БД
    if (actor.kind === 'user') {
      const { chain, step } = await NeuralChainsService.createChainWithFirstStep(actor.id, {
        models,
        prompt,
        results,
      });

      const res = NextResponse.json({ chain, ok: true, step }, { status: 201 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    // ✅ GUEST: in-memory
    const { chain, step } = GuestChainsStore.createWithFirstStep(actor.id, {
      models,
      prompt,
      results: results as any,
    });

    const res = NextResponse.json({ chain, ok: true, step }, { status: 201 });
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (e) {
    console.error('[POST /api/neural/chains] error', e);
    const res = NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Не удалось сохранить цепочку (fallback).', ok: false },
      { status: 200 },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  }
}

//import { NextRequest, NextResponse } from 'next/server';

//import {
//  NeuralChainsService,
//  NeuralChainsStepResult,
//} from '@/server/services/neural/neuralChainsService';
//import { getRequestUserIdOrThrow, handleUserError } from '@/server/utils/getRequestUserId';

//export const runtime = 'nodejs';

//type CreateChainBody = {
//  models: string[];
//  prompt: string;
//  results: NeuralChainsStepResult[];
//};

//export async function GET(req: NextRequest) {
//  try {
//    const userId = await getRequestUserIdOrThrow(req);
//    const chains = await NeuralChainsService.listChainsForUser(userId);

//    return NextResponse.json({ chains }, { status: 200 });
//  } catch (e) {
//   const userError = handleUserError(e);
//    if (userError) return userError;
//    console.error('[GET /api/neural/chains] error', e);
//    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 500 });
//  }
//}

//export async function POST(req: NextRequest) {
//  try {
//    const userId = await getRequestUserIdOrThrow(req);
//   const body = (await req.json()) as CreateChainBody;
//   const prompt = body.prompt?.trim();
//   const models = Array.isArray(body.models) ? body.models : [];
//   const results = Array.isArray(body.results) ? body.results : [];

//   if (!prompt) {
//     return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
//  }

//   if (!models.length) {
//     return NextResponse.json({ error: 'MODELS_REQUIRED' }, { status: 400 });
//   }

//    if (!results.length) {
//      return NextResponse.json({ error: 'RESULTS_REQUIRED' }, { status: 400 });
//    }

//    const { chain, step } = await NeuralChainsService.createChainWithFirstStep(userId, {
//      models,
//      prompt,
//      results,
//    });

//    return NextResponse.json(
//      {
//        chain,
//        step,
//      },
//      { status: 201 },
//    );
//  } catch (e) {
//    const userError = handleUserError(e);
//    if (userError) return userError;
//    console.error('[POST /api/neural/chains] error', e);
//    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
//  }
//}
//}
