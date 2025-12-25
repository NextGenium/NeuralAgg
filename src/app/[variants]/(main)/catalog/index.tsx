'use client';

import type { ChatModelCard } from '@lobechat/types';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { modelsService } from '@/services/models';

type CatalogModel = ChatModelCard & {
  _category?: 'text' | 'image' | 'video' | 'other';
};

const deriveCategory = (model: ChatModelCard): CatalogModel['_category'] => {
  const anyModel = model as any;
  if (anyModel.video) return 'video';
  if (anyModel.imageOutput || anyModel.vision) return 'image';
  return 'text';
};

const CATEGORIES: { label: string; value: CatalogModel['_category'] | 'all' }[] = [
  { label: 'Все', value: 'all' },
  { label: 'Текст', value: 'text' },
  { label: 'Картинки / Vision', value: 'image' },
  { label: 'Видео', value: 'video' },
];

interface CatalogPageInnerProps {
  mobile?: boolean;
}

const CatalogPageInner = memo<CatalogPageInnerProps>(({ mobile }) => {
  const { t } = useTranslation('common');
  const [rawModels, setRawModels] = useState<ChatModelCard[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | CatalogModel['_category']>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancel = false;

    (async () => {
      setLoading(true);
      try {
        const list = await modelsService.getModels('openrouter');
        if (!cancel && list) setRawModels(list);
      } catch (e) {
        console.error('Failed to load OpenRouter models', e);
      } finally {
        if (!cancel) setLoading(false);
      }
    })();

    return () => {
      cancel = true;
    };
  }, []);

  const models: CatalogModel[] = useMemo(() => {
    const prepared = rawModels.map((m) => ({
      ...m,
      _category: deriveCategory(m),
    }));

    return prepared
      .filter((m) => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
          (m.displayName || m.id).toLowerCase().includes(s) ||
          (m.description || '').toLowerCase().includes(s)
        );
      })
      .filter((m) => {
        if (category === 'all') return true;
        return m._category === category;
      });
  }, [rawModels, search, category]);

  return (
    <Flexbox gap={mobile ? 8 : 12} height="100%" padding={mobile ? 12 : 16}>
      {/* Заголовок */}
      <Flexbox gap={4}>
        <div className="text-base font-medium">
          OpenRouter · {t('tab.catalog') ?? 'Каталог моделей'}
        </div>
        <div className="text-xs opacity-70">
          Выбирайте модели из OpenRouter (300+), открывайте описание и переходите в чат.
        </div>
      </Flexbox>

      {/* Поиск + фильтры */}
      <Flexbox align="center" direction="horizontal" gap={8}>
        <input
          className="flex-1 min-w-[160px] rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени или описанию модели…"
          value={search}
        />
        <select
          className="rounded-lg border px-3 py-2 text-xs bg-transparent"
          onChange={(e) => setCategory(e.target.value as any)}
          value={category}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Flexbox>

      {loading && <div className="text-xs opacity-70">Загружаем модели OpenRouter…</div>}

      {!loading && models.length === 0 && (
        <div className="text-xs opacity-70">
          Ничего не найдено. Попробуйте изменить запрос или категорию.
        </div>
      )}

      {/* Список моделей */}
      <div className="flex-1 overflow-y-auto grid gap-8 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 pb-4">
        {models.map((m) => (
          <div className="flex flex-col rounded-xl border px-3 py-3 text-xs" key={m.id}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="font-medium truncate">{m.displayName || m.id}</div>
              <span className="px-2 py-1 rounded-full border opacity-70">
                {m._category ?? 'text'}
              </span>
            </div>

            {m.description && <div className="opacity-70 line-clamp-3 mb-2">{m.description}</div>}

            <div className="flex flex-wrap gap-4 mb-2 opacity-70">
              {(m as any).imageOutput && <span>🖼 image</span>}
              {(m as any).vision && <span>👁 vision</span>}
              {(m as any).video && <span>🎬 video</span>}
              {(m as any).search && <span>🔍 search</span>}
              {(m as any).files && <span>📎 files</span>}
            </div>

            <div className="mt-auto flex gap-2 pt-2 border-t border-dashed">
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                className="flex-1 rounded-lg border px-3 py-1 text-xs"
                onClick={() => {
                  const url = new URL('/chat', window.location.origin);
                  url.searchParams.set('model', m.id);
                  window.location.href = url.toString();
                }}
              >
                Открыть в чате
              </button>
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                className="rounded-lg border px-3 py-1 text-xs"
                onClick={() => {
                  const url = `https://openrouter.ai/models/${encodeURIComponent(m.id)}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                На OpenRouter
              </button>
            </div>
          </div>
        ))}
      </div>
    </Flexbox>
  );
});

export const DesktopCatalogPage = memo(() => <CatalogPageInner mobile={false} />);
export const MobileCatalogPage = memo(() => <CatalogPageInner mobile />);
