// AI Model types
export type ModelProvider = 'anthropic' | 'google' | 'openrouter';
export type ModelTier = 'opus' | 'sonnet' | 'haiku' | 'pro';

export interface ModelConfig {
  provider: ModelProvider;
  tier: ModelTier;
  maxTokens?: number;
  temperature?: number;
}

// Model identifiers — SSOT is src/ai/model-registry/index.ts (APPROVED_MODELS in the
// main app package). This is a separate published package (@shared/types) so it can't
// import that module directly across the package boundary — keep these values aligned
// with the registry by hand whenever it changes.
//
// `npm run check:model-currency` now enforces that alignment in CI: any id here
// the registry does not list fails the build. Before that guard existed this
// mirror silently kept the superseded Opus id after the registry moved on.
export const MODELS = {
  anthropic: {
    opus: 'claude-opus-5',
    sonnet: 'claude-sonnet-5',
    haiku: 'claude-haiku-4-5-20251001',
  },
  google: {
    pro: 'gemini-2.0-flash-exp',
  },
  openrouter: {
    opus: 'anthropic/claude-opus-5',
    sonnet: 'anthropic/claude-sonnet-5',
    pro: 'google/gemini-2.0-flash-exp',
  },
} as const;

// Skill types
export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  priority: number;
  triggers: string[];
  requires: string[];
}

export interface Skill extends SkillMetadata {
  content: string;
  path: string;
}
