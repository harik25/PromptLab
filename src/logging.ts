import type { PromptData } from './types';

type FrontendLogPayload = {
  level: 'info' | 'warn' | 'error';
  message: string;
  screen?: string;
  action?: string;
  model?: string;
  details?: Record<string, unknown>;
};

let initialized = false;

const postLog = (payload: FrontendLogPayload) => {
  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/log', blob);
    return;
  }

  fetch('/api/log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Avoid recursive logging if the logger endpoint itself fails.
  });
};

export const logFrontendEvent = (payload: FrontendLogPayload) => {
  postLog(payload);
};

export const initFrontendLogging = () => {
  if (initialized) return;
  initialized = true;

  window.addEventListener('error', (event) => {
    postLog({
      level: 'error',
      message: event.message || 'Unhandled window error',
      screen: 'global',
      details: {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error instanceof Error ? event.error.stack : undefined,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    postLog({
      level: 'error',
      message:
        reason instanceof Error
          ? reason.message
          : 'Unhandled promise rejection in frontend',
      screen: 'global',
      details: {
        reason:
          reason instanceof Error
            ? { message: reason.message, stack: reason.stack }
            : String(reason),
      },
    });
  });
};

export const summarizePromptDataForLogs = (formData: PromptData) => ({
  projectName: formData.projectName,
  model: formData.model,
  useCase: formData.useCase,
  usesTools: formData.usesTools,
  toolsCount: formData.tools.length,
  testCasesCount: formData.testCases.length,
  temperature: formData.temperature,
  maxTokens: formData.maxTokens,
  usesRAG: formData.usesRAG,
  usesMemory: formData.usesMemory,
});
