export type ModelCostConfig = {
  defaultCost: number;
  specificModels: Record<string, number>;
};

export const modelPricing: ModelCostConfig = {
  defaultCost: 0,
  specificModels: {
    // сюда подставь реальные ID моделей, как у тебя в конфиге
    'deepseek/chat': 1,
    'google/gemini-flash': 1,
    'gpt-4o': 1,
    'kimi/chat': 1,
  },
};

export const getModelCost = (model: string): number => {
  if (!model) return 0;
  const direct = modelPricing.specificModels[model];
  if (typeof direct === 'number') return direct;
  return modelPricing.defaultCost;
};
