import { ModelProvider } from './types';
import { PromptData, AnalysisReport } from '../types';

/**
 * MOCK MODEL (Heuristic Engine)
 * This is the current logic you have. 
 * You can use this as a reference for how to add new ones.
 */
export const MockModel: ModelProvider = {
  id: 'mock-engine',
  name: 'PromptLab Heuristic Engine',
  description: 'Fast, rule-based analysis (No API key required)',
  apiKeyEnv: '',
  model: 'internal',
  provider: 'mock',
  
  analyze: async (data: PromptData): Promise<AnalysisReport> => {
    // The product owner requested to show a real error screen instead of a "fake" report
    // when a model is not configured. Since this is a mock/heuristic engine, 
    // we will simulate a configuration failure to show the error screen.
    throw new Error("Model configuration missing. The heuristic engine is currently disabled to prevent 'fake' reports. Please configure a real Gemini API key to proceed.");
  }
};
