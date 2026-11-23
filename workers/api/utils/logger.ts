/**
 * Logger Utility
 * نظام تسجيل الأخطاء والأحداث المركزي
 */

import type { Env } from '../types';

// ===== Types =====

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  [key: string]: unknown;
}

interface RequestInfo {
  requestId?: string;
  method?: string;
  path?: string;
  query?: string;
  userAgent?: string;
  ip?: string;
  country?: string;
  rayId?: string;
}

interface ErrorInfo {
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
}

interface LogContext extends RequestInfo, ErrorInfo {
  userId?: string | null;
  status?: number;
  duration?: number;
  [key: string]: unknown;
}

interface AuthenticatedRequest extends Request {
  user?: { uid: string };
}

// ===== Constants =====

export const LOG_LEVELS: Record<string, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

let minLogLevel = LOG_LEVELS.INFO;
const requestIds = new WeakMap<Request, string>();

export function getRequestId(request: Request): string {
  let id = requestIds.get(request);
  if (!id) { id = crypto.randomUUID(); requestIds.set(request, id); }
  return id;
}

// ===== Initialization =====

export function initLogger(env?: Env): void {
  const level = env?.LOG_LEVEL?.toUpperCase();
  if (level && LOG_LEVELS[level] !== undefined) {
    minLogLevel = LOG_LEVELS[level];
  }
}


// ===== Helper Functions =====

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(level: string, message: string, context: LogContext = {}): LogEntry {
  return {
    timestamp: getTimestamp(),
    level,
    message,
    ...context,
  };
}

export function extractRequestInfo(request?: Request): RequestInfo {
  if (!request) return {};
  
  const url = new URL(request.url);
  
  return {
    requestId: getRequestId(request),
    method: request.method,
    path: url.pathname,
    query: url.search ? '[redacted]' : undefined,
    userAgent: request.headers.get('User-Agent') || undefined,
    ip: request.headers.get('CF-Connecting-IP') || 
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        undefined,
    country: request.headers.get('CF-IPCountry') || undefined,
    rayId: request.headers.get('CF-Ray') || undefined,
  };
}

export function extractErrorInfo(error?: Error | unknown): ErrorInfo {
  if (!error) return {};
  
  const err = error as Error;
  return {
    errorName: err.name || 'Error',
    errorMessage: err.message || String(error),
    errorStack: err.stack?.split('\n').slice(0, 5).join('\n') || undefined,
    errorCode: (err as Error & { code?: string }).code || undefined,
  };
}

function logToConsole(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case 'DEBUG': console.debug(line); break;
    case 'INFO': console.info(line); break;
    case 'WARN': console.warn(line); break;
    case 'ERROR':
    case 'FATAL': console.error(line); break;
    default: console.log(line);
  }
}

async function logToDatabase(env: Env, entry: LogEntry): Promise<string | undefined> {
  if (!env?.DB) return undefined;
  
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        path TEXT,
        method TEXT,
        user_id TEXT,
        ip TEXT,
        error_name TEXT,
        error_message TEXT,
        error_stack TEXT,
        context TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
    
    const id = crypto.randomUUID();
    const ctx = entry as LogContext;
    
    await env.DB.prepare(`
      INSERT INTO error_logs (id, timestamp, level, message, path, method, user_id, ip, error_name, error_message, error_stack, context)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      entry.timestamp,
      entry.level,
      entry.message,
      ctx.path || null,
      ctx.method || null,
      ctx.userId || null,
      ctx.ip || null,
      ctx.errorName || null,
      ctx.errorMessage || null,
      ctx.errorStack || null,
      JSON.stringify(entry)
    ).run();
    
    return id;
  } catch (e) {
    console.error('Failed to log to database:', e);
    return undefined;
  }
}


// ===== Cleanup =====

export async function cleanupOldLogs(env: Env): Promise<{ deleted: number } | { error: string }> {
  if (!env?.DB) return { deleted: 0 };
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await env.DB.prepare(`
      DELETE FROM error_logs WHERE timestamp < ?
    `).bind(sevenDaysAgo).run();
    
    return { deleted: result.meta?.changes || 0 };
  } catch (e) {
    console.error('Failed to cleanup logs:', e);
    return { error: (e as Error).message };
  }
}

// ===== Main Logger Functions =====

export function debug(message: string, context: LogContext = {}): LogEntry | undefined {
  if (minLogLevel > LOG_LEVELS.DEBUG) return;
  
  const entry = formatLogEntry('DEBUG', message, context);
  logToConsole(entry);
  return entry;
}

export function info(message: string, context: LogContext = {}): LogEntry | undefined {
  if (minLogLevel > LOG_LEVELS.INFO) return;
  
  const entry = formatLogEntry('INFO', message, context);
  logToConsole(entry);
  return entry;
}

export function warn(message: string, context: LogContext = {}): LogEntry | undefined {
  if (minLogLevel > LOG_LEVELS.WARN) return;
  
  const entry = formatLogEntry('WARN', message, context);
  logToConsole(entry);
  return entry;
}

export async function error(
  message: string,
  context: LogContext = {},
  env: Env | null = null
): Promise<LogEntry> {
  const entry = formatLogEntry('ERROR', message, context);
  logToConsole(entry);
  
  if (env) {
    await logToDatabase(env, entry);
  }
  
  return entry;
}

export async function fatal(
  message: string,
  context: LogContext = {},
  env: Env | null = null
): Promise<LogEntry> {
  const entry = formatLogEntry('FATAL', message, context);
  logToConsole(entry);
  
  if (env) {
    await logToDatabase(env, entry);
  }
  
  return entry;
}

// ===== API Logging =====

export async function logApiError(
  request: Request,
  err: Error | unknown,
  env: Env | null = null,
  userId: string | null = null
): Promise<LogEntry> {
  const requestInfo = extractRequestInfo(request);
  const errorInfo = extractErrorInfo(err);
  
  const context: LogContext = {
    ...requestInfo,
    ...errorInfo,
    userId,
  };
  
  return await error(
    `API Error: ${errorInfo.errorMessage || 'Unknown error'}`,
    context,
    env
  );
}

export function logApiRequest(request: Request, userId: string | null = null): LogEntry | undefined {
  const requestInfo = extractRequestInfo(request);
  
  return info(`${requestInfo.method} ${requestInfo.path}`, {
    ...requestInfo,
    userId,
  });
}

export function logApiResponse(
  request: Request,
  status: number,
  duration: number,
  userId: string | null = null
): LogEntry | undefined {
  const requestInfo = extractRequestInfo(request);
  
  const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO';
  if (minLogLevel > LOG_LEVELS[level]) return;
  const message = `${requestInfo.method} ${requestInfo.path} - ${status} (${duration}ms)`;
  
  const entry = formatLogEntry(level, message, {
    ...requestInfo,
    status,
    duration,
    userId,
  });
  
  logToConsole(entry);
  return entry;
}


// ===== Logger Factory =====

interface Logger {
  debug: (msg: string, ctx?: LogContext) => LogEntry | undefined;
  info: (msg: string, ctx?: LogContext) => LogEntry | undefined;
  warn: (msg: string, ctx?: LogContext) => LogEntry | undefined;
  error: (msg: string, ctx?: LogContext, env?: Env | null) => Promise<LogEntry>;
  fatal: (msg: string, ctx?: LogContext, env?: Env | null) => Promise<LogEntry>;
}

export function createLogger(baseContext: LogContext = {}): Logger {
  return {
    debug: (msg, ctx = {}) => debug(msg, { ...baseContext, ...ctx }),
    info: (msg, ctx = {}) => info(msg, { ...baseContext, ...ctx }),
    warn: (msg, ctx = {}) => warn(msg, { ...baseContext, ...ctx }),
    error: (msg, ctx = {}, env = null) => error(msg, { ...baseContext, ...ctx }, env),
    fatal: (msg, ctx = {}, env = null) => fatal(msg, { ...baseContext, ...ctx }, env),
  };
}

// ===== Middleware =====

type RequestHandler = (request: AuthenticatedRequest, env: Env) => Promise<Response>;

export function createLoggingMiddleware(env: Env) {
  return async (request: AuthenticatedRequest, handler: RequestHandler): Promise<Response> => {
    const startTime = Date.now();
    let response: Response;
    let userId: string | null = null;
    
    try {
      userId = request.user?.uid || null;
      
      debug(`Incoming request: ${request.method} ${new URL(request.url).pathname}`, {
        userId,
      });
      
      response = await handler(request, env);
      
      const duration = Date.now() - startTime;
      logApiResponse(request, response.status, duration, userId);
      
      return response;
    } catch (err) {
      await logApiError(request, err, env, userId);
      throw err;
    }
  };
}

// ===== Default Export =====

export default {
  debug,
  info,
  warn,
  error,
  fatal,
  logApiError,
  createLogger,
};
