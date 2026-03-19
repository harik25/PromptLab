import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiRouter } from './api';
import { logBackend } from './logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexHtml = path.join(distDir, 'index.html');

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(createApiRouter());
app.use(express.static(distDir));

app.get('*', (_req, res) => {
  res.sendFile(indexHtml);
});

app.listen(port, () => {
  void logBackend({
    level: 'info',
    source: 'backend',
    message: 'Production server started',
    port,
    mode: process.env.NODE_ENV || 'development',
  });
  console.log(`PromptLab server listening on port ${port}`);
});
