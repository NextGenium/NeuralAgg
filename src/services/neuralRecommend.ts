import { chargeForModelCall } from '@/server/services/billing/changeForModel';
import { DEFAULT_SERVICES } from '@/services/defaultCatalog';
import { NeuralCatalogService } from '@/services/neuralCatalog';

export interface NeuralRecommendationItem {
  reason?: string;
  score?: number;
  slug: string;
}

interface ServiceTag {
  name: string;
  slug: string;
}

interface CatalogService {
  active?: boolean;
  iconUrl?: string | null;
  id: string;
  name: string;
  shortDesc?: string | null;
  slug: string;
  source?: string | null;
  tags?: ServiceTag[];
  url?: string | null;
}

export interface NeuralRecommendationResult {
  items: (NeuralRecommendationItem & {
    service?: CatalogService;
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

const recommendServices = async (
  query: string,
  userId?: string | null,
): Promise<NeuralRecommendationResult> => {
  const services = await NeuralCatalogService.listServices({ activeOnly: true });

  // Приводим DEFAULT_SERVICES к правильному типу
  const defaultServices = DEFAULT_SERVICES as CatalogService[];

  // ✅ fallback если база пустая / seed не применился
  const effectiveServices = services.length ? services : defaultServices;

  if (!effectiveServices.length) {
    return { items: [] };
  }

  const effectiveServicesSummary = effectiveServices
    .map((s: CatalogService) => {
      const tags = (s.tags ?? []).map((t: ServiceTag) => t.slug).join(',');
      const desc = s.shortDesc?.replace(/\s+/g, ' ').slice(0, 200) ?? '';
      return `${s.slug} | ${s.name} | tags: ${tags || '-'} | ${desc}`;
    })
    .join('\n');

  const systemPrompt = `
Ты — рекомендательный бот агрегатора нейросетевых сервисов.

Тебе дан список сервисов, каждый в формате:
slug | name | tags | description

Список сервисов:
${effectiveServicesSummary}

Твоя задача:
1. По запросу пользователя подобрать от 3 до 8 лучших сервисов из списка.
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

  // ✅ если ключа нет — fallback без модели (но вернём 5-7)
  if (!apiKey) {
    const q = query.toLowerCase();
    const scored = effectiveServices
      .map((s: CatalogService) => {
        const haystack = `${s.name} ${s.shortDesc ?? ''} ${(s.tags ?? [])
          .map((t: ServiceTag) => `${t.name} ${t.slug}`)
          .join(' ')}`.toLowerCase();

        let score = 0;
        if (haystack.includes(q)) score += 2;
        if (q.split(/\s+/).some((w) => haystack.includes(w))) score += 1;

        // небольшая базовая оценка, чтобы всегда были рекомендации
        if (score === 0) score = 0.1;

        return { score, service: s };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);

    return {
      items: scored.map((x) => ({
        reason: 'Подбор по совпадениям (fallback без модели).',
        score: Math.max(0, Math.min(1, x.score / 3)),
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

  const model = process.env.OPENROUTER_RECOMMENDER_MODEL || 'anthropic/claude-3.5-sonnet';

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
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010',
      'X-Title': 'NeuralAgg Recommender',
    },
    method: 'POST',
  });

  // ✅ если OpenRouter упал — тоже fallback 5-7
  if (!response.ok) {
    console.error(
      'OpenRouter recommend error:',
      response.status,
      await response.text().catch(() => ''),
    );
    const fallback = effectiveServices.slice(0, 7).map((svc: CatalogService, idx: number) => ({
      reason: 'Fallback: рекомендатель временно недоступен, показываем популярные сервисы.',
      score: 0.6 - idx * 0.03,
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
      slug: svc.slug,
    }));

    return { items: fallback, rawModelOutput: undefined };
  }

  const data: any = await response.json().catch(() => ({}));
  const rawText: string =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.message?.content?.[0]?.text ?? '';

  const parsed = extractJson(rawText) ?? { items: [] };
  const items: NeuralRecommendationItem[] = Array.isArray(parsed.items) ? parsed.items : [];

  const mapBySlug = new Map(effectiveServices.map((s: CatalogService) => [s.slug, s]));

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

  // ✅ гарантия “не меньше 5” — если модель вернула мало, добьём топом из каталога
  if (enriched.length < 5) {
    const used = new Set(enriched.map((x) => x.slug));
    const add = effectiveServices
      .filter((s: CatalogService) => !used.has(s.slug))
      .slice(0, 7 - enriched.length)
      .map((svc: CatalogService, idx: number) => ({
        reason: 'Добавлено из каталога (чтобы показать больше вариантов).',
        score: 0.5 - idx * 0.03,
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
        slug: svc.slug,
      }));

    return { items: [...enriched, ...add].slice(0, 8), rawModelOutput: rawText };
  }

  return {
    items: enriched.slice(0, 8),
    rawModelOutput: rawText,
  };
};

export default recommendServices;
