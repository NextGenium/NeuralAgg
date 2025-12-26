import { NextRequest, NextResponse } from 'next/server';

import { NeuralCatalogService } from '@/services/neuralCatalog';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') ?? undefined;
  const tag = searchParams.get('tag') ?? undefined;

  const services = await NeuralCatalogService.listServices({
    search,
    tagSlugs: tag ? [tag] : undefined,
  });

  return NextResponse.json({ items: services });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.slug || !body.name) {
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

export const runtime = 'nodejs';
