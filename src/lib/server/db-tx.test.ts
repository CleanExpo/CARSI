import { describe, expect, it, vi } from 'vitest';

import { withSerializationRetry } from './db-tx';

const serializationError = () => ({ code: 'P2034', message: 'write conflict' });

describe('withSerializationRetry', () => {
  it('returns the result without retrying when the operation succeeds', async () => {
    const run = vi.fn(async () => 'ok');
    expect(await withSerializationRetry(run)).toBe('ok');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('retries on a serialization conflict and returns once it succeeds', async () => {
    let calls = 0;
    const run = vi.fn(async () => {
      calls += 1;
      if (calls < 2) throw serializationError();
      return 'ok';
    });
    expect(await withSerializationRetry(run)).toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('gives up after maxAttempts and throws the last serialization error', async () => {
    const run = vi.fn(async () => {
      throw serializationError();
    });
    await expect(withSerializationRetry(run, 3)).rejects.toMatchObject({ code: 'P2034' });
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('does NOT retry on a non-serialization error', async () => {
    const run = vi.fn(async () => {
      throw new Error('null value violates not-null constraint');
    });
    await expect(withSerializationRetry(run)).rejects.toThrow('not-null');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
