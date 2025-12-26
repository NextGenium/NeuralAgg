import { and, eq, inArray } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

import { neuralFavoriteServices, neuralServices } from '@/database/schemas';
import { serverDB } from '@/database/server';
import { getRequestUserIdOrThrow, handleUserError } from '@/server/utils/getRequestUserId';

export async function GET(req: NextRequest) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const db = serverDB;

    const favs = await db
      .select()
      .from(neuralFavoriteServices)
      .where(eq(neuralFavoriteServices.userId, userId));

    if (!favs.length) return NextResponse.json({ items: [] });

    const serviceIds = favs.map((f) => f.serviceId);

    const services = await db
      .select()
      .from(neuralServices)
      .where(inArray(neuralServices.id, serviceIds));

    return NextResponse.json({ items: services });
  } catch (e) {
    const userError = handleUserError(e);
    if (userError) return userError;

    console.error('Failed to load favorite services', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getRequestUserIdOrThrow(req);
    const db = serverDB;

    const body = await req.json();
    const serviceId: string | undefined = body.serviceId;

    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId is required' }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(neuralFavoriteServices)
      .where(
        and(
          eq(neuralFavoriteServices.userId, userId),
          eq(neuralFavoriteServices.serviceId, serviceId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .delete(neuralFavoriteServices)
        .where(
          and(
            eq(neuralFavoriteServices.userId, userId),
            eq(neuralFavoriteServices.serviceId, serviceId),
          ),
        );

      return NextResponse.json({ favorited: false });
    }

    await db.insert(neuralFavoriteServices).values({
      serviceId,
      userId,
    });

    return NextResponse.json({ favorited: true });
  } catch (e) {
    const userError = handleUserError(e);
    if (userError) return userError;

    console.error('Failed to toggle favorite service', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
