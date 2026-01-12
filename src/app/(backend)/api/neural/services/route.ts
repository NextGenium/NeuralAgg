import { NextRequest, NextResponse } from 'next/server';

import { DEFAULT_SERVICES } from '@/services/defaultCatalog';
import { NeuralCatalogService } from '@/services/neuralCatalog';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') ?? undefined;
    const tag = searchParams.get('tag') ?? undefined;

    const services = await NeuralCatalogService.listServices({
      search,
      tagSlugs: tag ? [tag] : undefined,
    });

    const items = services.length ? services : (DEFAULT_SERVICES as any);

    return NextResponse.json({ items }, { status: 200 });
  } catch (e: any) {
    console.error('Failed to list neural services', e);

    // ✅ демо: не 500, отдаём fallback
    return NextResponse.json(
      {
        items: DEFAULT_SERVICES,
        warning: 'FALLBACK_CATALOG',
      },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (!body.slug || !body.name) {
      // демо: можно оставить 200, но POST обычно лучше 400 — как хочешь
      return NextResponse.json({ error: 'slug and name are required' }, { status: 400 });
    }

    const service = await NeuralCatalogService.createService({
      iconUrl: body.iconUrl,
      isActive: body.isActive ?? true,
      name: body.name,
      shortDesc: body.shortDesc,
      slug: body.slug,
      source: body.source ?? 'external',
      tagSlugs: body.tagSlugs ?? [],
      url: body.url,
    });

    return NextResponse.json(service, { status: 201 });
  } catch (e) {
    console.error('Failed to create neural service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
