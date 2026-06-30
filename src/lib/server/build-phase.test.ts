import { afterEach, describe, expect, it } from 'vitest';

import { isBuildPhase } from './build-phase';

const original = process.env.NEXT_PHASE;

afterEach(() => {
  if (original === undefined) delete process.env.NEXT_PHASE;
  else process.env.NEXT_PHASE = original;
});

describe('isBuildPhase', () => {
  it('is true during the production build phase', () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    expect(isBuildPhase()).toBe(true);
  });

  it('is false at runtime (server phase or unset)', () => {
    process.env.NEXT_PHASE = 'phase-production-server';
    expect(isBuildPhase()).toBe(false);
    delete process.env.NEXT_PHASE;
    expect(isBuildPhase()).toBe(false);
  });
});
