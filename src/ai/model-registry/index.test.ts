import { describe, expect, it } from 'vitest';
import { APPROVED_MODELS, getApprovedModel, getModelsByProvider, isModelCurrent } from './index';
import { resolveAnthropicConfig } from '../../lib/server/anthropic-client';

describe('admin optimiser model inventory', () => {
  it('records the in-use fallback without silently approving it', () => {
    const { model } = resolveAnthropicConfig({});
    const entries = APPROVED_MODELS.filter((entry) => entry.id === model);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      provider: 'anthropic',
      approvedDefault: false,
      status: 'review-needed',
    });
    expect(isModelCurrent(model)).toBe('review-needed');
  });

  it('keeps the existing approved reasoning route and excludes the optimiser fallback', () => {
    const fallback = resolveAnthropicConfig({}).model;
    expect(getApprovedModel('reasoning')?.id).toBe('claude-sonnet-5');
    expect(getModelsByProvider('anthropic').some((entry) => entry.id === fallback)).toBe(false);
  });
});
