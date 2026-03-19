import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

type LogSource = 'backend' | 'frontend';
type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  ts?: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  [key: string]: unknown;
}

const logsDir = path.resolve(process.cwd(), 'logs');
const initPromise = mkdir(logsDir, { recursive: true });

const toLine = (entry: LogEntry) =>
  `${JSON.stringify({ ts: new Date().toISOString(), ...entry })}\n`;

const writeLog = async (fileName: string, entry: LogEntry) => {
  await initPromise;
  await appendFile(path.join(logsDir, fileName), toLine(entry), 'utf8');
};

const logToConsole = (entry: LogEntry) => {
  const prefix = `[${entry.source}] ${entry.message}`;
  if (entry.level === 'error') {
    console.error(prefix, entry);
    return;
  }
  if (entry.level === 'warn') {
    console.warn(prefix, entry);
    return;
  }
  console.log(prefix, entry);
};

export const logBackend = async (entry: LogEntry) => {
  logToConsole(entry);
  await writeLog('backend.jsonl', entry);
};

export const logFrontend = async (entry: LogEntry) => {
  logToConsole(entry);
  await writeLog('frontend.jsonl', entry);
};
