import { NextRequest, NextResponse } from 'next/server';

import { GuestChainsStore } from '@/server/services/neural/guestChainsStore';
import {
  NeuralChainsService,
  NeuralChainsStepResult,
} from '@/server/services/neural/neuralChainsService';
import { getActor } from '@/server/utils/actor';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

type AppendStepBody = {
  models: string[];
  prompt: string;
  results: NeuralChainsStepResult[];
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { actor, setCookie } = await getActor(req);
  const { id } = await context.params;

  try {
    if (actor.kind === 'user') {
      const chainWithSteps = await NeuralChainsService.getChainWithSteps(id, actor.id);
      if (!chainWithSteps) {
        const res = NextResponse.json({ error: 'NOT_FOUND', ok: false }, { status: 200 });
        if (setCookie) res.headers.set('Set-Cookie', setCookie);
        return res;
      }
      const res = NextResponse.json({ ok: true, ...chainWithSteps }, { status: 200 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    const data = GuestChainsStore.get(actor.id, id);
    if (!data) {
      const res = NextResponse.json({ error: 'NOT_FOUND', ok: false }, { status: 200 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    const res = NextResponse.json(
      { chain: data.chain, ok: true, steps: data.steps },
      { status: 200 },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (e) {
    console.error('[GET /api/neural/chains/[id]] error', e);
    const res = NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Не удалось загрузить цепочку.', ok: false },
      { status: 200 },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { actor, setCookie } = await getActor(req);
  const { id } = await context.params;

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<AppendStepBody>;
    const prompt = (body.prompt ?? '').trim();
    const models = Array.isArray(body.models) ? body.models.filter(Boolean) : [];
    const results = Array.isArray(body.results) ? body.results : [];

    if (!prompt) {
      const res = NextResponse.json(
        { error: 'PROMPT_REQUIRED', message: 'Введите промпт шага.', ok: false },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (!models.length) {
      const res = NextResponse.json(
        { error: 'MODELS_REQUIRED', message: 'Выберите модели для шага.', ok: false },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (!results.length) {
      const res = NextResponse.json(
        { error: 'RESULTS_REQUIRED', message: 'Нет результатов шага для сохранения.', ok: false },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (actor.kind === 'user') {
      const { chain, step } = await NeuralChainsService.appendStep(actor.id, id, {
        models,
        prompt,
        results,
      });

      const res = NextResponse.json({ chain, ok: true, step }, { status: 201 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    const appended = GuestChainsStore.appendStep(actor.id, id, {
      models,
      prompt,
      results: results as any,
    });

    if (!appended) {
      const res = NextResponse.json({ error: 'NOT_FOUND', ok: false }, { status: 200 });
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    const res = NextResponse.json(
      { chain: appended.chain, ok: true, step: appended.step },
      { status: 201 },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (e) {
    console.error('[POST /api/neural/chains/[id]] error', e);
    const res = NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Не удалось сохранить шаг цепочки.', ok: false },
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

//type RouteContext = {
// params: Promise<{ id: string }>;
//};

//type AppendStepBody = {
//  models: string[];
//  prompt: string;
// results: NeuralChainsStepResult[];
//};

//export async function GET(req: NextRequest, context: RouteContext) {
// try {
//   const userId = await getRequestUserIdOrThrow(req);
//   const { id } = await context.params;
//   const chainWithSteps = await NeuralChainsService.getChainWithSteps(id, userId);

//   if (!chainWithSteps) {
//     return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
//  }

//  return NextResponse.json(chainWithSteps, { status: 200 });
// } catch (e) {
//   const userError = handleUserError(e);
//  if (userError) return userError;
//  console.error('[GET /api/neural/chains[id]] error', e);
//  return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
// }
//}

//export async function POST(req: NextRequest, context: RouteContext) {
// try {
//   const userId = await getRequestUserIdOrThrow(req);
//   const { id } = await context.params;
//   const body = (await req.json()) as AppendStepBody;
//  const prompt = body.prompt?.trim();
//  const models = Array.isArray(body.models) ? body.models : [];
//   const results = Array.isArray(body.results) ? body.results : [];

//   if (!prompt) {
//     return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
//   }

//   if (!models.length) {
//     return NextResponse.json({ error: 'MODELS_REQUIRED' }, { status: 400 });
//   }

//   if (!results.length) {
//     return NextResponse.json({ error: 'RESULTS_REQUIRED' }, { status: 400 });
//   }

//   const { chain, step } = await NeuralChainsService.appendStep(userId, id, {
//     models,
//     prompt,
//     results,
//   });

//   return NextResponse.json(
//     {
//       chain,
//       step,
//     },
//     { status: 201 },
//   );
//  } catch (e: any) {
//    const userError = handleUserError(e);
//    if (userError) return userError;
//    console.error('[POST /api/neural/chains/[id]] error', e);
//    if (e?.message === 'CHAIN_NOT_FOUND_OR_FORBIDDEN') {
//      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
//    }
//    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
//  }
//}
