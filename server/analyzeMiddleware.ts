import type { Plugin } from 'vite';
import { createApiRouter } from './api';

export const analyzeMiddleware = (): Plugin => ({
  name: 'promptlab-analyze-middleware',
  configureServer(server) {
    server.middlewares.use(createApiRouter());
  },
});
