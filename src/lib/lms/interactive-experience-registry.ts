import {
  FIRE_SMOKE_INTERACTIVE_PILOT,
  WATER_DAMAGE_INTERACTIVE_PILOT,
} from '@/lib/lms/interactive-experience-data';
import type { InteractiveExperience } from '@/lib/lms/interactive-experience-types';

const REGISTRY: Record<string, InteractiveExperience> = {
  [WATER_DAMAGE_INTERACTIVE_PILOT.id]: WATER_DAMAGE_INTERACTIVE_PILOT,
  [FIRE_SMOKE_INTERACTIVE_PILOT.id]: FIRE_SMOKE_INTERACTIVE_PILOT,
};

export function getInteractiveExperienceById(id: string): InteractiveExperience | null {
  const key = id.trim();
  if (!key) return null;
  return REGISTRY[key] ?? null;
}

export function listInteractiveExperienceIds(): string[] {
  return Object.keys(REGISTRY);
}