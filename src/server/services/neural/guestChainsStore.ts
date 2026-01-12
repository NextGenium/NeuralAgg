import { randomUUID } from 'node:crypto';

export type StepResult = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

export type GuestChain = {
  createdAt: string;
  id: string;
  summary: string;
  title: string;
  updatedAt: string;
};

export type GuestStep = {
  chainId: string;
  createdAt: string;
  id: string;
  index: number;
  models: string[];
  prompt: string;
  results: StepResult[];
};

type Store = {
  chains: GuestChain[];
  stepsByChain: Record<string, GuestStep[]>;
};

const mem = new Map<string, Store>(); // key = guestId

function now() {
  return new Date().toISOString();
}

function getStore(guestId: string): Store {
  const existing = mem.get(guestId);
  if (existing) return existing;
  const created: Store = { chains: [], stepsByChain: {} };
  mem.set(guestId, created);
  return created;
}

function buildTitle(prompt: string) {
  const p = prompt.trim().replaceAll(/\s+/g, ' ');
  return p.length > 48 ? p.slice(0, 48) + '…' : p;
}

function buildSummary(results: StepResult[]) {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  return `Сравнение моделей: ${ok}/${total} успешно`;
}

export const GuestChainsStore = {
  appendStep(
    guestId: string,
    chainId: string,
    input: { models: string[]; prompt: string; results: StepResult[] },
  ) {
    const s = getStore(guestId);
    const chain = s.chains.find((c) => c.id === chainId);
    if (!chain) return null;

    const steps = s.stepsByChain[chainId] ?? [];
    const step: GuestStep = {
      chainId,
      createdAt: now(),
      id: randomUUID(),
      index: steps.length + 1,
      models: input.models,
      prompt: input.prompt,
      results: input.results,
    };

    s.stepsByChain[chainId] = [...steps, step];
    chain.updatedAt = now();
    chain.summary = buildSummary(input.results);

    return { chain, step };
  },

  createWithFirstStep(
    guestId: string,
    input: { models: string[]; prompt: string; results: StepResult[] },
  ) {
    const s = getStore(guestId);
    const chainId = randomUUID();
    const createdAt = now();

    const chain: GuestChain = {
      createdAt,
      id: chainId,
      summary: buildSummary(input.results),
      title: buildTitle(input.prompt),
      updatedAt: createdAt,
    };

    const step: GuestStep = {
      chainId,
      createdAt,
      id: randomUUID(),
      index: 1,
      models: input.models,
      prompt: input.prompt,
      results: input.results,
    };

    s.chains.unshift(chain);
    s.stepsByChain[chainId] = [step];

    return { chain, step };
  },

  get(guestId: string, chainId: string) {
    const s = getStore(guestId);
    const chain = s.chains.find((c) => c.id === chainId);
    if (!chain) return null;
    const steps = s.stepsByChain[chainId] ?? [];
    return { chain, steps };
  },

  list(guestId: string) {
    return getStore(guestId).chains;
  },
};
