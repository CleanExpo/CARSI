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
export const MODELS = {
  anthropic: {
    opus: 'claude-opus-4-8',
    sonnet: 'claude-sonnet-5',
    haiku: 'claude-haiku-4-5-20251001',
  },
  google: {
    pro: 'gemini-2.0-flash-exp',
  },
  openrouter: {
    opus: 'anthropic/claude-opus-4-8',
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
