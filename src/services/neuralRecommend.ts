import { chargeForModelCall } from '@/server/services/billing/changeForModel';
import { NeuralCatalogService } from '@/services/neuralCatalog';

export interface NeuralRecommendationItem {
  reason?: string;
  score?: number;
  slug: string;
}

export interface NeuralRecommendationResult {
  items: (NeuralRecommendationItem & {
    service?: {
      iconUrl?: string | null;
      id: string;
      name: string;
      shortDesc?: string | null;
      slug: string;
      source?: string | null;
      tags?: { name: string; slug: string }[];
      url?: string | null;
    };
  })[];
  rawModelOutput?: string;
}

const extractJson = (text: string): any | null => {
  try {
    const trimmed = text.trim();

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return JSON.parse(trimmed);
    }

    const jsonBlockMatch = trimmed.match(/```json([\S\s]*?)```/i);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      return JSON.parse(jsonBlockMatch[1].trim());
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const maybeJson = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(maybeJson);
    }

    return null;
  } catch {
    return null;
  }
};

// ⚠️ теперь принимаем userId (для списания алмазов)
export const recommendServices = async (
  query: string,
  userId?: string,
): Promise<NeuralRecommendationResult> => {
  const services = await NeuralCatalogService.listServices({ activeOnly: true });

  if (!services.length) {
    return { items: [] };
  }

  const servicesSummary = services
    .map((s) => {
      const tags = (s.tags ?? []).map((t) => t.slug).join(',');
      const desc = s.shortDesc?.replace(/\s+/g, ' ').slice(0, 200) ?? '';
      return `${s.slug} | ${s.name} | tags: ${tags || '-'} | ${desc}`;
    })
    .join('\n');

  const systemPrompt = `
Ты — рекомендательный бот агрегатора нейросетевых сервисов.

Тебе дан список сервисов, каждый в формате:
slug | name | tags | description

Список сервисов:
${servicesSummary}

Твоя задача:
1. По запросу пользователя подобрать от 1 до 5 лучших сервисов из списка.
2. Оценивать релевантность по:
   - назначению сервиса,
   - описанию,
   - тегам,
   - общему контексту запроса.

Формат ответа СТРОГО только JSON (без пояснений, без markdown, без текста вокруг):

{
  "items": [
    {
      "slug": "<slug существующего сервиса>",
      "score": 0.0-1.0,
      "reason": "краткое объяснение на русском"
    }
  ]
}
`.trim();

  const userPrompt = `Запрос пользователя: "${query}"`;

  const apiKey = process.env.OPENROUTER_API_KEY;

  // если ключа нет — fallback без модели и без списания алмазов
  if (!apiKey) {
    const q = query.toLowerCase();
    const scored = services
      .map((s) => {
        const haystack = `${s.name} ${s.shortDesc ?? ''} ${(s.tags ?? [])
          .map((t) => `${t.name} ${t.slug}`)
          .join(' ')}`.toLowerCase();

        let score = 0;
        if (haystack.includes(q)) score += 2;
        if (q.split(/\s+/).some((w) => haystack.includes(w))) score += 1;
        return { score, service: s };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      items: scored.map((x) => ({
        reason: 'Подбор по простому текстовому совпадению (fallback без модели).',
        score: x.score,
        service: {
          iconUrl: x.service.iconUrl,
          id: x.service.id,
          name: x.service.name,
          shortDesc: x.service.shortDesc,
          slug: x.service.slug,
          source: x.service.source,
          tags: x.service.tags,
          url: x.service.url,
        },
        slug: x.service.slug,
      })),
      rawModelOutput: undefined,
    };
  }

  const model =
    process.env.OPENROUTER_RECOMMENDER_MODEL || 'openrouter/anthropic/claude-3.5-sonnet';

  // 💎 списание алмазов за запрос к рекомендателю (если есть userId)
  if (userId) {
    await chargeForModelCall(userId, model);
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    body: JSON.stringify({
      messages: [
        { content: systemPrompt, role: 'system' },
        { content: userPrompt, role: 'user' },
      ],
      model,
      temperature: 0.2,
    }),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
      'X-Title': 'NeuralAgg Recommender',
    },
    method: 'POST',
  });

  if (!response.ok) {
    console.error('OpenRouter recommend error:', response.status, await response.text());
    return { items: [] };
  }

  const data: any = await response.json();
  const rawText: string =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.content?.[0]?.text ?? '';

  const parsed = extractJson(rawText) ?? { items: [] };
  const items: NeuralRecommendationItem[] = Array.isArray(parsed.items) ? parsed.items : [];

  const mapBySlug = new Map(services.map((s) => [s.slug, s]));

  const enriched = items
    .map((item) => {
      const svc = mapBySlug.get(item.slug);
      if (!svc) return null;
      return {
        ...item,
        service: {
          iconUrl: svc.iconUrl,
          id: svc.id,
          name: svc.name,
          shortDesc: svc.shortDesc,
          slug: svc.slug,
          source: svc.source,
          tags: svc.tags,
          url: svc.url,
        },
      };
    })
    .filter(Boolean) as NeuralRecommendationResult['items'];

  return {
    items: enriched,
    rawModelOutput: rawText,
  };
};
