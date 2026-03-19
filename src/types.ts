export interface Tool {
  id: string;
  name: string;
  description: string;
  trigger: string;
}

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  status: 'pending' | 'passed' | 'failed';
}

export interface PromptData {
  projectName: string;
  model: string;
  useCase: string;
  systemPrompt: string;
  userPrompt: string;
  initialPrompt: string;
  usesTools: boolean;
  tools: Tool[];
  testCases: TestCase[];
  issue: string;
  expectedOutput: string;
  actualOutput: string;
  temperature: number;
  maxTokens: number;
  usesRAG: boolean;
  usesMemory: boolean;
}

export interface PromptVersion {
  id: string;
  timestamp: number;
  name: string;
  data: PromptData;
  summary?: string;
  fixes?: string[];
  regressions?: string;
}

export interface AnalysisReport {
  score: number;
  tags: string[];
  provider?: string;
  diagnosis: { title: string; description: string }[];
  rootCauses: string[];
  optimizedSystemPrompt: string;
  optimizedUserPrompt: string;
  changes: { issue: string; fix: string; why: string }[];
  breakdown: { label: string; value: number }[];
  suggestions: string[];
}
