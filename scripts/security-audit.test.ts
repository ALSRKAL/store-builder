import { describe, expect, it } from 'vitest';
import { assessAudit } from './security-audit.mjs';

const report = severity => ({ auditReportVersion: 2, metadata: { vulnerabilities: {} }, vulnerabilities: {
  package: { severity, via: [{ url: 'https://github.com/advisories/test' }] },
} });

describe('dependency release policy', () => {
  it('blocks high and critical findings without inventing exceptions', () => {
    expect(assessAudit(report('high'))).toEqual([{ package: 'package', severity: 'high' }]);
    expect(assessAudit(report('critical'))).toHaveLength(1);
    expect(assessAudit(report('moderate'))).toHaveLength(0);
  });
  it('rejects unavailable and malformed audit reports', () => {
    expect(() => assessAudit({ error: { message: 'network failed' } })).toThrow(/unavailable/);
    expect(() => assessAudit({})).toThrow(/malformed/);
  });
  it('requires a reviewed advisory-specific exception with unexpired date', () => {
    const exception = { package: 'package', advisory: 'https://github.com/advisories/test', reason: 'reviewed fixture', expires: '2999-01-01' };
    expect(assessAudit(report('high'), [exception])).toHaveLength(0);
    expect(assessAudit(report('high'), [{ ...exception, advisory: 'https://github.com/advisories/other' }])).toHaveLength(1);
    expect(() => assessAudit(report('high'), [{ ...exception, expires: '2020-01-01' }])).toThrow(/future expiry/);
  });
});
