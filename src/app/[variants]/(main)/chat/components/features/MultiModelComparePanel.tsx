'use client';

import { FormEvent, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

type MultiResultItem = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

const AVAILABLE_MODELS: { hint?: string; id: string; label: string }[] = [
  { hint: 'LLM', id: 'deepseek/chat', label: 'DeepSeek' },
  { hint: 'LLM', id: 'kimi/chat', label: 'Kimi' },
  { hint: 'Light LLM', id: 'google/gemini-flash', label: 'Gemini Flash' },
  { hint: 'Premium LLM', id: 'gpt-4o', label: 'GPT-4o' },
];

const MultiModelComparePanel = () => {
  const [prompt, setPrompt] = useState('');
  const [selected, setSelected] = useState<string[]>([
    'deepseek/chat',
    'kimi/chat',
    'google/gemini-flash',
  ]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MultiResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const toggleModel = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || selected.length === 0) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({
          models: selected,
          prompt,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error || `Ошибка: ${res.status}`);
        return;
      }

      const json = (await res.json()) as { results: MultiResultItem[] };

      setResults(json.results || []);
    } catch (err) {
      console.error('Failed to call /api/neural/multi', err);
      setError('Ошибка сети или сервера');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flexbox gap={8} paddingBlock={8} paddingInline={16}>
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
          <div className="text-[12px] font-medium opacity-80">Сравнить модели (multi-run)</div>
          {/* eslint-disable-next-line react/button-has-type */}
          <button
            className="text-[11px] opacity-60 hover:opacity-100"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Свернуть' : 'Развернуть'}
          </button>
        </div>

        {expanded && (
          <form className="flex flex-col gap-3 px-3 py-3" onSubmit={handleSubmit}>
            <textarea
              className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent px-2 py-1 text-[13px] outline-none focus:border-[rgba(255,255,255,0.25)]"
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Опишите задачу — один промпт, который запустим сразу в несколько моделей…"
              rows={3}
              value={prompt}
            />

            <div className="flex flex-wrap gap-2">
              {AVAILABLE_MODELS.map((m) => {
                const active = selected.includes(m.id);
                return (
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 text-[11px] ${
                      active
                        ? 'border-[rgba(255,255,255,0.8)] bg-[rgba(255,255,255,0.08)]'
                        : 'border-[rgba(255,255,255,0.15)] opacity-80 hover:opacity-100'
                    }`}
                    key={m.id}
                  >
                    <input
                      checked={active}
                      className="h-3 w-3"
                      onChange={() => toggleModel(m.id)}
                      type="checkbox"
                    />
                    <span>{m.label}</span>
                    {m.hint && <span className="opacity-60">· {m.hint}</span>}
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] opacity-60">
                Алмазы будут списаны за каждую выбранную модель.
              </div>
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                className="rounded-lg border border-[rgba(255,255,255,0.25)] px-3 py-1 text-[12px] opacity-90 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || !prompt.trim() || selected.length === 0}
              >
                {loading ? 'Сравниваем…' : 'Сравнить модели'}
              </button>
            </div>

            {error && <div className="text-[11px] text-red-400">{error}</div>}
          </form>
        )}

        {results.length > 0 && (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
            <div className="mb-2 text-[11px] opacity-60">Результаты:</div>
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((r) => (
                <div
                  className="flex flex-col gap-2 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] p-2"
                  key={r.model}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-medium">{r.model}</span>
                    <span className={r.ok ? 'opacity-60' : 'text-red-400 opacity-90'}>
                      {r.ok ? 'OK' : 'Ошибка'}
                    </span>
                  </div>
                  <div className="max-h-64 overflow-auto rounded bg-[rgba(0,0,0,0.25)] p-2 text-[12px] leading-relaxed">
                    {r.ok ? (
                      <pre className="whitespace-pre-wrap break-words font-sans text-[12px]">
                        {r.output}
                      </pre>
                    ) : (
                      <span>{r.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Flexbox>
  );
};

export default MultiModelComparePanel;
