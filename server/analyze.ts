import { GoogleGenAI, Type } from '@google/genai';
import type { AnalysisReport, PromptData } from '../src/types';
import { logBackend } from './logger';

export interface AnalyzeRequestBody {
  model: string;
  apiKeyEnv: string;
  promptData: PromptData;
  requestId?: string;
}

const ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    diagnosis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
    rootCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
    optimizedSystemPrompt: { type: Type.STRING },
    optimizedUserPrompt: { type: Type.STRING },
    changes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          issue: { type: Type.STRING },
          fix: { type: Type.STRING },
          why: { type: Type.STRING },
        },
      },
    },
    breakdown: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          value: { type: Type.NUMBER },
        },
      },
    },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    'score',
    'tags',
    'diagnosis',
    'rootCauses',
    'optimizedSystemPrompt',
    'optimizedUserPrompt',
    'changes',
    'breakdown',
    'suggestions',
  ],
} as const;

const createAnalysisPrompt = (data: PromptData) => `
Analyze this prompt architecture and provide an optimization report.

### CONTEXT
Project: ${data.projectName}
Use Case: ${data.useCase}
Issue: ${data.issue}

### CURRENT PROMPT
System: ${data.systemPrompt}
User: ${data.userPrompt}

### CONFIG
Tools: ${data.usesTools ? JSON.stringify(data.tools) : 'None'}
Temp: ${data.temperature}

### TEST CASES
${JSON.stringify(data.testCases)}

Return JSON:
{
  "score": number (0-10),
  "tags": string[],
  "diagnosis": [{ "title": string, "description": string }],
  "rootCauses": string[],
  "optimizedSystemPrompt": string,
  "optimizedUserPrompt": string,
  "changes": [{ "issue": string, "fix": string, "why": string }],
  "breakdown": [{ "label": string, "value": number (0-100) }],
  "suggestions": string[]
}
`;

const resolveApiKey = (apiKeyEnv: string) => {
  return process.env.GEMINI_API_KEY || process.env[apiKeyEnv] || apiKeyEnv;
};

const mapGeminiError = (err: unknown) => {
  const message = err instanceof Error ? err.message : 'Unknown error';

  if (message.includes('API_KEY_INVALID') || message.includes('401')) {
    return 'Invalid Gemini API Key. Please check the configured key.';
  }

  if (message.includes('429') || message.toLowerCase().includes('quota')) {
    return 'Gemini API rate limit exceeded. Please wait a minute and try again.';
  }

  if (message.includes('max tokens') || message.includes('token limit')) {
    return 'The analysis report was too large for the model to generate.';
  }

  if (message.includes('SAFETY') || message.includes('blocked')) {
    return "The analysis was blocked by Gemini's safety filters.";
  }

  if (message.includes('timed out')) {
    return message;
  }

  return `Gemini Analysis Failed: ${message}`;
};

export const runGeminiAnalysis = async (
  body: AnalyzeRequestBody,
): Promise<AnalysisReport> => {
  const apiKey = resolveApiKey(body.apiKeyEnv);

  if (!apiKey || apiKey === 'GEMINI_API_KEY') {
    await logBackend({
      level: 'error',
      source: 'backend',
      message: 'Gemini API key missing before analysis start',
      route: '/api/analyze',
      requestId: body.requestId,
      model: body.model,
      apiKeyConfigured: false,
    });
    throw new Error(
      'Gemini API Key not found. Set GEMINI_API_KEY in your local environment.',
    );
  }

  const ai = new GoogleGenAI({ apiKey });
  const prompt = createAnalysisPrompt(body.promptData);

  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Analysis timed out. The Gemini API is taking too long to respond.',
          ),
        );
      }, 45000);
    });

    const response = (await Promise.race([
      ai.models.generateContent({
        model: body.model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 8192,
          responseSchema: ANALYSIS_SCHEMA,
        },
      }),
      timeoutPromise,
    ])) as { text?: string };

    if (!response.text) {
      throw new Error(
        'Empty response from Gemini. The model did not return analysis JSON.',
      );
    }

    return {
      ...JSON.parse(response.text),
      provider: 'gemini',
    } as AnalysisReport;
  } catch (err) {
    const mappedMessage = mapGeminiError(err);
    await logBackend({
      level: 'error',
      source: 'backend',
      message: 'Gemini analysis failed',
      route: '/api/analyze',
      requestId: body.requestId,
      model: body.model,
      apiKeyConfigured: true,
      error:
        err instanceof Error
          ? { message: err.message, stack: err.stack }
          : String(err),
      mappedMessage,
      promptMeta: {
        projectName: body.promptData.projectName,
        useCase: body.promptData.useCase,
        toolsCount: body.promptData.tools.length,
        testCasesCount: body.promptData.testCases.length,
        temperature: body.promptData.temperature,
        maxTokens: body.promptData.maxTokens,
        usesRAG: body.promptData.usesRAG,
        usesMemory: body.promptData.usesMemory,
      },
    });
    throw new Error(mappedMessage);
  }
};
