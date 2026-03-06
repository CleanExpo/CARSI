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
 * Approved model defaults as of 06/03/2026.
 * Update this registry when models are upgraded or deprecated.
 */
export const APPROVED_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    taskTypes: ['reasoning', 'orchestration'],
    approvedDefault: true,
    status: 'current',
    notes: 'Primary reasoning and orchestration model',
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    taskTypes: ['reasoning'],
    approvedDefault: true,
    status: 'current',
    notes: 'High-capability complex tasks only — higher cost',
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
