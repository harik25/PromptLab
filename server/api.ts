import express from 'express';
import { runGeminiAnalysis, type AnalyzeRequestBody } from './analyze';
import { logBackend, logFrontend } from './logger';

let processHooksRegistered = false;

const createRequestId = () =>
  `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const initProcessLogging = () => {
  if (processHooksRegistered) return;
  processHooksRegistered = true;

  process.on('uncaughtException', (error) => {
    void logBackend({
      level: 'error',
      source: 'backend',
      message: 'Uncaught exception',
      error: { message: error.message, stack: error.stack },
    });
  });

  process.on('unhandledRejection', (reason) => {
    void logBackend({
      level: 'error',
      source: 'backend',
      message: 'Unhandled promise rejection',
      error:
        reason instanceof Error
          ? { message: reason.message, stack: reason.stack }
          : String(reason),
    });
  });

  void logBackend({
    level: 'info',
    source: 'backend',
    message: 'Logging initialized',
  });
};

export const createApiRouter = () => {
  initProcessLogging();

  const router = express.Router();
  router.use(express.json({ limit: '1mb' }));

  router.get('/api/health', async (_req, res) => {
    res.status(200).json({ ok: true });
  });

  router.post('/api/log', async (req, res) => {
    try {
      const body = req.body as {
        level?: 'info' | 'warn' | 'error';
        message?: string;
        screen?: string;
        action?: string;
        model?: string;
        details?: Record<string, unknown>;
      } | undefined;

      await logFrontend({
        level: body?.level || 'error',
        source: 'frontend',
        message: body?.message || 'Frontend log event',
        screen: body?.screen,
        action: body?.action,
        model: body?.model,
        details: body?.details,
      });

      res.status(204).end();
    } catch (error) {
      await logBackend({
        level: 'error',
        source: 'backend',
        message: 'Failed to persist frontend log',
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      });
      res.status(500).end();
    }
  });

  router.post('/api/analyze', async (req, res) => {
    const requestId = createRequestId();
    const startedAt = Date.now();

    try {
      const body = req.body as AnalyzeRequestBody | undefined;

      if (!body?.model || !body?.promptData) {
        await logBackend({
          level: 'warn',
          source: 'backend',
          message: 'Invalid analysis request payload',
          route: '/api/analyze',
          requestId,
          method: req.method,
          url: req.originalUrl,
        });
        res.status(400).json({ error: 'Invalid analysis request payload.' });
        return;
      }

      await logBackend({
        level: 'info',
        source: 'backend',
        message: 'Analysis request started',
        route: '/api/analyze',
        requestId,
        method: req.method,
        url: req.originalUrl,
        model: body.model,
        promptMeta: {
          projectName: body.promptData.projectName,
          useCase: body.promptData.useCase,
          toolsCount: body.promptData.tools.length,
          testCasesCount: body.promptData.testCases.length,
          temperature: body.promptData.temperature,
          maxTokens: body.promptData.maxTokens,
        },
      });

      const analysis = await runGeminiAnalysis({ ...body, requestId });
      await logBackend({
        level: 'info',
        source: 'backend',
        message: 'Analysis request completed',
        route: '/api/analyze',
        requestId,
        method: req.method,
        url: req.originalUrl,
        model: body.model,
        durationMs: Date.now() - startedAt,
        statusCode: 200,
      });
      res.status(200).json(analysis);
    } catch (error) {
      await logBackend({
        level: 'error',
        source: 'backend',
        message: 'Analyze route failed',
        route: '/api/analyze',
        requestId,
        method: req.method,
        url: req.originalUrl,
        durationMs: Date.now() - startedAt,
        statusCode: 500,
        error:
          error instanceof Error
            ? { message: error.message, stack: error.stack }
            : String(error),
      });
      res
        .status(500)
        .json({ error: 'Analysis failed. Check the dev terminal for details.' });
    }
  });

  return router;
};
