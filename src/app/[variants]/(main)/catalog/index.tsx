'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import { type CatalogModel, ModelCard } from './components/ModelCard';

interface CatalogPageInnerProps {
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
    <div className="text-3xl">🔎</div>
    <div className="text-sm opacity-80 text-center max-w-xs">{message}</div>
  </Flexbox>
);

const CatalogPageInner = memo<CatalogPageInnerProps>(({ mobile }) => {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'text' | 'image' | 'other'>('all');

  // TODO: сюда вставь свою реальную функцию загрузки моделей из OpenRouter
  const fetchModels = async (params: { search?: string; type?: string }) => {
    // пример: дергаем уже существующий бэкенд /api/models/openrouter
    const urlParams = new URLSearchParams();
    if (params.search) urlParams.set('search', params.search);
    if (params.type && params.type !== 'all') urlParams.set('type', params.type);

    const res = await fetch(`/api/models/openrouter?${urlParams.toString()}`);
    if (!res.ok) throw new Error('Failed to load models');

    const json = await res.json();
    // ожидаем, что json.items уже в нужной форме
    return (json.items ?? []) as CatalogModel[];
  };

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const items = await fetchModels({
          search,
          type: typeFilter === 'all' ? undefined : typeFilter,
        });
        setModels(items);
      } catch (e) {
        console.error(e);
        setError('Не удалось загрузить модели OpenRouter');
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [search, typeFilter]);

  const tags = useMemo(
    () => [
      { name: 'Текст', slug: 'text' },
      { name: 'Картинки', slug: 'image' },
      { name: 'Другое', slug: 'other' },
    ],
    [],
  );

  const showSkeleton = loading && !models.length && !error;
  const showEmpty = !loading && !error && !models.length;

  return (
    <Flexbox gap={mobile ? 8 : 12} height="100%" padding={mobile ? 12 : 16}>
      <Flexbox gap={4}>
        <div className="text-base font-medium">Каталог моделей</div>
        <div className="text-xs opacity-70">
          Модели OpenRouter (GPT, Claude, LLaMA и др.), доступные прямо из lobby-чата.
        </div>
      </Flexbox>

      {/* Поиск + тип */}
      <Flexbox align="center" direction="horizontal" gap={8} wrap="wrap">
        <input
          className="flex-1 min-w-[160px] rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию модели…"
          value={search}
        />
        <select
          className="rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setTypeFilter(e.target.value as any)}
          value={typeFilter}
        >
          <option value="all">Все типы</option>
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
        <EmptyState message="По текущему запросу модели не найдены. Попробуйте изменить название или тип модели." />
      )}

      {!showSkeleton && !showEmpty && (
        <div className="flex-1 overflow-y-auto grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 pb-4">
          {models.map((m) => (
            <ModelCard
              key={m.id}
              model={m}
              onOpenChat={() => {
                const url = new URL('/chat', window.location.origin);
                url.searchParams.set('model', m.id);
                window.location.href = url.toString();
              }}
              onOpenProviderPage={() => {
                const url = `https://openrouter.ai/models/${encodeURIComponent(m.id)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            />
          ))}
        </div>
      )}

      {loading && !showSkeleton && (
        <div className="text-[10px] opacity-60">Обновляем список моделей…</div>
      )}
    </Flexbox>
  );
});

export const DesktopCatalogPage = memo(() => <CatalogPageInner mobile={false} />);
export const MobileCatalogPage = memo(() => <CatalogPageInner mobile />);
