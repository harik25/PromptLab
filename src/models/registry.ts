import { ModelProvider } from './types';
import { MockModel } from './mock';
import { createGeminiProvider } from './gemini';
import modelConfigs from './models.json';

/**
 * MASTER MODEL REGISTRY
 * 
 * To add a new model:
 * 1. Open 'models.json'
 * 2. Add your model details there
 */

// Map the JSON configurations to actual ModelProvider implementations
const registeredModels: ModelProvider[] = modelConfigs.map(config => {
  if (config.provider === 'gemini') {
    return createGeminiProvider(config as any);
  }
  // For mock or others, use the base MockModel but override with JSON values
  return { 
    ...MockModel, 
    ...config 
  } as ModelProvider;
});

export const models: ModelProvider[] = registeredModels;

export const getModelById = (id: string): ModelProvider => {
  return models.find(m => m.id === id) || MockModel;
};
