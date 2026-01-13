'use client';

import { useEffect, useMemo, useState } from 'react';

type MultiResultItem = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

type ChainStep = {
  createdAt: number;
  id: string;
  models: string[];
  prompt: string;
  results: MultiResultItem[];
  selectedModel?: string | null;
};

const LS_KEY = 'neural_chain_v1';

const DEFAULT_MODELS = [
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'google/gemini-1.5-flash',
  'deepseek/deepseek-chat',
];

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random()}`;

export function CompareChainWidget() {
  const [prompt, setPrompt] = useState('');
  const [models, setModels] = useState<string[]>(DEFAULT_MODELS.slice(0, 2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [chain, setChain] = useState<ChainStep[]>([]);
  const [activeStep, setActiveStep] = useState<ChainStep | null>(null);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const [nextModel, setNextModel] = useState<string>(DEFAULT_MODELS[0]);
  const [nextPrompt, setNextPrompt] = useState<string>('');

  // load chain from LS
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setChain(parsed);
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(chain));
    } catch {}
  }, [chain]);

  const selectedOutput = useMemo(() => {
    if (!activeStep || !selectedModel) return '';
    const r = activeStep.results.find((x) => x.model === selectedModel);
    return r?.output ?? '';
  }, [activeStep, selectedModel]);

  const runCompare = async () => {
    setLoading(true);
    setError(null);
    setSelectedModel(null);
    setActiveStep(null);

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({ models, prompt }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const json = await res.json().catch(() => null);

      if (!json || !Array.isArray(json.results)) {
        setError('Сервер вернул неожиданный ответ');
        setLoading(false);
        return;
      }

      const step: ChainStep = {
        createdAt: Date.now(),
        id: genId(),
        models,
        prompt,
        results: json.results as MultiResultItem[],
        selectedModel: null,
      };

      setChain((prev) => [step, ...prev]);
      setActiveStep(step);
    } catch (e) {
      console.error(e);
      setError('Ошибка сети/сервера');
    } finally {
      setLoading(false);
    }
  };

  const choose = (m: string) => {
    setSelectedModel(m);

    setChain((prev) =>
      prev.map((s) => {
        if (activeStep && s.id === activeStep.id) {
          return { ...s, selectedModel: m };
        }
        return s;
      }),
    );

    if (activeStep) {
      setActiveStep({ ...activeStep, selectedModel: m });
    }
  };

  const runNextStep = async () => {
    if (!activeStep || !selectedModel) return;

    const base = selectedOutput.trim();
    const user = nextPrompt.trim();

    if (!user) {
      setError('Введите промпт для следующего шага');
      return;
    }
    if (!base) {
      setError('Не найден выбранный текст предыдущего шага');
      return;
    }

    const combinedPrompt =
      `Контекст (результат предыдущего шага):\n<<<\n${base}\n>>>\n\n` +
      `Новый запрос пользователя:\n${user}`;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({ models: [nextModel], prompt: combinedPrompt }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const json = await res.json().catch(() => null);
      const results = (json?.results ?? []) as MultiResultItem[];

      const step: ChainStep = {
        createdAt: Date.now(),
        id: genId(),
        models: [nextModel],
        prompt: user,
        results,
        selectedModel: nextModel,
      };

      setChain((prev) => [step, ...prev]);
      setActiveStep(step);
      setSelectedModel(nextModel);
      setNextPrompt('');
    } catch (e) {
      console.error(e);
      setError('Ошибка сети/сервера');
    } finally {
      setLoading(false);
    }
  };

  const resetChain = () => {
    setChain([]);
    setActiveStep(null);
    setSelectedModel(null);
    setNextPrompt('');
    try {
      localStorage.removeItem(LS_KEY);
    } catch {}
  };

  return (
    <div className="rounded-2xl border p-3 text-xs bg-[rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm">Сравнить модели и собрать цепочку</div>
        <button
          className="rounded-md border px-2 py-1 text-[11px]"
          onClick={resetChain}
          type="button"
        >
          Сбросить цепочку
        </button>
      </div>

      <div className="mt-2 grid gap-2">
        <textarea
          className="w-full min-h-[70px] rounded-md border px-2 py-1 bg-transparent text-xs"
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Например: "Создай пост о бычьем рынке криптовалют в 2026"'
          value={prompt}
        />

        <div className="flex flex-wrap gap-2">
          {DEFAULT_MODELS.map((m) => {
            const checked = models.includes(m);
            return (
              <button
                className={`rounded-md border px-2 py-1 text-[11px] ${checked ? 'opacity-100' : 'opacity-60'}`}
                key={m}
                onClick={() => {
                  setModels((prev) => {
                    const next = new Set(prev);
                    if (next.has(m)) next.delete(m);
                    else next.add(m);
                    return Array.from(next).slice(0, 5);
                  });
                }}
                type="button"
              >
                {checked ? '✅ ' : ''}
                {m}
              </button>
            );
          })}
        </div>

        <button
          className="rounded-md border px-3 py-2 text-[12px]"
          disabled={loading}
          onClick={() => void runCompare()}
          type="button"
        >
          {loading ? 'Сравниваем…' : 'Сравнить модели'}
        </button>

        {error && <div className="text-red-500 text-[11px]">{error}</div>}
      </div>

      {/* Results */}
      {activeStep && (
        <div className="mt-4">
          <div className="text-[11px] opacity-70 mb-2">Результаты текущего шага:</div>

          {/* пока не выбрали — показываем все; выбрали — показываем один */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {(selectedModel
              ? activeStep.results.filter((r) => r.model === selectedModel)
              : activeStep.results
            ).map((r) => (
              <div className="rounded-xl border p-3 bg-[rgba(0,0,0,0.02)]" key={r.model}>
                <div className="flex items-center gap-2">
                  <div className="font-medium truncate">{r.model}</div>
                  <div
                    className={`ml-auto text-[11px] ${r.ok ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {r.ok ? 'OK' : 'Ошибка'}
                  </div>
                </div>

                <pre className="mt-2 whitespace-pre-wrap text-[11px] opacity-90">
                  {r.ok ? r.output : r.error}
                </pre>

                {!selectedModel && r.ok && (
                  <button
                    className="mt-2 rounded-md border px-2 py-1 text-[11px]"
                    onClick={() => choose(r.model)}
                    type="button"
                  >
                    Выбрать этот ответ
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Next step */}
          {selectedModel && (
            <div className="mt-4 rounded-xl border p-3">
              <div className="text-[11px] opacity-70 mb-2">
                Продолжить работу с выбранным результатом:
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-[11px] opacity-70">Модель:</div>
                <select
                  className="rounded-md border px-2 py-1 text-[11px] bg-transparent"
                  onChange={(e) => setNextModel(e.target.value)}
                  value={nextModel}
                >
                  {DEFAULT_MODELS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="mt-2 w-full min-h-[60px] rounded-md border px-2 py-1 bg-transparent text-xs"
                onChange={(e) => setNextPrompt(e.target.value)}
                placeholder='Например: "Придумай 10 идей для картинки под этот пост в инстаграм"'
                value={nextPrompt}
              />

              <button
                className="mt-2 rounded-md border px-3 py-2 text-[12px]"
                disabled={loading}
                onClick={() => void runNextStep()}
                type="button"
              >
                {loading ? 'Запускаем…' : 'Запустить следующий шаг'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chain list */}
      {chain.length > 0 && (
        <div className="mt-4">
          <div className="text-[11px] opacity-70 mb-2">Цепочка шагов ({chain.length})</div>
          <div className="space-y-2">
            {chain.map((s, idx) => (
              <button
                className="w-full text-left rounded-lg border px-3 py-2 hover:opacity-90"
                key={s.id}
                onClick={() => {
                  setActiveStep(s);
                  setSelectedModel(s.selectedModel ?? null);
                }}
                type="button"
              >
                <div className="flex items-center gap-2">
                  <div className="font-medium">Шаг {chain.length - idx}</div>
                  <div className="ml-auto text-[10px] opacity-60">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-[10px] opacity-70 mt-1">Модели: {s.models.join(', ')}</div>
                <div className="text-[10px] opacity-70 mt-1 line-clamp-2">Промпт: {s.prompt}</div>
                {s.selectedModel && (
                  <div className="text-[10px] opacity-70 mt-1">Выбрано: {s.selectedModel}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
