import { PromptData, AnalysisReport } from '../types';

/**
 * This is the standard template for any AI Model you want to add.
 * As a Product Owner, you just need to ensure your new file 
 * implements these properties.
 */
export interface ModelProvider {
  id: string;           // Internal ID (e.g., 'gpt-4')
  name: string;         // Display Name in UI (e.g., 'GPT-4 Turbo')
  description: string;  // Short description of the model's strength
  apiKeyEnv: string;    // The name of the Secret variable (e.g., 'OPENAI_API_KEY')
  model: string;        // The actual model ID (e.g., 'gemini-1.5-pro')
  provider: 'mock' | 'gemini' | 'openai'; // The underlying technology
  
  // The logic for how this specific model analyzes a prompt
  analyze: (data: PromptData) => Promise<AnalysisReport>;
}
