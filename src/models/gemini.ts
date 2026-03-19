import { ModelProvider } from './types';
import { PromptData, AnalysisReport } from '../types';

/**
 * GEMINI MODEL PROVIDER
 * 
 * This is a real implementation using Google's Gemini API.
 */
export const createGeminiProvider = (config: { id: string, name: string, description: string, model: string, apiKeyEnv: string }): ModelProvider => ({
  ...config,
  provider: 'gemini',
  analyze: async (data: PromptData): Promise<AnalysisReport> => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        apiKeyEnv: config.apiKeyEnv,
        promptData: data,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error || 'Analysis failed. Check the dev terminal for details.',
      );
    }

    return payload as AnalysisReport;
  },
});

export const GeminiModel = createGeminiProvider({
  id: 'gemini-3.1-pro-preview',
  name: 'Gemini 3.1 Pro',
  description: 'Advanced reasoning and large context window (Latest).',
  apiKeyEnv: 'GEMINI_API_KEY',
  model: 'gemini-3.1-pro-preview'
});
