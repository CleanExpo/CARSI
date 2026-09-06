/**
 * AI Model Registry
 * Central registry for all AI model configurations across the CARSI platform.
 * Load this before performing any AI task to ensure model currency.
 *
 * @see memory.md > Visual Excellence and Model Currency Protocol
 */

export type TaskType =
  | 'reasoning'
  | 'orchestration'
  | 'fast-generation'
  | 'image-generation'
  | 'image-editing'
  | 'high-fidelity-visual'
  | 'embedding'
  | 'local-inference';

export type ModelProvider = 'anthropic' | 'google' | 'ollama' | 'nano-banana';

export type ModelStatus = 'current' | 'review-needed' | 'deprecated' | 'unknown';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  taskTypes: TaskType[];
  approvedDefault: boolean;
  status: ModelStatus;
  notes?: string;
  deprecationDate?: string; // ISO date
  replacedBy?: string;
}

/**
 * The date this registry was last checked against the vendors' current model
 * line-ups. `scripts/check-model-currency.mjs` fails CI once this is more than
 * 90 days old, which is what stops the list going quietly stale — no offline
 * check can know that a new model shipped, so this forces a human to look.
 *
 * Bump it ONLY after actually re-reading the vendor model list, never to clear
 * a red build.
 */
export const REGISTRY_REVIEWED = '2026-09-06';

/**
 * Approved model defaults as of 06/09/2026.
 * Update this registry when models are upgraded or deprecated.
 */
export const APPROVED_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    taskTypes: ['reasoning', 'orchestration'],
    approvedDefault: true,
    status: 'current',
    notes: 'Primary reasoning and orchestration model',
  },
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    taskTypes: ['reasoning'],
    approvedDefault: true,
    status: 'current',
    notes:
      'High-capability complex tasks only — higher cost. Supersedes the previous ' +
      'Opus 4.8 default at the same per-token price. Thinking is on by default ' +
      '(adaptive), so omitting the `thinking` parameter now reasons rather than ' +
      'answering flat. Do not send `budget_tokens` — it is rejected on this model; ' +
      'tune spend with output_config.effort instead.',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    taskTypes: ['fast-generation'],
    approvedDefault: true,
    status: 'current',
    notes: 'Fast generation, drafts, simple tasks',
  },
  {
    id: 'gemini-2.5-flash-image',
    provider: 'google',
    taskTypes: ['image-generation', 'image-editing'],
    approvedDefault: true,
    status: 'current',
    notes: 'Fast image generation and editing',
  },
  {
    id: 'imagen-4',
    provider: 'google',
    taskTypes: ['high-fidelity-visual'],
    approvedDefault: true,
    status: 'current',
    notes: 'High-fidelity branding visuals — premium cost',
  },
  {
    id: 'gemini-2.0-flash-exp',
    provider: 'google',
    taskTypes: ['fast-generation'],
    approvedDefault: false,
    status: 'review-needed',
    notes:
      'IN USE but never approved — packages/shared/src/types/models.ts wires it as ' +
      'the Google default. Recorded here rather than silently blessed: it is an ' +
      '"-exp" preview id, which vendors withdraw without notice. Someone must pick a ' +
      'supported Google model or drop the path. Surfaced 06/09/2026 by ' +
      'scripts/check-model-currency.mjs on its first real run.',
  },
  {
    id: 'llama3.1:8b',
    provider: 'ollama',
    taskTypes: ['local-inference', 'fast-generation'],
    approvedDefault: true,
    status: 'current',
    notes: 'Local inference via Ollama — no API key required',
  },
];

/**
 * Get the approved model for a given task type.
 */
export function getApprovedModel(taskType: TaskType): ModelConfig | undefined {
  return APPROVED_MODELS.find(
    (m) => m.taskTypes.includes(taskType) && m.approvedDefault && m.status === 'current'
  );
}

/**
 * Check if a model ID is approved and current.
 */
export function isModelCurrent(modelId: string): ModelStatus {
  const model = APPROVED_MODELS.find((m) => m.id === modelId);
  if (!model) return 'unknown';
  return model.status;
}

/**
 * Get all approved models for a given provider.
 */
export function getModelsByProvider(provider: ModelProvider): ModelConfig[] {
  return APPROVED_MODELS.filter((m) => m.provider === provider && m.approvedDefault);
}
