'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

type MultiResultItem = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

type ChainStep = {
  createdAt: number;
  id: string;
  kind: 'compare' | 'chat';
  models: string[];
  // для compare-шага: выбранный ответ
  pickedModel?: string | null;
  pickedText?: string | null;
  prompt: string;
  results: MultiResultItem[];
};

const AVAILABLE_MODELS: { hint?: string; id: string; label: string }[] = [
  { hint: 'LLM', id: 'openai/gpt-4o-mini', label: 'GPT-4o mini' },
  { hint: 'Premium LLM', id: 'gpt-4o', label: 'GPT-4o' }, // alias -> openai/gpt-4o
  { hint: 'LLM', id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet' },
  {
    hint: 'Light LLM',
    id: "google/gemini-flash': 'google/gemini-2.0-flash",
    label: 'Gemini',
  },
  { hint: 'LLM', id: 'deepseek/chat', label: 'DeepSeek' }, // alias -> deepseek/deepseek-chat
];

// чтобы UI не убивался и 402 реже происходил (контекст резать!)
const MAX_CONTEXT_CHARS = 4500;

const genId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

function trimContext(text: string) {
  const t = (text ?? '').trim();
  if (t.length <= MAX_CONTEXT_CHARS) return t;
  return t.slice(0, MAX_CONTEXT_CHARS) + '\n\n[...обрезано для лимита контекста]';
}

function buildPromptWithContext(context: string, userPrompt: string) {
  const ctx = trimContext(context);
  const up = (userPrompt ?? '').trim();
  return [
    'Контекст (результат предыдущего шага):',
    '<<<',
    ctx,
    '>>>',
    '',
    'Новый запрос пользователя:',
    up,
  ].join('\n');
}

export default function MultiModelComparePanel() {
  // STEP 1 input (compare)
  const [comparePrompt, setComparePrompt] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>([
    'openai/gpt-4o-mini',
    'google/gemini-1.5-flash',
    'deepseek/chat',
  ]);

  // UI state machine
  const [mode, setMode] = useState<'idle' | 'comparing' | 'picked' | 'chatting'>('idle');

  // current compare results
  const [compareResults, setCompareResults] = useState<MultiResultItem[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);

  // picked winner
  const [pickedModel, setPickedModel] = useState<string | null>(null);
  const [pickedText, setPickedText] = useState<string>('');

  // chat continuation
  const [chatModel, setChatModel] = useState<string>('openai/gpt-4o-mini');
  const [chatPrompt, setChatPrompt] = useState<string>(''); // только "что дальше сделать"
  const [chatError, setChatError] = useState<string | null>(null);

  // chain history
  const [chain, setChain] = useState<ChainStep[]>([]);

  // refs for scrolling
  const resultsAnchorRef = useRef<HTMLDivElement | null>(null);
  const pickedAnchorRef = useRef<HTMLDivElement | null>(null);

  const canCompare = useMemo(() => {
    return mode !== 'comparing' && !!comparePrompt.trim() && selectedModels.length > 0;
  }, [mode, comparePrompt, selectedModels.length]);

  const canChat = useMemo(() => {
    const isCorrectMode = mode === 'picked' || mode === 'chatting';
    return isCorrectMode && !!chatPrompt.trim() && !!pickedText;
  }, [mode, chatPrompt, pickedText]);

  const toggleModel = (id: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return Array.from(next);
    });
  };

  // scroll helpers
  useEffect(() => {
    if (compareResults.length > 0) {
      setTimeout(
        () => resultsAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        50,
      );
    }
  }, [compareResults.length]);

  useEffect(() => {
    if (mode === 'picked') {
      setTimeout(
        () => pickedAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        50,
      );
    }
  }, [mode]);

  const runCompare = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCompare) return;

    setMode('comparing');
    setCompareError(null);
    setCompareResults([]);
    setPickedModel(null);
    setPickedText('');
    setChatPrompt('');
    setChatError(null);

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({
          maxTokens: 900,
          models: selectedModels,

          prompt: comparePrompt.trim(),
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        ok?: boolean;
        results?: MultiResultItem[];
      } | null;

      if (!json || !Array.isArray(json.results)) {
        setCompareError('Сервер вернул неожиданный ответ');
        setMode('idle');
        return;
      }

      if (json.error) setCompareError(json.message || json.error);

      const results = json.results ?? [];
      setCompareResults(results);

      // добавим compare-шаг в цепочку
      const step: ChainStep = {
        createdAt: Date.now(),
        id: genId(),
        kind: 'compare',
        models: selectedModels,
        pickedModel: null,
        pickedText: null,
        prompt: comparePrompt.trim(),
        results,
      };

      setChain((prev) => [step, ...prev]);
      setMode('idle');
    } catch (err) {
      console.error(err);
      setCompareError('Ошибка сети/сервера');
      setMode('idle');
    }
  };

  const pickAnswer = (modelId: string) => {
    const r = compareResults.find((x) => x.model === modelId);
    if (!r?.ok || !r.output) return;

    setPickedModel(modelId);
    setPickedText(r.output);
    setChatModel(modelId); // по умолчанию продолжаем с той же моделью
    setMode('picked');

    // записать выбранный ответ в последний compare-step
    setChain((prev) => {
      const next = [...prev];
      const idx = next.findIndex((s) => s.kind === 'compare' && s.prompt === comparePrompt.trim());
      // если не нашли по промпту — просто обновим самый последний compare
      const lastCompareIdx = idx !== -1 ? idx : next.findIndex((s) => s.kind === 'compare');
      if (lastCompareIdx !== -1) {
        next[lastCompareIdx] = {
          ...next[lastCompareIdx],
          pickedModel: modelId,
          pickedText: r.output,
        };
      }
      return next;
    });
  };

  const backToCompare = () => {
    setMode('idle');
    setPickedModel(null);
    setPickedText('');
    setChatPrompt('');
    setChatError(null);
  };

  const runChatStep = async () => {
    if (!canChat) return;

    setMode('chatting');
    setChatError(null);

    const combinedPrompt = buildPromptWithContext(pickedText, chatPrompt);

    try {
      const res = await fetch('/api/neural/multi', {
        body: JSON.stringify({
          maxTokens: 900,
          models: [chatModel],
          prompt: combinedPrompt,
        }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      const json = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        ok?: boolean;
        results?: MultiResultItem[];
      } | null;

      const results = (json?.results ?? []) as MultiResultItem[];

      if (!Array.isArray(results) || results.length === 0) {
        setChatError('Сервер вернул неожиданный ответ');
        setMode('picked');
        return;
      }

      if (json?.error) setChatError(json.message || json.error);

      // обновим "текущий выбранный текст" на новый ответ (чатовый шаг)
      const first = results[0];
      if (first?.ok && first.output) {
        setPickedModel(chatModel);
        setPickedText(first.output);
        setChatPrompt('');
      }

      // добавим chat-шаг в историю
      const step: ChainStep = {
        createdAt: Date.now(),
        id: genId(),
        kind: 'chat',
        models: [chatModel],
        prompt: chatPrompt.trim(),
        results,
      };
      setChain((prev) => [step, ...prev]);

      setMode('picked');
    } catch (err) {
      console.error(err);
      setChatError('Ошибка сети/сервера');
      setMode('picked');
    }
  };

  const resetAll = () => {
    setComparePrompt('');
    setSelectedModels(['openai/gpt-4o-mini', 'google/gemini-1.5-flash', 'deepseek/chat']);
    setCompareResults([]);
    setCompareError(null);
    setPickedModel(null);
    setPickedText('');
    setChatPrompt('');
    setChatError(null);
    setChain([]);
    setMode('idle');
  };

  // @ts-ignore
  // @ts-ignore
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <div>
          <div className="text-[12px] font-medium opacity-90">
            Сравнить модели и собрать цепочку
          </div>
          <div className="text-[11px] opacity-60">
            1 промпт → несколько ответов. Выбираешь лучший → продолжаешь как в чате (с той же или
            другой моделью).
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="text-[11px] opacity-70 hover:opacity-100"
            onClick={resetAll}
            type="button"
          >
            Сбросить цепочку
          </button>
        </div>
      </div>

      {/* STEP 1: Compare */}
      <form className="px-3 py-3 flex flex-col gap-3" onSubmit={runCompare}>
        <textarea
          className="w-full resize-none rounded-lg border border-[rgba(255,255,255,0.08)] bg-transparent px-2 py-2 text-[13px] outline-none focus:border-[rgba(255,255,255,0.25)]"
          onChange={(e) => setComparePrompt(e.target.value)}
          placeholder='Например: "Создай пост о бычьем рынке криптовалют в 2026"'
          rows={3}
          value={comparePrompt}
        />

        <div className="flex flex-wrap gap-2">
          {AVAILABLE_MODELS.map((m) => {
            const active = selectedModels.includes(m.id);
            return (
              <label
                className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] cursor-pointer ${
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

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] opacity-60">
            За каждую выбранную модель будут списаны алмазы.
          </div>
          <button
            className="rounded-lg border border-[rgba(255,255,255,0.25)] px-3 py-1 text-[12px] opacity-90 hover:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!canCompare}
            type="submit"
          >
            {mode === 'comparing' ? 'Сравниваем…' : 'Сравнить модели'}
          </button>
        </div>

        {compareError && <div className="text-[11px] text-red-400">{compareError}</div>}
      </form>

      {/* Results */}
      <div ref={resultsAnchorRef} />

      {compareResults.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
          <div className="text-[11px] opacity-70 mb-2">Ответы моделей (выбери один):</div>

          {/* горизонтальный ряд карточек */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-3 min-w-max">
              {compareResults.map((r) => (
                <div
                  className="w-[360px] shrink-0 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] p-3"
                  key={r.model}
                >
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-[12px] truncate">{r.model}</div>
                    <div className={`ml-auto text-[11px] ${r.ok ? 'opacity-60' : 'text-red-400'}`}>
                      {r.ok ? 'OK' : 'Ошибка'}
                    </div>
                  </div>

                  <div className="mt-2 h-56 overflow-auto rounded-lg bg-[rgba(0,0,0,0.25)] p-2">
                    <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed">
                      {r.ok ? r.output : r.error}
                    </pre>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <button
                      className="rounded-md border border-[rgba(255,255,255,0.2)] px-2 py-1 text-[11px] hover:opacity-100 opacity-90 disabled:opacity-40"
                      disabled={!r.ok || !r.output}
                      onClick={() => pickAnswer(r.model)}
                      type="button"
                    >
                      Выбрать этот ответ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[10px] opacity-50">
            Листай горизонтально, чтобы сравнивать ответы “окошками”.
          </div>
        </div>
      )}

      {/* Picked view (single answer + chat composer) */}
      <div ref={pickedAnchorRef} />

      {mode === 'picked' && pickedModel && pickedText && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-[11px] opacity-70">
              Выбранный ответ: <span className="opacity-95">{pickedModel}</span>
            </div>

            <button
              className="text-[11px] opacity-60 hover:opacity-100"
              onClick={backToCompare}
              type="button"
            >
              ← Назад к сравнению
            </button>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.02)] p-3">
            <div className="text-[12px] font-medium opacity-85 mb-2">Ответ</div>
            <div className="max-h-[340px] overflow-auto rounded-lg bg-[rgba(0,0,0,0.25)] p-2">
              <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed">
                {pickedText}
              </pre>
            </div>

            {/* Chat composer */}
            <div className="mt-3 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.01)] p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] opacity-70">Продолжить работу с:</div>

                <select
                  className="rounded-md border border-[rgba(255,255,255,0.2)] bg-transparent px-2 py-1 text-[11px]"
                  onChange={(e) => setChatModel(e.target.value)}
                  value={chatModel}
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.id})
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                className="mt-2 w-full min-h-[70px] rounded-md border border-[rgba(255,255,255,0.18)] bg-transparent px-2 py-2 text-[12px] outline-none focus:border-[rgba(255,255,255,0.35)]"
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder='Например: "Придумай 10 идей для картинки под этот пост в инстаграм"'
                value={chatPrompt}
              />

              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <div className="text-[11px] opacity-55">
                  Контекст выбранного ответа подмешивается автоматически (скрыто).
                </div>

                <button
                  className="rounded-lg border border-[rgba(255,255,255,0.25)] px-3 py-1 text-[12px] opacity-90 hover:opacity-100 disabled:opacity-40"
                  /* @ts-ignore */
                  disabled={!canChat || mode === 'chatting'}
                  onClick={() => void runChatStep()}
                  type="button"
                >
                  {(() => {
                    /* @ts-ignore */
                    if (mode === 'chatting') return 'Отправить';
                    return 'Запускаем…';
                  })()}
                </button>
              </div>

              {chatError && <div className="mt-2 text-[11px] text-red-400">{chatError}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Chain history */}
      {chain.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.06)] px-3 py-3">
          <div className="text-[11px] font-medium opacity-85 mb-2">
            История шагов ({chain.length})
          </div>

          <div className="max-h-56 overflow-auto flex flex-col gap-2">
            {chain.map((s) => (
              <div
                className="rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.01)] p-2"
                key={s.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[11px] font-medium">
                    {s.kind === 'compare' ? 'Сравнение моделей' : 'Чат-шаг'}
                  </div>
                  <div className="text-[10px] opacity-50">
                    {new Date(s.createdAt).toLocaleTimeString()}
                  </div>
                </div>

                <div className="mt-1 text-[10px] opacity-70">Модели: {s.models.join(', ')}</div>

                {s.kind === 'compare' && s.pickedModel && (
                  <div className="mt-1 text-[10px] opacity-70">
                    Выбрано: <span className="opacity-90">{s.pickedModel}</span>
                  </div>
                )}

                <div className="mt-1 text-[10px] opacity-70 line-clamp-2">Промпт: {s.prompt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
