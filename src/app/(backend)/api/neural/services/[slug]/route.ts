import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { neuralServices } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { NeuralCatalogService } from '@/services/neuralCatalog';

// tsgo / validator для этого роута ожидает именно такой контекст:
// { params: Promise<{ slug: string }> }
type RouteContext = {
  params: Promise<{ slug: string }>;
};

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, context: RouteContext) {
  const { slug } = await context.params;

  const service = await NeuralCatalogService.getServiceBySlug(slug);

  if (!service) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(service, { status: 200 });
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
