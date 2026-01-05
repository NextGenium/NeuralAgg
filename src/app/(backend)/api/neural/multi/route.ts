import { NextRequest, NextResponse } from 'next/server';

import { InsufficientDiamondsError, chargeForModelCall } from '@/server/billing/changeForModel';
import { getRequestUserIdOrThrow } from '@/server/utils/getRequestUserId';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL =
  process.env.OPENROUTER_API_URL ?? 'https://openrouter.ai/api/v1/chat/completions';

if (!OPENROUTER_API_KEY) {
  console.warn(
    '[api/neural/multi] OPENROUTER_API_KEY is not set. Multi-model compare will not work.',
  );
}

export const runtime = 'nodejs';

type MultiRequestBody = {
  models: string[];
  prompt: string;
};

type MultiResultItem = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

async function callOpenRouterModel(model: string, prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY_NOT_CONFIGURED');
  }

  const res = await fetch(OPENROUTER_API_URL, {
    body: JSON.stringify({
      messages: [
        {
          content: prompt,
          role: 'user',
        },
      ],
      model,
    }),
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3010',
      'X-Title': 'NeuralAgg Multi-Compare',
    },
    method: 'POST',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error [${res.status}]: ${text}`);
  }

  const json = (await res.json()) as any;

  const content =
    json?.choices?.[0].message?.content ?? json?.choices?.[0]?.message?.content?.[0]?.text ?? '';

  if (!content || typeof content !== 'string') {
    throw new Error('Empty completion from model');
  }
  return content;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MultiRequestBody;

    const prompt = body.prompt?.trim();
    const models = Array.isArray(body.models)
      ? Array.from(new Set(body.models.filter((m) => !!m && typeof m === 'string')))
      : [];

    if (!prompt) {
      return NextResponse.json({ error: 'PROMPT_REQUIRED' }, { status: 400 });
    }

    if (!models.length) {
      return NextResponse.json({ error: 'MODELS_REQUIRED' }, { status: 400 });
    }

    if (models.length > 8) {
      return NextResponse.json({ error: 'TOO_MANY_REQUIRED' }, { status: 400 });
    }

    const userId = await getRequestUserIdOrThrow(req);

    const results: MultiResultItem[] = await Promise.all(
      models.map(async (model) => {
        try {
          await chargeForModelCall(userId, model);

          const output = await callOpenRouterModel(model, prompt);

          return {
            model,
            ok: true,
            output,
          };
        } catch (e: any) {
          console.error(`[api/neural/multi] model "${model}" failed:`, e);

          if (e instanceof InsufficientDiamondsError) {
            return {
              error: `Insufficient diamonds (current balance: ${e.diamonds ?? 0})`,
              model,
              ok: false,
            };
          }

          if (e?.message === 'OPENROUTER_API_KEY_NOT_CONFIGURED') {
            return {
              error: 'OpenRouter API key is not configured on the server.',
              model,
              ok: false,
            };
          }

          return {
            error: e?.message ?? 'Error loading model',
            model,
            ok: false,
          };
        }
      }),
    );

    return NextResponse.json(
      {
        prompt,
        results,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[POST /api/neural/multi] error', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
