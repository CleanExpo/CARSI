/**
 * Gemini Provider Configuration
 * Centralises all Gemini model selection and routing logic.
 * Compares configured models against approved defaults.
 *
 * @see src/ai/model-registry/index.ts for the full registry
 */

import { type ModelConfig, APPROVED_MODELS } from '../index';

export type GeminiModelId =
  | 'gemini-2.5-flash-image'
  | 'gemini-2.5-pro'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'imagen-4'
  | 'imagen-3';

export interface GeminiModelAudit {
  configured: string;
  approved: string;
  status: 'current' | 'mismatch' | 'deprecated' | 'unknown';
  action: string;
}

/**
 * Approved Gemini models by task type.
 */
const GEMINI_ROUTING: Record<string, GeminiModelId> = {
  'image-generation': 'gemini-2.5-flash-image',
  'image-editing': 'gemini-2.5-flash-image',
  'high-fidelity-visual': 'imagen-4',
};

/**
 * Deprecated Gemini model IDs that must be flagged immediately.
 */
const DEPRECATED_GEMINI: string[] = ['gemini-1.0-pro', 'gemini-1.5-pro-001', 'gemini-pro'];

/**
 * Get the approved Gemini model for a task type.
 */
export function getGeminiModel(taskType: keyof typeof GEMINI_ROUTING): GeminiModelId {
  const model = GEMINI_ROUTING[taskType];
  if (!model) {
    throw new Error(
      `No approved Gemini model for task type: ${taskType}. ` +
        `Approved types: ${Object.keys(GEMINI_ROUTING).join(', ')}`
    );
  }
  return model;
}

/**
 * Check if a Gemini model ID is approved.
 */
export function isGeminiModelApproved(modelId: string): boolean {
  if (DEPRECATED_GEMINI.includes(modelId)) return false;
  return Object.values(GEMINI_ROUTING).includes(modelId as GeminiModelId);
}

/**
 * Audit a configured Gemini model against the approved defaults.
 */
export function auditGeminiModel(taskType: string, configuredModel: string): GeminiModelAudit {
  const approvedModel = GEMINI_ROUTING[taskType];

  if (DEPRECATED_GEMINI.includes(configuredModel)) {
    return {
      configured: configuredModel,
      approved: approvedModel ?? 'N/A for this task type',
      status: 'deprecated',
      action: `IMMEDIATE: Replace ${configuredModel} with ${approvedModel ?? 'appropriate model'}`,
    };
  }

  if (!approvedModel) {
    return {
      configured: configuredModel,
      approved: 'No Gemini model approved for this task type',
      status: 'unknown',
      action: 'Review task routing — Gemini may not be appropriate here',
    };
  }

  if (configuredModel === approvedModel) {
    return {
      configured: configuredModel,
      approved: approvedModel,
      status: 'current',
      action: 'None required',
    };
  }

  return {
    configured: configuredModel,
    approved: approvedModel,
    status: 'mismatch',
    action: `Update configuration to use ${approvedModel} for ${taskType} tasks`,
  };
}

/**
 * Get all Gemini model configurations from the approved registry.
 */
export function getAllGeminiConfigs(): ModelConfig[] {
  return APPROVED_MODELS.filter((m) => m.provider === 'google');
}
