'use client';

import { useState } from 'react';
import { Flexbox } from 'react-layout-kit';

type NeuralServiceDto = {
  iconUrl?: string | null;
  id: string;
  name: string;
  shortDesc?: string | null;
  slug: string;
  source?: string | null;
  tags?: { name: string; slug: string }[];
  url?: string | null;
};

type RecommendationItem = {
  reason?: string;
  score?: number;
  service?: NeuralServiceDto;
  slug: string;
};

type RecommendationResponse = {
  items: RecommendationItem[];
  rawModelOutput?: string;
};

export const NeuralGuideWidget = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/neural/recommend', {
        body: JSON.stringify({ query }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || 'Ошибка подбора сервисов');
        return;
      }

      const json: RecommendationResponse = await res.json();
      setResult(json.items ?? []);
    } catch (e) {
      console.error('NeuralGuideWidget error:', e);
      setError('Ошибка сети или сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flexbox gap={8} paddingBlock={8} paddingInline={16}>
      {/* eslint-disable-next-line react/button-has-type */}
      <button
        className="text-[11px] rounded-lg border px-3 py-2 opacity-80 hover:opacity-100 transition"
        onClick={() => setOpen((v) => !v)}
      >
        🤖 Нейро-гид: подобрать сервисы по задаче
      </button>

      {open && (
        <Flexbox className="rounded-lg border px-3 py-3 bg-[rgba(0,0,0,0.02)]" gap={8}>
          <textarea
            className="w-full min-h-[60px] rounded-md border px-2 py-1 text-xs bg-transparent"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Опиши задачу: что хочешь делать (текст, картинки, код, видео, поиск, автопостинг и т.п.)"
            value={query}
          />

          <div className="flex justify-between items-center gap-2">
            <div className="text-[10px] opacity-70">
              Мы подберём 3–5 подходящих сервисов из каталога.
            </div>
            {/* eslint-disable-next-line react/button-has-type */}
            <button
              className="rounded-md border px-3 py-1 text-[11px]"
              disabled={loading || !query.trim()}
              onClick={() => void handleAsk()}
            >
              {loading ? 'Подбираем…' : 'Подобрать'}
            </button>
          </div>

          {error && <div className="text-[11px] text-red-500">{error}</div>}

          {result && result.length > 0 && (
            <Flexbox className="mt-1" gap={6}>
              <div className="text-[11px] opacity-80">Рекомендации:</div>
              <div className="flex flex-col gap-3">
                {result.map((item) => {
                  const s = item.service;

                  return (
                    <div
                      className="rounded-md border px-3 py-2 text-[11px] flex flex-col gap-1"
                      key={item.slug}
                    >
                      <div className="flex items-center gap-2">
                        {s?.iconUrl && (
                          <img
                            alt={s.name}
                            className="w-4 h-4 rounded object-cover"
                            src={s.iconUrl}
                          />
                        )}
                        <div className="font-medium">{s?.name ?? item.slug}</div>
                        {typeof item.score === 'number' && (
                          <span className="ml-auto opacity-60">
                            {(item.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {s?.shortDesc && <div className="opacity-70 line-clamp-2">{s.shortDesc}</div>}

                      {item.reason && <div className="opacity-80">Причина: {item.reason}</div>}

                      <div className="flex gap-2 mt-1 flex-wrap">
                        {s?.slug && (
                          // eslint-disable-next-line react/button-has-type
                          <button
                            className="rounded-md border px-2 py-1 text-[10px]"
                            onClick={() => {
                              window.location.href = `/services/${encodeURIComponent(s.slug)}`;
                            }}
                          >
                            Открыть страницу сервиса
                          </button>
                        )}
                        {s?.slug && (
                          // eslint-disable-next-line react/button-has-type
                          <button
                            className="rounded-md border px-2 py-1 text-[10px]"
                            onClick={() => {
                              const url = new URL('/chat', window.location.origin);
                              url.searchParams.set('service', s.slug);
                              window.location.href = url.toString();
                            }}
                          >
                            Обсудить в чате
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Flexbox>
          )}

          {result && result.length === 0 && !loading && !error && (
            <div className="text-[11px] opacity-70">
              Ничего не подобралось по текущему запросу. Попробуй описать задачу чуть иначе.
            </div>
          )}
        </Flexbox>
      )}
    </Flexbox>
  );
};
