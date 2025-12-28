'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import {
  type Service as NeuralServiceDto,
  ServiceCard,
} from '@/app/[variants]/(main)/services/components/ServiceCard';

interface ServicesPageInnerProps {
  mobile?: boolean;
}

const SkeletonCard = () => (
  <div className="flex flex-col rounded-2xl border px-4 py-3 text-xs animate-pulse">
    <div className="flex items-start gap-3 mb-2">
      <div className="w-8 h-8 rounded-xl bg-[rgba(0,0,0,0.06)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-[rgba(0,0,0,0.06)]" />
        <div className="h-2 w-24 rounded bg-[rgba(0,0,0,0.04)]" />
        <div className="h-2 w-full rounded bg-[rgba(0,0,0,0.04)]" />
        <div className="h-2 w-3/4 rounded bg-[rgba(0,0,0,0.04)]" />
      </div>
    </div>
    <div className="flex gap-2 mt-2">
      <div className="h-6 flex-1 rounded-lg bg-[rgba(0,0,0,0.04)]" />
      <div className="h-6 flex-1 rounded-lg bg-[rgba(0,0,0,0.04)]" />
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <Flexbox align="center" gap={8} height="100%" justify="center" padding={24}>
    <div className="text-3xl">🧩</div>
    <div className="text-sm opacity-80 text-center max-w-xs">{message}</div>
  </Flexbox>
);

const ServicesPageInner = memo<ServicesPageInnerProps>(({ mobile }) => {
  const [items, setItems] = useState<NeuralServiceDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | 'all'>('all');

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favLoading, setFavLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // загрузка сервисов
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (activeTag && activeTag !== 'all') params.set('tag', activeTag);

        const res = await fetch(`/api/neural/services?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setError('Не удалось загрузить список сервисов');
          setItems([]);
          return;
        }

        const json = await res.json();
        setItems(json.items ?? []);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Failed to load neural services', e);
          setError('Ошибка сети при загрузке сервисов');
        }
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [search, activeTag]);

  // загрузка избранного
  useEffect(() => {
    const controller = new AbortController();

    const loadFavorites = async () => {
      setFavLoading(true);
      try {
        const res = await fetch('/api/neural/favorites/services', {
          signal: controller.signal,
        });

        if (res.status === 401) {
          setFavoriteIds(new Set());
          return;
        }

        if (!res.ok) {
          console.error('Failed to load favorites', res.status);
          return;
        }

        const json = await res.json();
        const ids = (json.items ?? []).map((s: NeuralServiceDto) => s.id);
        setFavoriteIds(new Set(ids));
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Failed to load favorite services', e);
        }
      } finally {
        setFavLoading(false);
      }
    };

    loadFavorites();

    return () => controller.abort();
  }, []);

  const toggleFavorite = async (serviceId: string) => {
    try {
      const res = await fetch('/api/neural/favorites/services', {
        body: JSON.stringify({ serviceId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (res.status === 401) {
        // TODO: показать toast "Войдите, чтобы сохранять избранное"
        console.warn('Toggle favorite: unauthorized');
        return;
      }

      const json = await res.json();
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (json.favorited) {
          next.add(serviceId);
        } else {
          next.delete(serviceId);
        }
        return next;
      });
    } catch (e) {
      console.error('Failed to toggle favorite service', e);
    }
  };

  const tags = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((s) => {
      s.tags?.forEach((t) => {
        if (!map.has(t.slug)) map.set(t.slug, t.name);
      });
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ name, slug }));
  }, [items]);

  const showSkeleton = loading && !items.length && !error;
  const showEmpty = !loading && !error && items.length === 0;

  return (
    <Flexbox gap={mobile ? 8 : 12} height="100%" padding={mobile ? 12 : 16}>
      <Flexbox gap={4}>
        <div className="text-base font-medium">Нейросервисы</div>
        <div className="text-xs opacity-70">
          Каталог внешних AI-сервисов (ChatGPT, Midjourney и др.), которые можно открыть и обсуждать
          прямо из lobby-чата.
        </div>
      </Flexbox>

      {/* Поиск + теги */}
      <Flexbox align="center" direction="horizontal" gap={8} wrap="wrap">
        <input
          className="flex-1 min-w-[160px] rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию сервиса…"
          value={search}
        />
        <select
          className="rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setActiveTag(e.target.value as any)}
          value={activeTag}
        >
          <option value="all">Все теги</option>
          {tags.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.name}
            </option>
          ))}
        </select>
      </Flexbox>

      {error && <div className="text-[11px] text-red-500">{error}</div>}

      {showSkeleton && (
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 pb-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {showEmpty && (
        <EmptyState message="По текущему запросу сервисы не найдены. Попробуйте изменить текст поиска или выбрать другой тег." />
      )}

      {!showSkeleton && !showEmpty && (
        <div className="flex-1 overflow-y-auto grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 pb-4">
          {items.map((s) => {
            const isFav = favoriteIds.has(s.id);

            return (
              <ServiceCard
                isFavorite={isFav}
                key={s.id}
                onOpenChat={() => {
                  const url = new URL('/chat', window.location.origin);
                  url.searchParams.set('service', s.slug);
                  window.location.href = url.toString();
                }}
                onOpenDetails={() => {
                  window.location.href = `/services/${encodeURIComponent(s.slug)}`;
                }}
                onOpenSite={
                  s.url ? () => window.open(s.url!, '_blank', 'noopener,noreferrer') : undefined
                }
                onToggleFavorite={() => void toggleFavorite(s.id)}
                service={s}
              />
            );
          })}
        </div>
      )}

      {(loading || favLoading) && !showSkeleton && (
        <div className="text-[10px] opacity-60">Обновляем данные…</div>
      )}
    </Flexbox>
  );
});

export const DesktopServicesPage = memo(() => <ServicesPageInner mobile={false} />);
export const MobileServicesPage = memo(() => <ServicesPageInner mobile />);
