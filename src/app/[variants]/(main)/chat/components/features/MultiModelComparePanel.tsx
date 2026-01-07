'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

type MultiResultItem = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

type ChainStep = {
  createdAt: string;
  id: string;
  index: number;
  models: string[];
  prompt: string;
  results: MultiResultItem[];
};

const AVAILABLE_MODELS: { hint?: string; id: string; label: string }[] = [
  { hint: 'LLM', id: 'deepseek/chat', label: 'DeepSeek' },
  { hint: 'LLM', id: 'kimi/chat', label: 'Kimi' },
  { hint: 'Light LLM', id: 'google/gemini-flash', label: 'Gemini Flash' },
  { hint: 'Premium LLM', id: 'gpt-4o', label: 'GPT-4o' },
];

const createLocalStepId = () => `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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

  // id цепочки на бэке
  const [chainId, setChainId] = useState<string | null>(null);
  // локальная история шагов
  const [chain, setChain] = useState<ChainStep[]>([]);

  const canRun = useMemo(
    () => !loading && !!prompt.trim() && selected.length > 0,
    [loading, prompt, selected],
  );

  const toggleModel = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  const persistStepToBackend = async (
    currentPrompt: string,
    currentModels: string[],
    currentResults: MultiResultItem[],
  ) => {
    if (!currentResults.length) return null;

    if (!chainId) {
      const res = await fetch('/api/neural/chains', {
        body: JSON.stringify({
          models: currentModels,
          prompt: currentPrompt,
          results: currentResults,
        }),
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        console.error('[chains] create failed', json);
        return null;
      }

      const json = (await res.json()) as {
        chain: { id: string };
        step: { createdAt: string; id: string; index: number };
      };

      setChainId(json.chain.id);

      return json;
    }

    const res = await fetch(`/api/neural/chains/${chainId}`, {
      body: JSON.stringify({
        models: currentModels,
        prompt: currentPrompt,
        results: currentResults,
      }),
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error('[chains] append failed', json);
      return null;
    }

    const json = (await res.json()) as {
      chain: { id: string };
      step: { createdAt: string; id: string; index: number };
    };

    // на всякий случай
    setChainId(json.chain.id);

    return json;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canRun) return;

    setLoading(true);
    setError(null);
    setResults([]);

    const currentPrompt = prompt.trim();
    const currentModels = [...selected];

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({
          models: currentModels,
          prompt: currentPrompt,
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

      const json = (await res.json()) as { prompt: string; results: MultiResultItem[] };
      const newResults = json.results || [];

      // локально
      const localStepId = createLocalStepId();
      const localIndex = chain.length + 1;
      const localStep: ChainStep = {
        createdAt: new Date().toISOString(),
        id: localStepId,
        index: localIndex,
        models: currentModels,
        prompt: currentPrompt,
        results: newResults,
      };

      setResults(newResults);
      setChain((prev) => [...prev, localStep]);

      // на бэке
      void persistStepToBackend(currentPrompt, currentModels, newResults);
    } catch (err) {
      console.error('Failed to call /api/neural/multi', err);
      setError('Ошибка сети или сервера');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithModel = (r: MultiResultItem) => {
    if (!r.output) return;

    const newPrompt = [
      `Продолжи работу на основе ответа модели "${r.model}".`,
      '',
      'Вот этот ответ:',
      r.output,
      '',
      'Сделай следующий шаг: уточни и структурируй план действий, не повторяя исходный текст дословно.',
    ].join('\n');

    setPrompt(newPrompt);

    if (!selected.length) {
      setSelected([r.model]);
    }
  };

  const handleCopyToClipboard = async (r: MultiResultItem) => {
    if (!r.output) return;
    try {
      await navigator.clipboard.writeText(r.output);
      // eslint-disable-next-line no-alert
      alert('Ответ скопирован. Вставьте его в чат, чтобы продолжить диалог.');
    } catch (e) {
      console.error('clipboard error', e);
      // eslint-disable-next-line no-alert
      alert('Не удалось скопировать текст в буфер обмена.');
    }
  };

  const handleResetChain = () => {
    setChain([]);
    setResults([]);
    setPrompt('');
    setError(null);
    setChainId(null);
  };

  const lastStep = chain.at(-1);

  return (
    <Flexbox gap={8} paddingBlock={8} paddingInline={16}>
      <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
          <div className="flex flex-col gap-0.5">
            <div className="text-[12px] font-medium opacity-80">
              Сравнить модели и собрать цепочку
            </div>
            <div className="text-[11px] opacity-60">
              Один промпт → несколько моделей. Ответы можно передавать далее как шаги цепочки.
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chain.length > 0 && (
              // eslint-disable-next-line react/button-has-type
              <button
                className="text-[11px] opacity-60 hover:opacity-100"
                onClick={handleResetChain}
              >
                Сбросить цепочку
              </button>
            )}
            {/* eslint-disable-next-line react/button-has-type */}
            <button
              className="text-[11px] opacity-60 hover:opacity-100"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Свернуть' : 'Развернуть'}
            </button>
          </div>
        </div>

        {/* Form */}
        {expanded && (
          <form className="flex flex-col gap-3 px-3 py-3" onSubmit={handleSubmit}>
            <textarea
              className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent px-2 py-1 text-[13px] outline-none focus:border-[rgba(255,255,255,0.25)]"
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                lastStep
                  ? 'Следующий шаг цепочки: уточните, что нужно сделать на основе предыдущих ответов...'
                  : 'Опишите задачу — один промпт, который запустим сразу в несколько моделей…'
              }
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] opacity-60">
                За каждую выбранную модель будут списаны алмазы согласно тарифу.
              </div>
              {/* eslint-disable-next-line react/button-has-type */}
              <button
                className="rounded-lg border border-[rgba(255,255,255,0.25)] px-3 py-1 text-[12px] opacity-90 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canRun}
              >
                {loading ? 'Сравниваем…' : lastStep ? 'Запустить следующий шаг' : 'Сравнить модели'}
              </button>
            </div>

            {error && <div className="text-[11px] text-red-400">{error}</div>}
          </form>
        )}

        {/* Current step results */}
        {results.length > 0 && (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
            <div className="mb-2 text-[11px] opacity-60">Результаты текущего шага:</div>
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

                  {/* Chain actions */}
                  {r.ok && r.output && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[10px] opacity-60">
                        Использовать этот ответ как вход для следующего шага или для чата.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {/* eslint-disable-next-line react/button-has-type */}
                        <button
                          className="rounded-md border border-[rgba(255,255,255,0.2)] px-2 py-0.5 text-[11px] opacity-90 hover:opacity-100"
                          onClick={() => handleContinueWithModel(r)}
                        >
                          Продолжить с этой моделью
                        </button>
                        {/* eslint-disable-next-line react/button-has-type */}
                        <button
                          className="rounded-md border border-[rgba(255,255,255,0.2)] px-2 py-0.5 text-[11px] opacity-90 hover:opacity-100"
                          onClick={() => handleCopyToClipboard(r)}
                        >
                          Вставить в чат
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chain history */}
        {chain.length > 0 && (
          <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
            <div className="mb-2 text-[11px] font-medium opacity-80">
              Цепочка шагов ({chain.length})
              {chainId && (
                <span className="ml-2 text-[10px] opacity-50">(сохранена, id: {chainId})</span>
              )}
            </div>
            <div className="flex flex-col gap-2 max-h-52 overflow-auto">
              {chain.map((step) => (
                <div
                  className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.01)] p-2"
                  key={step.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-medium">Шаг {step.index}</div>
                    <div className="text-[10px] opacity-50">
                      {new Date(step.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] opacity-70">
                    Модели: {step.models.join(', ')}
                  </div>
                  <div className="mt-1 max-h-16 overflow-hidden text-[11px] opacity-80">
                    <span className="opacity-60">Промпт: </span>
                    {step.prompt.length > 160 ? `${step.prompt.slice(0, 160)}…` : step.prompt}
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
