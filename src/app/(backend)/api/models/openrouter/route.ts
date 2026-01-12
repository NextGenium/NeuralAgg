import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODELS_URL =
  process.env.OPENROUTER_MODELS_URL ?? 'https://openrouter.ai/api/v1/models';

type CatalogModel = {
  description?: string | null;
  iconUrl?: string | null;
  id: string;
  name: string;
  provider?: string | null;
  tags?: { name: string; slug: string }[];
};

const normalizeType = (m: any): 'text' | 'image' | 'other' => {
  // OpenRouter у разных моделей может отдавать разную структуру.
  // Делаем очень безопасный хак:
  const modality = (m?.modality ?? m?.architecture?.modality ?? '').toString().toLowerCase();
  const isImage =
    modality.includes('image') || modality.includes('vision') || modality.includes('diffusion');
  if (isImage) return 'image';

  const isText =
    modality.includes('text') ||
    modality.includes('chat') ||
    modality.includes('language') ||
    m?.type === 'chat' ||
    m?.type === 'text';

  if (isText) return 'text';
  return 'other';
};

export async function GET(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OPENROUTER_API_KEY_NOT_CONFIGURED', items: [] },
        { status: 200 }, // не 500, чтобы UI не выглядел “сломано”
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') ?? '').trim().toLowerCase();
    const type = (searchParams.get('type') ?? '').trim().toLowerCase(); // text|image|other|all

    const res = await fetch(OPENROUTER_MODELS_URL, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3010',
        'X-Title': 'NeuralAgg Catalog',
      },
      method: 'GET',
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      // всегда JSON
      return NextResponse.json(
        { details: data ?? text, error: `OPENROUTER_MODELS_ERROR_${res.status}`, items: [] },
        { status: 200 },
      );
    }

    const rawItems: any[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.items)
        ? data.items
        : [];
    const mapped: CatalogModel[] = rawItems.map((m) => {
      const id = (m?.id ?? m?.slug ?? '').toString();
      const name = (m?.name ?? id).toString();

      const t = normalizeType(m);

      return {
        description: (m?.description ?? m?.summary ?? null)?.toString?.() ?? null,
        iconUrl: (m?.icon ?? m?.icon_url ?? m?.image ?? null)?.toString?.() ?? null,
        id,
        name,
        provider: (m?.provider ?? m?.owned_by ?? m?.company ?? null)?.toString?.() ?? null,
        tags: [{ name: t === 'text' ? 'Текст' : t === 'image' ? 'Картинки' : 'Другое', slug: t }],
      };
    });

    const filtered = mapped
      .filter((m) => !!m.id)
      .filter((m) => {
        if (!search) return true;
        const hay = `${m.id} ${m.name} ${m.description ?? ''} ${m.provider ?? ''}`.toLowerCase();
        return hay.includes(search);
      })
      .filter((m) => {
        if (!type || type === 'all') return true;
        const mt = m.tags?.[0]?.slug;
        return mt === type;
      });

    return NextResponse.json({ items: filtered }, { status: 200 });
  } catch (e) {
    console.error('[GET /api/models/openrouter] error', e);
    return NextResponse.json({ error: 'INTERNAL_ERROR', items: [] }, { status: 200 });
  }
}
