import { describe, expect, it } from 'vitest';

import { ASSISTANT_DISCLAIMER } from '@/lib/assistant-disclaimer';

import { buildAssistantSystemPrompt } from './assistant-prompt';

const base = {
  name: 'Claire',
  tagline: 'your CARSI professional learning guide',
  courseContext: '- slug:water-damage-basics | Water Damage Basics | AUD 199.00 | Restoration | IICRC:WRT | modules:6',
};

describe('buildAssistantSystemPrompt', () => {
  it('embeds the finalized disclaimer verbatim', () => {
    expect(buildAssistantSystemPrompt(base)).toContain(ASSISTANT_DISCLAIMER);
  });

  it('states the assistant is not the authoritative standard', () => {
    expect(buildAssistantSystemPrompt(base)).toMatch(/NOT the authoritative standard/);
  });

  it('requires citing the standard on a standards claim', () => {
    const prompt = buildAssistantSystemPrompt(base);
    expect(prompt).toMatch(/cite the standard/i);
    expect(prompt).toContain('per IICRC S500');
  });

  it('forbids verbatim manual prose', () => {
    expect(buildAssistantSystemPrompt(base)).toMatch(/NEVER quote copyrighted IICRC or RIA manual prose verbatim/);
  });

  it('deflects to the official standard when an answer is not held', () => {
    expect(buildAssistantSystemPrompt(base)).toMatch(
      /do not hold a verified answer[\s\S]*official IICRC\/RIA standard/i
    );
  });

  it('includes the catalogue ground-truth block', () => {
    expect(buildAssistantSystemPrompt(base)).toContain('water-damage-basics');
  });

  it('places page focus above the catalogue when provided', () => {
    const prompt = buildAssistantSystemPrompt({ ...base, focusSection: 'FOCUS_MARKER' });
    expect(prompt.indexOf('FOCUS_MARKER')).toBeGreaterThan(-1);
    expect(prompt.indexOf('FOCUS_MARKER')).toBeLessThan(prompt.indexOf('BEGIN CATALOGUE'));
  });

  it('embeds tenant scope lock when provided', () => {
    const prompt = buildAssistantSystemPrompt({
      ...base,
      scopeLock: 'CARSI-only scope marker',
    });
    expect(prompt).toContain('PROJECT SCOPE (mandatory):');
    expect(prompt).toContain('CARSI-only scope marker');
  });

  it('omits the knowledge base block when not provided', () => {
    expect(buildAssistantSystemPrompt(base)).not.toContain('BEGIN KNOWLEDGE BASE');
  });

  it('embeds the knowledge base block, after the catalogue, when provided', () => {
    const prompt = buildAssistantSystemPrompt({
      ...base,
      knowledgeBaseContext: 'IICRC_KB_MARKER',
    });
    expect(prompt).toContain('BEGIN KNOWLEDGE BASE');
    expect(prompt).toContain('IICRC_KB_MARKER');
    expect(prompt.indexOf('END CATALOGUE')).toBeLessThan(prompt.indexOf('BEGIN KNOWLEDGE BASE'));
  });
});
