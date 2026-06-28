import { describe, expect, it } from 'vitest';

import { normalizePostgresSslMode } from './prisma';

describe('normalizePostgresSslMode', () => {
  it.each(['require', 'prefer', 'verify-ca'])('normalizes sslmode=%s to verify-full', (sslmode) => {
    const normalized = normalizePostgresSslMode(
      `postgresql://user:pass@example.com:25060/defaultdb?sslmode=${sslmode}`,
    );

    expect(normalized).toBe(
      'postgresql://user:pass@example.com:25060/defaultdb?sslmode=verify-full',
    );
  });

  it('preserves existing verify-full and other params', () => {
    const normalized = normalizePostgresSslMode(
      'postgresql://user:pass@example.com/defaultdb?sslmode=verify-full&schema=public',
    );

    expect(normalized).toBe(
      'postgresql://user:pass@example.com/defaultdb?sslmode=verify-full&schema=public',
    );
  });

  it('leaves invalid or non-postgres values untouched', () => {
    expect(normalizePostgresSslMode('not a url')).toBe('not a url');
    expect(normalizePostgresSslMode('mysql://user:pass@example.com/db?sslmode=require')).toBe(
      'mysql://user:pass@example.com/db?sslmode=require',
    );
  });
});
