import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractRequestInfo, getRequestId, initLogger, logApiResponse } from './logger';

afterEach(() => { vi.restoreAllMocks(); initLogger({ LOG_LEVEL: 'INFO' } as Parameters<typeof initLogger>[0]); });
describe('structured request logging', () => {
  it('keeps the request ID stable and never logs query values', () => {
    const request = new Request('https://example.test/api/orders?token=secret-value');
    const info = extractRequestInfo(request);
    expect(info.requestId).toBe(getRequestId(request));
    expect(info.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(info)).not.toContain('secret-value');
    expect(info.query).toBe('[redacted]');
  });
  it('writes one JSON log event and honors minimum level', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    logApiResponse(new Request('https://example.test/api/store'), 200, 20);
    expect(log).toHaveBeenCalledOnce();
    const parsed = JSON.parse(log.mock.calls[0][0]);
    expect(parsed.status).toBe(200);
    expect(parsed.requestId).toBeTruthy();
    initLogger({ LOG_LEVEL: 'ERROR' } as Parameters<typeof initLogger>[0]);
    logApiResponse(new Request('https://example.test/api/store'), 200, 20);
    expect(log).toHaveBeenCalledOnce();
  });
});
