import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { neuralServices } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { NeuralCatalogService } from '@/services/neuralCatalog';

interface Params {
  params: { slug: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const service = await NeuralCatalogService.getServiceBySlug(params.slug);

  if (!service) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(service);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const db = serverDB;
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
      .where(eq(neuralServices.slug, params.slug))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    console.error('Failed to update neural service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const db = serverDB;

  try {
    const res = await db
      .delete(neuralServices)
      .where(eq(neuralServices.slug, params.slug))
      .returning();

    if (!res.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Failed to delete neural service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
