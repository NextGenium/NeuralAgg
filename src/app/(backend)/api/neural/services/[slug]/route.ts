import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { neuralServices } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { DEFAULT_SERVICES } from '@/services/defaultCatalog';
import { NeuralCatalogService } from '@/services/neuralCatalog';

// { params: Promise<{ slug: string }> }
type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  // ✅ сначала пробуем БД
  const service = await NeuralCatalogService.getServiceBySlug(slug);
  if (service) return NextResponse.json(service, { status: 200 });

  // ✅ fallback: ищем в DEFAULT_SERVICES
  const fallback = (DEFAULT_SERVICES as any[]).find((s) => s.slug === slug);
  if (fallback) return NextResponse.json(fallback, { status: 200 });

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const db = serverDB;
  const { slug } = await context.params;
  const body = await req.json();

  try {
    const [updated] = await db
      .update(neuralServices)
      .set({
        iconUrl: body.iconUrl,
        isActive: body.isActive,
        name: body.name,
        shortDesc: body.shortDesc,
        source: body.source,
        url: body.url,
      })
      .where(eq(neuralServices.slug, slug))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (e) {
    console.error('Failed to update neural service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const db = serverDB;
  const { slug } = await context.params;

  try {
    const res = await db.delete(neuralServices).where(eq(neuralServices.slug, slug)).returning();

    if (!res.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error('Failed to delete neural service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
