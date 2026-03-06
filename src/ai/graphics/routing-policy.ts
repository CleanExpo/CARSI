/**
 * Graphics Routing Policy
 * Defines which AI model to use for each type of visual generation task.
 *
 * @see memory.md > Visual Excellence and Model Currency Protocol
 * @see src/ai/model-registry/providers/gemini.ts
 */

export type VisualTaskType =
  | 'course-thumbnail' // Course card images
  | 'hero-background' // Landing page hero visuals
  | 'logo-render' // 3D or stylised logo renders
  | 'badge-image' // Achievement/streak badges
  | 'certificate-background' // PDF certificate backgrounds
  | 'og-image' // OpenGraph social preview images
  | 'ui-illustration' // In-page illustrations
  | 'icon-set'; // Custom icon generation

export interface VisualRoutingConfig {
  taskType: VisualTaskType;
  model: string;
  provider: string;
  quality: 'fast' | 'balanced' | 'premium';
  rationale: string;
  maxDimensions: { width: number; height: number };
  outputFormat: 'webp' | 'png' | 'jpeg';
}

/**
 * Routing policy for all visual generation tasks.
 * Choose model based on required quality and turnaround time.
 */
export const VISUAL_ROUTING_POLICY: VisualRoutingConfig[] = [
  {
    taskType: 'course-thumbnail',
    model: 'gemini-2.5-flash-image',
    provider: 'google',
    quality: 'fast',
    rationale: 'High volume, consistent quality needed — Flash model appropriate',
    maxDimensions: { width: 800, height: 450 },
    outputFormat: 'webp',
  },
  {
    taskType: 'hero-background',
    model: 'imagen-4',
    provider: 'google',
    quality: 'premium',
    rationale: 'Customer-facing hero — must pass visual excellence standard',
    maxDimensions: { width: 1920, height: 1080 },
    outputFormat: 'webp',
  },
  {
    taskType: 'logo-render',
    model: 'imagen-4',
    provider: 'google',
    quality: 'premium',
    rationale: 'Brand asset — highest fidelity required',
    maxDimensions: { width: 512, height: 512 },
    outputFormat: 'png',
  },
  {
    taskType: 'badge-image',
    model: 'gemini-2.5-flash-image',
    provider: 'google',
    quality: 'balanced',
    rationale: 'Achievement badges — consistent style, moderate quality',
    maxDimensions: { width: 256, height: 256 },
    outputFormat: 'webp',
  },
  {
    taskType: 'certificate-background',
    model: 'imagen-4',
    provider: 'google',
    quality: 'premium',
    rationale: 'Credential document — high fidelity, professional appearance required',
    maxDimensions: { width: 1200, height: 850 },
    outputFormat: 'png',
  },
  {
    taskType: 'og-image',
    model: 'gemini-2.5-flash-image',
    provider: 'google',
    quality: 'balanced',
    rationale: 'Social preview — fast generation, fixed dimensions',
    maxDimensions: { width: 1200, height: 630 },
    outputFormat: 'webp',
  },
  {
    taskType: 'ui-illustration',
    model: 'gemini-2.5-flash-image',
    provider: 'google',
    quality: 'balanced',
    rationale: 'In-page illustrations — moderate quality, consistent style',
    maxDimensions: { width: 600, height: 400 },
    outputFormat: 'webp',
  },
  {
    taskType: 'icon-set',
    model: 'gemini-2.5-flash-image',
    provider: 'google',
    quality: 'fast',
    rationale: 'Icon generation — fast iteration, SVG preferred where possible',
    maxDimensions: { width: 64, height: 64 },
    outputFormat: 'png',
  },
];

/**
 * Get routing config for a visual task type.
 */
export function getVisualRoute(taskType: VisualTaskType): VisualRoutingConfig {
  const config = VISUAL_ROUTING_POLICY.find((p) => p.taskType === taskType);
  if (!config) {
    throw new Error(
      `No routing policy for visual task type: ${taskType}. ` +
        `Valid types: ${VISUAL_ROUTING_POLICY.map((p) => p.taskType).join(', ')}`
    );
  }
  return config;
}

/**
 * Get all premium-quality routes (for pre-launch visual audit).
 */
export function getPremiumRoutes(): VisualRoutingConfig[] {
  return VISUAL_ROUTING_POLICY.filter((p) => p.quality === 'premium');
}

/**
 * Get all routes using a specific model.
 */
export function getRoutesByModel(modelId: string): VisualRoutingConfig[] {
  return VISUAL_ROUTING_POLICY.filter((p) => p.model === modelId);
}
