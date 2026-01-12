import { NextRequest, NextResponse } from 'next/server';

import {
  InsufficientDiamondsError,
  MonthlyLimitExceededError,
  chargeForModelCall,
} from '@/server/services/billing/changeForModel';
import { getUserTier } from '@/server/services/billing/getUserTier';
import { BillingError, assertModelAllowed } from '@/server/services/billing/guard';
import { attachGuestCookies, chargeGuestDiamonds } from '@/server/services/billing/guestBilling';
import { getActor } from '@/server/utils/actor';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';

export const runtime = 'nodejs';

// ✅ минимум 5 алмазов за модель (гость)
const GUEST_COST_PER_MODEL = 5;

// ✅ дефолтные модели, если фронт прислал пусто
const DEFAULT_MODELS = (
  process.env.OPENROUTER_DEFAULT_MODELS ??
  'openai/gpt-4o-mini,anthropic/claude-3.5-sonnet,meta-llama/llama-3.1-8b-instruct,google/gemini-1.5-flash,deepseek/deepseek-chat'
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// ✅ алиасы UI → валидные OpenRouter ids
const MODEL_ALIASES: Record<string, string> = {
  'deepseek': 'deepseek/deepseek-chat',
  'deepseek/chat': 'deepseek/deepseek-chat',

  'gemini-flash': 'google/gemini-2.0-flash-001',
  'google/gemini-1.5-flash': 'google/gemini-1.5-flash',
  'google/gemini-2.0-flash': 'google/gemini-2.0-flash',
  'google/gemini-flash': 'google/gemini-2.0-flash-001',

  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',

  'kimi': 'moonshotai/kimi-v1-a3b-thinking',
  'kimi-llm': 'moonshotai/kimi-v1-a3b-thinking',
};

function normalizeOpenRouterModelId(input: string): string {
  const m = (input ?? '').trim();
  if (!m) return m;
  return MODEL_ALIASES[m] ?? m;
}

type MultiRequestBody = {
  models?: string[];
  prompt?: string;
};

type MultiResultItem = {
  error?: string;
  model: string; // то, что пришло с фронта
  normalizedModel: string; // то, что реально ушло в OpenRouter
  ok: boolean;
  output?: string;
};

async function callOpenRouterModel(model: string, prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error('OPENROUTER_API_KEY_NOT_CONFIGURED');

  const res = await fetch(OPENROUTER_API_URL, {
    body: JSON.stringify({
      messages: [{ content: prompt, role: 'user' }],
      model,
    }),
    headers: {
      // ✅ FIX: правильная строка
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010',
      'X-Title': 'NeuralAgg Multi-Compare',
    },
    method: 'POST',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter error [${res.status}]: ${text}`);
  }

  const json = (await res.json()) as any;

  const content =
    json?.choices?.[0]?.message?.content ?? json?.choices?.[0]?.message?.content?.[0]?.text ?? '';

  if (!content || typeof content !== 'string') throw new Error('Empty completion from model');

  return content;
}

export async function POST(req: NextRequest) {
  const { actor, setCookie } = await getActor(req);

  try {
    const body = (await req.json().catch(() => ({}))) as MultiRequestBody;

    const prompt = (body.prompt ?? '').trim();

    // ✅ модели: из body или дефолт
    const modelsRaw = Array.isArray(body.models) ? body.models : [];
    const models = modelsRaw.length
      ? Array.from(new Set(modelsRaw.filter((m) => !!m && typeof m === 'string')))
      : DEFAULT_MODELS;

    // ✅ НЕ 400: возвращаем 200 с понятным JSON
    if (!prompt) {
      const res = NextResponse.json(
        {
          error: 'PROMPT_REQUIRED',
          message: 'Введите промпт для сравнения моделей.',
          ok: false,
          prompt: '',
          results: [],
        },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    if (!models.length) {
      const res = NextResponse.json(
        {
          error: 'MODELS_REQUIRED',
          message: 'Выберите модели (или настройте OPENROUTER_DEFAULT_MODELS).',
          ok: false,
          prompt,
          results: [],
        },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    // ✅ FIX: нормальный лимит
    const MAX_MODELS = 8;
    if (models.length > MAX_MODELS) {
      const trimmed = models.slice(0, MAX_MODELS);
      const res = NextResponse.json(
        {
          message: `Вы выбрали ${models.length} моделей. Для демо сравним первые ${MAX_MODELS}.`,
          models: trimmed,
          ok: true,
          prompt,
          warning: 'TOO_MANY_MODELS',
        },
        { status: 200 },
      );
      if (setCookie) res.headers.set('Set-Cookie', setCookie);
      return res;
    }

    // ✅ GUEST MODE
    if (actor.kind === 'guest') {
      const totalCost = GUEST_COST_PER_MODEL * models.length;

      // списываем заранее за все модели
      const nextState = chargeGuestDiamonds(req, totalCost);

      const results: MultiResultItem[] = await Promise.all(
        models.map(async (model) => {
          const normalizedModel = normalizeOpenRouterModelId(model);
          try {
            const output = await callOpenRouterModel(normalizedModel, prompt);
            return { model, normalizedModel, ok: true, output };
          } catch (e: any) {
            return { error: e?.message ?? 'MODEL_ERROR', model, normalizedModel, ok: false };
          }
        }),
      );

      const res = NextResponse.json(
        {
          charged: totalCost,
          diamondsLeft: nextState.diamonds,
          guest: true,
          ok: true,
          prompt,
          results,
          tier: nextState.tier,
        },
        { status: 200 },
      );

      attachGuestCookies(res, nextState);
      if (setCookie) res.headers.append('Set-Cookie', setCookie);

      return res;
    }

    // ✅ AUTH MODE
    const userId = actor.id;
    const tier = await getUserTier(userId);

    const results: MultiResultItem[] = await Promise.all(
      models.map(async (model) => {
        const normalizedModel = normalizeOpenRouterModelId(model);
        try {
          // ВАЖНО: проверяем доступ/списание по нормализованной модели
          assertModelAllowed(tier, normalizedModel);
          await chargeForModelCall(userId, normalizedModel);

          const output = await callOpenRouterModel(normalizedModel, prompt);

          return { model, normalizedModel, ok: true, output };
        } catch (e: any) {
          if (e instanceof BillingError) {
            return { error: e.code, model, normalizedModel, ok: false };
          }

          if (e instanceof InsufficientDiamondsError) {
            return {
              error: `INSUFFICIENT_DIAMONDS:${e.diamonds ?? 0}`,
              model,
              normalizedModel,
              ok: false,
            };
          }

          if (e instanceof MonthlyLimitExceededError) {
            return {
              error: `MONTHLY_LIMIT_EXCEEDED:${e.monthlyUsed}/${e.monthlyLimit}`,
              model,
              normalizedModel,
              ok: false,
            };
          }

          if (e?.message === 'OPENROUTER_API_KEY_NOT_CONFIGURED') {
            return {
              error: 'OPENROUTER_API_KEY_NOT_CONFIGURED',
              model,
              normalizedModel,
              ok: false,
            };
          }

          return { error: e?.message ?? 'MODEL_ERROR', model, normalizedModel, ok: false };
        }
      }),
    );

    const res = NextResponse.json({ ok: true, prompt, results }, { status: 200 });
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  } catch (e: any) {
    console.error('[POST /api/neural/multi] error', e);

    // ✅ никогда не 500 для демо
    const res = NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: e?.message ?? 'Unexpected error',
        ok: false,
        prompt: '',
        results: [],
      },
      { status: 200 },
    );
    if (setCookie) res.headers.set('Set-Cookie', setCookie);
    return res;
  }
}

//const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
//const OPENROUTER_API_URL =
//  process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';

//if (!OPENROUTER_API_KEY) {
//  console.warn(
//    '[api/neural/multi] OPENROUTER_API_KEY is not set. Multi-model compare will not work.',
//  );
//}

//export const runtime = 'nodejs';

//type MultiRequestBody = {
//  models: string[];
//  prompt: string;
//};

//type MultiResultItem = {
//  error?: string;
//  model: string;
//  ok: boolean;
//  output?: string;
//};

//async function callOpenRouterModel(model: string, prompt: string): Promise<string> {
//  if (!OPENROUTER_API_KEY) {
//    throw new Error('OPENROUTER_API_KEY_NOT_CONFIGURED');
//  }

//  const res = await fetch(OPENROUTER_API_URL, {
//    body: JSON.stringify({
//      messages: [
//        {
//          content: prompt,
//          role: 'user',
//        },
//      ],
//      model,
//    }),
//    headers: {
//      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
//      'Content-Type': 'application/json',
//      'HTTP-Referer': 'http://localhost:3010',
//      'X-Title': 'NeuralAgg Multi-Compare',
//    },
//    method: 'POST',
//  });

//  if (!res.ok) {
//    const text = await res.text();
//    throw new Error(`OpenRouter error [${res.status}]: ${text}`);
//  }

//  const json = (await res.json()) as any;

//  const content =
//    json?.choices?.[0].message?.content ?? json?.choices?.[0]?.message?.content?.[0]?.text ?? '';

//  if (!content || typeof content !== 'string') {
//    throw new Error('Empty completion from model');
//  }
//  return content;
//}

//export async function POST(req: NextRequest) {
//  try {
//    const body = (await req.json()) as MultiRequestBody;

//    const prompt = body.prompt?.trim();
//    const models = Array.isArray(body.models)
//      ? Array.from(new Set(body.models.filter((m) => !!m && typeof m === 'string')))
//      : [];

//    if (!prompt) {
//      return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
//    }

//    if (!models.length) {
//      return NextResponse.json({ error: 'MODELS_REQUIRED' }, { status: 400 });
//    }

//    if (models.length > 8) {
//      return NextResponse.json({ error: 'TOO_MANY_REQUIRED' }, { status: 400 });
//    }

//    const userId = await getRequestUserId(req);
//    const tier = userId ? await getUserTier(userId) : 'starter';

//    const results: MultiResultItem[] = await Promise.all(
//      models.map(async (model) => {
//        try {
// ✅ Starter/Creator model access check
//          assertModelAllowed(tier, model);

//          if (userId) {
//            await chargeForModelCall(userId, model);
//          }

//          const output = await callOpenRouterModel(model, prompt);

//          return {
//            model,
//            ok: true,
//            output,
//          };
//        } catch (e: any) {
//          console.error(`[api/neural/multi] model "${model}" failed:`, e);

// ✅ тарифные ошибки (Starter запрет, Creator monthly limit, etc.)
//          if (e instanceof BillingError) {
//            return {
//              error: e.code,
//              model,
//              ok: false,
//            };
//          }

//          if (e instanceof InsufficientDiamondsError) {
//            return {
//              error: `Insufficient diamonds (current balance: ${e.diamonds ?? 0})`,
//              model,
//              ok: false,
//            };
//          }

//          if (e instanceof MonthlyLimitExceededError) {
//            return {
//              error: `Monthly limit exceeded (${e.monthlyUsed}/${e.monthlyLimit})`,
//              model,
//              ok: false,
//            };
//          }

//          if (e?.message === 'OPENROUTER_API_KEY_NOT_CONFIGURED') {
//            return {
//              error: 'OpenRouter API key is not configured on the server.',
//              model,
//              ok: false,
//            };
//          }

//          return {
//            error: e?.message ?? 'Error loading model',
//            model,
//            ok: false,
//          };
//        }
//      }),
//    );

//    return NextResponse.json(
//      {
//        prompt,
//        results,
//      },
//      { status: 200 },
//    );
//  } catch (e: any) {
//    if (
//      e?.message === 'UNAUTHORIZED' ||
//      e?.code === 'UNAUTHORIZED' ||
//      e?.message === 'USER_NOT-AUTHENTICATED'
//    ) {
//      return NextResponse.json({ error: 'UNAUTHORIZED'}, { status: 401 });
//    }
//    console.error('[POST /api/neural/multi] error', e);
//    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
//  }
//}
