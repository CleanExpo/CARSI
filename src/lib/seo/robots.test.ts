/**
 * GP-709. A crawler that finds a group naming it reads only that group, so each named AI
 * crawler group must carry the same private-path blocks as the default `*` group.
 */
import { describe, expect, it } from 'vitest';

import robots from '../../../app/robots';

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

const AI_CRAWLERS = [
  'OAI-SearchBot',
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
  'CCBot',
  'Google-Extended',
];

function rules(): Rule[] {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
}

function list(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

describe('robots.ts private paths', () => {
  const defaultGroup = rules().find((r) => r.userAgent === '*');
  const named = rules().filter((r) => r.userAgent !== '*');

  it('has a default group with private paths to share', () => {
    expect(defaultGroup).toBeDefined();
    expect(list(defaultGroup?.disallow).length).toBeGreaterThan(2);
  });

  it('names every AI crawler it is meant to name', () => {
    expect(named.map((r) => r.userAgent).sort()).toEqual([...AI_CRAWLERS].sort());
  });

  it.each(AI_CRAWLERS)('%s group disallows the same private paths as the default group', (agent) => {
    const group = named.find((r) => r.userAgent === agent);
    expect(group).toBeDefined();
    expect(list(group?.disallow)).toEqual(list(defaultGroup?.disallow));
    expect(list(group?.allow)).toEqual(['/']);
  });
});
