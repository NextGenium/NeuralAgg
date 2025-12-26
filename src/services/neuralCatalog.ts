import { and, eq, ilike, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import {
  NewNeuralService,
  neuralServiceTags,
  neuralServices,
  neuralTags,
} from '@/database/schemas';
import { serverDB } from '@/database/server';

export interface ServiceFilter {
  activeOnly?: boolean;
  search?: string;
  tagSlugs?: string[];
  userId?: string; // на будущее, сейчас не используем
}

export const NeuralCatalogService = {
  // ↓↓↓ sort-keys: сначала createService, потом getServiceBySlug, потом listServices ↓↓↓
  async createService(
    input: Omit<NewNeuralService, 'id' | 'createdAt' | 'updatedAt' | 'accessedAt'> & {
      tagSlugs?: string[];
    },
  ) {
    const db = serverDB;
    const id = uuidv4(); // id в input больше не трогаем, чтобы не было TS-ошибки

    const [service] = await db
      .insert(neuralServices)
      .values({
        ...input,
        id,
      })
      .returning();

    if (input.tagSlugs && input.tagSlugs.length > 0) {
      // достаём уже существующие теги
      const existingTags = await db
        .select()
        .from(neuralTags)
        .where(inArray(neuralTags.slug, input.tagSlugs));

      const existingSlugs = new Set(existingTags.map((t) => t.slug));
      const missingSlugs = input.tagSlugs.filter((s) => !existingSlugs.has(s));

      // создаём недостающие теги
      if (missingSlugs.length) {
        await db.insert(neuralTags).values(
          missingSlugs.map((slug) => ({
            id: uuidv4(),
            name: slug,
            slug,
          })),
        );
      }

      const allTags = await db
        .select()
        .from(neuralTags)
        .where(inArray(neuralTags.slug, input.tagSlugs));

      await db.insert(neuralServiceTags).values(
        allTags.map((t) => ({
          serviceId: service.id,
          tagId: t.id,
        })),
      );
    }

    return service;
  },

  async getServiceBySlug(slug: string) {
    const db = serverDB;
    const [service] = await db
      .select()
      .from(neuralServices)
      .where(eq(neuralServices.slug, slug))
      .limit(1);

    if (!service) return null;

    const tags = await db
      .select({
        tagName: neuralTags.name,
        tagSlug: neuralTags.slug,
      })
      .from(neuralServiceTags)
      .innerJoin(neuralTags, eq(neuralServiceTags.tagId, neuralTags.id))
      .where(eq(neuralServiceTags.serviceId, service.id));

    return {
      ...service,
      tags,
    };
  },

  // список сервисов + теги
  async listServices(filter: ServiceFilter = {}) {
    const db = serverDB;
    const { search, activeOnly = true } = filter;

    const where: any[] = [];

    if (activeOnly) where.push(eq(neuralServices.isActive, true));
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where.push(ilike(neuralServices.name, q));
    }

    // если есть фильтр по тегам, позже можно добавить join с neural_service_tags

    const baseQuery = db.select().from(neuralServices);

    const services =
      where.length > 0
        ? await baseQuery.where(and(...where)).orderBy(neuralServices.name)
        : await baseQuery.orderBy(neuralServices.name);

    const ids = services.map((s) => s.id);

    const tags =
      ids.length === 0
        ? []
        : await db
            .select({
              serviceId: neuralServiceTags.serviceId,
              tagName: neuralTags.name,
              tagSlug: neuralTags.slug,
            })
            .from(neuralServiceTags)
            .innerJoin(neuralTags, eq(neuralServiceTags.tagId, neuralTags.id))
            .where(inArray(neuralServiceTags.serviceId, ids));

    const tagsByService = tags.reduce<Record<string, { name: string; slug: string }[]>>(
      (acc, t) => {
        if (!acc[t.serviceId]) acc[t.serviceId] = [];
        acc[t.serviceId].push({ name: t.tagName, slug: t.tagSlug });
        return acc;
      },
      {},
    );

    return services.map((s) => ({
      ...s,
      tags: tagsByService[s.id] ?? [],
    }));
  },
};
