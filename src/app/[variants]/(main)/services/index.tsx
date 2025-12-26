'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

export type NeuralServiceDto = {
  iconUrl?: string | null;
  id: string;
  isActive: boolean;
  name: string;
  shortDesc?: string | null;
  slug: string;
  source?: string | null;
  tags?: { name: string; slug: string }[];
  url?: string | null;
};

interface ServicesPageInnerProps {
  mobile?: boolean;
}

const ServicesPageInner = memo<ServicesPageInnerProps>(({ mobile }) => {
  //const { t } = useTranslation('common');

  const [items, setItems] = useState<NeuralServiceDto[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | 'all'>('all');

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favLoading, setFavLoading] = useState(false);

  // загрузка сервисов
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (activeTag && activeTag !== 'all') params.set('tag', activeTag);

        const res = await fetch(`/api/neural/services?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        setItems(json.items ?? []);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          console.error('Failed to load neural services', e);
        }
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
          // пользователь не залогинен — просто не показываем избранное
          setFavoriteIds(new Set());
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
        // Можно показать toast "Нужен вход"
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

  // список уникальных тегов
  const tags = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((s) => {
      s.tags?.forEach((t) => {
        if (!map.has(t.slug)) map.set(t.slug, t.name);
      });
    });
    return Array.from(map.entries()).map(([slug, name]) => ({ name, slug }));
  }, [items]);

  const filteredItems = items; // фильтрация уже на бэке по search/tag

  return (
    <Flexbox gap={mobile ? 8 : 12} height="100%" padding={mobile ? 12 : 16}>
      {/* Заголовок */}
      <Flexbox gap={4}>
        <div className="text-base font-medium">Нейросервисы</div>
        <div className="text-xs opacity-70">
          Каталог внешних сервисов (ChatGPT, Midjourney и т.д.) с переходом в чат и на сайт сервиса.
        </div>
      </Flexbox>

      {/* Поиск + фильтр по тегу */}
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

      {(loading || favLoading) && <div className="text-xs opacity-70">Загружаем данные…</div>}

      {!loading && filteredItems.length === 0 && (
        <div className="text-xs opacity-70">
          Ничего не найдено. Попробуйте изменить запрос или тег.
        </div>
      )}

      {/* Список сервисов */}
      <div className="flex-1 overflow-y-auto grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 pb-4">
        {filteredItems.map((s) => {
          const isFav = favoriteIds.has(s.id);

          return (
            <div className="flex flex-col rounded-xl border px-3 py-3 text-xs" key={s.id}>
              <div className="flex items-start gap-2 mb-2">
                {s.iconUrl && (
                  <img alt={s.name} className="w-6 h-6 rounded-md object-cover" src={s.iconUrl} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="font-medium truncate">{s.name}</div>
                    <button
                      aria-label={isFav ? 'Убрать из избранного' : 'В избранное'}
                      className="text-lg leading-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleFavorite(s.id);
                      }}
                      type="button"
                    >
                      {isFav ? '★' : '☆'}
                    </button>
                  </div>
                  {s.shortDesc && <div className="opacity-70 line-clamp-3">{s.shortDesc}</div>}
                </div>
              </div>

              {s.tags && s.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {s.tags.map((t) => (
                    <span
                      className="px-2 py-1 rounded-full border text-[10px] opacity-80"
                      key={t.slug}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2 border-t border-dashed">
                {s.url && (
                  // eslint-disable-next-line react/button-has-type
                  <button
                    className="flex-1 rounded-lg border px-3 py-1 text-xs"
                    onClick={() => {
                      window.open(s.url!, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    Открыть сайт
                  </button>
                )}

                {/* eslint-disable-next-line react/button-has-type */}
                <button
                  className="flex-1 rounded-lg border px-3 py-1 text-xs"
                  onClick={() => {
                    // тут вариант №2 из твоего текста: "обсуждение в lobby"
                    const url = new URL('/chat', window.location.origin);
                    url.searchParams.set('service', s.slug);
                    window.location.href = url.toString();
                  }}
                >
                  Обсудить в чате
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Flexbox>
  );
});

export const DesktopServicesPage = memo(() => <ServicesPageInner mobile={false} />);
export const MobileServicesPage = memo(() => <ServicesPageInner mobile />);
