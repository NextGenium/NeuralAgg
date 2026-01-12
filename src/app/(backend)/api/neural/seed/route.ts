import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { neuralServices } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { NeuralCatalogService } from '@/services/neuralCatalog';

export const runtime = 'nodejs';

// Можно ограничить сидирование только в dev:
const DEV_ONLY = process.env.NODE_ENV !== 'production';

type SeedService = {
  iconUrl?: string;
  isActive?: boolean;
  name: string;
  shortDesc: string;
  slug: string;
  source?: string;
  tagSlugs: string[];
  url: string;
};

const SEED: SeedService[] = [
  {
    name: 'ChatGPT',
    shortDesc:
      'Чат-ассистент для текста, идей, кода, планов и поддержки рабочих задач. Удобно для ежедневных запросов.',
    slug: 'chatgpt',
    source: 'external',
    tagSlugs: ['text', 'chat', 'code', 'assistant'],
    url: 'https://chat.openai.com/',
  },
  {
    name: 'Claude',
    shortDesc:
      'Сильный ассистент для длинных текстов, анализа документов и аккуратного письма. Часто хорош для редакторских задач.',
    slug: 'claude',
    source: 'external',
    tagSlugs: ['text', 'chat', 'analysis', 'writing'],
    url: 'https://claude.ai/',
  },
  {
    name: 'OpenRouter',
    shortDesc:
      'Агрегатор моделей (GPT/Claude/Llama и др.) с единой API-точкой. Удобно, когда нужен выбор моделей.',
    slug: 'openrouter',
    source: 'external',
    tagSlugs: ['models', 'api', 'text', 'tools'],
    url: 'https://openrouter.ai/',
  },
  {
    name: 'Midjourney',
    shortDesc:
      'Генерация изображений высокого качества. Отлично подходит для концептов, иллюстраций и визуального стиля.',
    slug: 'midjourney',
    source: 'external',
    tagSlugs: ['image', 'design', 'creative'],
    url: 'https://www.midjourney.com/',
  },
  {
    name: 'Stable Diffusion',
    shortDesc:
      'Генерация изображений (open-source экосистема). Много вариантов моделей, стилей и локального запуска.',
    slug: 'stable-diffusion',
    source: 'external',
    tagSlugs: ['image', 'open-source', 'local'],
    url: 'https://stability.ai/',
  },
  {
    name: 'DALL·E',
    shortDesc:
      'Генерация изображений по тексту с простым входом и хорошей предсказуемостью. Полезно для быстрых макетов.',
    slug: 'dalle',
    source: 'external',
    tagSlugs: ['image', 'design'],
    url: 'https://openai.com/dall-e',
  },
  {
    name: 'Runway',
    shortDesc:
      'Видео-генерация и монтаж с AI: текст-в-видео, стилизация, расширение кадров, инструменты для креативных роликов.',
    slug: 'runway',
    source: 'external',
    tagSlugs: ['video', 'creative', 'editing'],
    url: 'https://runwayml.com/',
  },
  {
    name: 'ElevenLabs',
    shortDesc:
      'Озвучка и голосовые модели: TTS, клонирование голоса, дубляж. Удобно для видео/подкастов/презентаций.',
    slug: 'elevenlabs',
    source: 'external',
    tagSlugs: ['audio', 'voice', 'tts'],
    url: 'https://elevenlabs.io/',
  },
  {
    name: 'Perplexity',
    shortDesc:
      'Поисковый ассистент с источниками. Подходит для быстрых исследований и ответов с ссылками.',
    slug: 'perplexity',
    source: 'external',
    tagSlugs: ['search', 'research', 'text'],
    url: 'https://www.perplexity.ai/',
  },
  {
    name: 'Notion AI',
    shortDesc:
      'AI-помощник внутри Notion: резюме, переписывание, черновики, структурирование заметок и задач.',
    slug: 'notion-ai',
    source: 'external',
    tagSlugs: ['productivity', 'writing', 'notes'],
    url: 'https://www.notion.so/product/ai',
  },
  {
    name: 'Grammarly',
    shortDesc:
      'Проверка текста, стиль, тон, переписывание. Полезно для деловой переписки и англоязычных текстов.',
    slug: 'grammarly',
    source: 'external',
    tagSlugs: ['writing', 'editor', 'text'],
    url: 'https://www.grammarly.com/',
  },
  {
    name: 'GitHub Copilot',
    shortDesc:
      'AI-ассистент для кода в IDE: автодополнение, генерация функций, подсказки по рефакторингу.',
    slug: 'github-copilot',
    source: 'external',
    tagSlugs: ['code', 'developer', 'assistant'],
    url: 'https://github.com/features/copilot',
  },
  {
    name: 'Cursor',
    shortDesc:
      'IDE с AI-помощником (чат + правки кода). Удобно для быстрых изменений по репозиторию и рефакторинга.',
    slug: 'cursor',
    source: 'external',
    tagSlugs: ['code', 'developer', 'ide'],
    url: 'https://www.cursor.com/',
  },
  {
    name: 'Zapier',
    shortDesc:
      'Автоматизация процессов: связки сервисов, триггеры, интеграции. Помогает строить AI-пайплайны без кода.',
    slug: 'zapier',
    source: 'external',
    tagSlugs: ['automation', 'tools', 'productivity'],
    url: 'https://zapier.com/',
  },
  {
    name: 'Make (Integromat)',
    shortDesc:
      'Визуальные сценарии автоматизации и интеграции. Гибче, чем простые триггеры. Удобно для сложных пайплайнов.',
    slug: 'make',
    source: 'external',
    tagSlugs: ['automation', 'tools'],
    url: 'https://www.make.com/',
  },
];

export async function POST(req: NextRequest) {
  if (DEV_ONLY) {
    // ok
  } else {
    // В проде лучше закрыть или повесить админ-ключ
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  const db = serverDB;
  const mode = new URL(req.url).searchParams.get('mode') ?? 'upsert';
  // mode=reset — сначала удалим существующие seed-slug’и, затем добавим заново

  try {
    if (mode === 'reset') {
      for (const s of SEED) {
        await db.delete(neuralServices).where(eq(neuralServices.slug, s.slug));
      }
    }

    const inserted: string[] = [];
    const skipped: string[] = [];

    for (const s of SEED) {
      // если upsert — пропускаем уже существующие
      const [existing] = await db
        .select()
        .from(neuralServices)
        .where(eq(neuralServices.slug, s.slug))
        .limit(1);

      if (existing && mode === 'upsert') {
        skipped.push(s.slug);
        continue;
      }

      await NeuralCatalogService.createService({
        iconUrl: s.iconUrl,
        isActive: s.isActive ?? true,
        name: s.name,
        shortDesc: s.shortDesc,
        slug: s.slug,
        source: s.source ?? 'external',
        tagSlugs: s.tagSlugs,
        url: s.url,
      });

      inserted.push(s.slug);
    }

    return NextResponse.json(
      {
        count: { inserted: inserted.length, skipped: skipped.length, total: SEED.length },
        inserted,
        ok: true,
        skipped,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error('[POST /api/neural/seed] error', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
