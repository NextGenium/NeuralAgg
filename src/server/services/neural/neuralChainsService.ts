import { and, asc, eq } from 'drizzle-orm';

import { serverDB } from '@/database/core/db-adaptor';
import { neuralChainSteps, neuralChains } from '@/database/schemas';

export type NeuralChainsStepResult = {
  error?: string;
  model: string;
  ok: boolean;
  output?: string;
};

export type CreateChainStepInput = {
  models: string[];
  prompt: string;
  results: NeuralChainsStepResult[];
};

export const NeuralChainsService = {
  async appendStep(userId: string, chainId: string, input: CreateChainStepInput) {
    const db = serverDB;

    const [chain] = await db
      .select()
      .from(neuralChains)
      .where(and(eq(neuralChains.id, chainId), eq(neuralChains.userId, userId)))
      .limit(1);

    if (!chain) {
      throw new Error('CHAIN_NOT_FOUND_OR_FORBIDDEN');
    }

    const [lastStep] = await db
      .select()
      .from(neuralChainSteps)
      .where(eq(neuralChainSteps.chainId, chainId))
      .orderBy(asc(neuralChainSteps.index));

    const nextIndex = lastStep ? lastStep.index + 1 : 1;

    const [step] = await db
      .insert(neuralChainSteps)
      .values({
        chainId,
        index: nextIndex,
        models: input.models,
        prompt: input.prompt,
        results: input.results,
      })
      .returning();

    await db
      .update(neuralChains)
      .set({
        summary: input.prompt.slice(0, 200),
        updatedAt: new Date(),
      })
      .where(eq(neuralChains.id, chainId));

    return { chain, step };
  },

  async createChainWithFirstStep(userId: string, input: CreateChainStepInput) {
    const db = serverDB;
    const title = input.prompt.slice(0, 60);
    const summary = input.prompt.slice(0, 200);

    const [chain] = await db
      .insert(neuralChains)
      .values({
        summary,
        title,
        userId,
      })
      .returning();

    const [step] = await db
      .insert(neuralChainSteps)
      .values({
        chainId: chain.id,
        index: 1,
        models: input.models,
        prompt: input.prompt,
        results: input.results,
      })
      .returning();

    return { chain, step };
  },

  async getChainWithSteps(chainId: string, userId: string) {
    const db = serverDB;

    const [chain] = await db
      .select()
      .from(neuralChains)
      .where(and(eq(neuralChains.id, chainId), eq(neuralChains.userId, userId)))
      .limit(1);

    if (!chain) return null;

    const steps = await db
      .select()
      .from(neuralChainSteps)
      .where(eq(neuralChainSteps.chainId, chainId))
      .orderBy(neuralChainSteps.index);

    return { chain, steps };
  },

  async listChainsForUser(userId: string) {
    const db = serverDB;

    return db
      .select()
      .from(neuralChains)
      .where(eq(neuralChains.userId, userId))
      .orderBy(neuralChains.createdAt);
  },
};
