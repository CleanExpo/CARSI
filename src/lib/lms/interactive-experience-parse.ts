import { getInteractiveExperienceById } from '@/lib/lms/interactive-experience-registry';
import type {
  DiagramHotspot,
  InteractiveActivity,
  InteractiveExperience,
  InteractiveResource,
  ScenarioStep,
} from '@/lib/lms/interactive-experience-types';
import { isInteractiveResource } from '@/lib/lms/interactive-experience-types';

type HazardSpotActivity = Extract<InteractiveActivity, { type: 'hazard-spot' }>;
type DecisionActivity = Extract<InteractiveActivity, { type: 'decision' }>;
type KnowledgeActivity = Extract<InteractiveActivity, { type: 'knowledge' }>;

function parseScenarioSteps(raw: unknown): ScenarioStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: ScenarioStep[] = [];
  for (const step of raw) {
    if (!step || typeof step !== 'object') continue;
    const { prompt, choices } = step as { prompt?: unknown; choices?: unknown };
    if (typeof prompt !== 'string' || !prompt.trim()) continue;
    const parsedChoices: ScenarioStep['choices'] = [];
    if (Array.isArray(choices)) {
      for (const choice of choices) {
        if (!choice || typeof choice !== 'object') continue;
        const { id, label, correct, feedback } = choice as {
          id?: unknown;
          label?: unknown;
          correct?: unknown;
          feedback?: unknown;
        };
        if (typeof id !== 'string' || !id.trim() || typeof label !== 'string' || !label.trim())
          continue;
        if (typeof feedback !== 'string' || !feedback.trim()) continue;
        parsedChoices.push({
          id,
          label,
          correct: correct === true,
          feedback,
        });
      }
    }
    if (parsedChoices.length === 0) continue;
    steps.push({ prompt, choices: parsedChoices });
  }
  return steps;
}

function parseHotspots(raw: unknown): DiagramHotspot[] {
  if (!Array.isArray(raw)) return [];
  const hotspots: DiagramHotspot[] = [];
  for (const spot of raw) {
    if (!spot || typeof spot !== 'object') continue;
    const o = spot as Record<string, unknown>;
    const nums = ['x', 'y', 'w', 'h'].map((k) =>
      typeof o[k] === 'number' && Number.isFinite(o[k] as number) ? (o[k] as number) : null
    );
    if (nums.some((n) => n === null)) continue;
    if (typeof o.id !== 'string' || !o.id.trim() || typeof o.label !== 'string' || !o.label.trim())
      continue;
    if (typeof o.detail !== 'string' || !o.detail.trim()) continue;
    const markerNumber =
      typeof o.markerNumber === 'number' && Number.isInteger(o.markerNumber) && o.markerNumber > 0
        ? o.markerNumber
        : undefined;
    hotspots.push({
      id: o.id,
      label: o.label,
      markerNumber,
      detail: o.detail,
      x: nums[0]!,
      y: nums[1]!,
      w: nums[2]!,
      h: nums[3]!,
    });
  }
  return hotspots;
}

function parseActivities(raw: unknown): InteractiveActivity[] {
  if (!Array.isArray(raw)) return [];
  const out: InteractiveActivity[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const a = item as Record<string, unknown>;
    const id = typeof a.id === 'string' ? a.id.trim() : '';
    const title = typeof a.title === 'string' ? a.title.trim() : '';
    const type = a.type;
    const xp =
      typeof a.xp === 'number' && Number.isFinite(a.xp) && a.xp >= 0 ? Math.round(a.xp) : 10;
    if (!id || !title) continue;

    if (type === 'scenario') {
      const intro = typeof a.intro === 'string' ? a.intro : '';
      const steps = parseScenarioSteps(a.steps);
      if (!intro.trim() || steps.length === 0) continue;
      out.push({ id, type: 'scenario', title, xp, intro, steps });
      continue;
    }
    if (type === 'diagram') {
      const imageSrc = typeof a.imageSrc === 'string' ? a.imageSrc.trim() : '';
      const imageAlt = typeof a.imageAlt === 'string' ? a.imageAlt : '';
      const hotspots = parseHotspots(a.hotspots);
      if (!imageSrc || hotspots.length === 0) continue;
      out.push({ id, type: 'diagram', title, xp, imageSrc, imageAlt, hotspots });
      continue;
    }
    if (type === 'hazard-spot') {
      const prompt = typeof a.prompt === 'string' ? a.prompt : '';
      const successFeedback = typeof a.successFeedback === 'string' ? a.successFeedback : '';
      const options: HazardSpotActivity['options'] = [];
      if (Array.isArray(a.options)) {
        for (const opt of a.options) {
          if (!opt || typeof opt !== 'object') continue;
          const oid = (opt as { id?: unknown }).id;
          const label = (opt as { label?: unknown }).label;
          if (typeof oid === 'string' && oid.trim() && typeof label === 'string' && label.trim()) {
            options.push({ id: oid, label });
          }
        }
      }
      const correctIds = Array.isArray(a.correctIds)
        ? a.correctIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      if (
        !prompt.trim() ||
        options.length === 0 ||
        correctIds.length === 0 ||
        !successFeedback.trim()
      )
        continue;
      out.push({
        id,
        type: 'hazard-spot',
        title,
        xp,
        prompt,
        options,
        correctIds,
        successFeedback,
      });
      continue;
    }
    if (type === 'decision') {
      const scene = typeof a.scene === 'string' ? a.scene : '';
      const prompt = typeof a.prompt === 'string' ? a.prompt : '';
      const choices: DecisionActivity['choices'] = [];
      if (Array.isArray(a.choices)) {
        for (const c of a.choices) {
          if (!c || typeof c !== 'object') continue;
          const {
            id: cid,
            label,
            correct,
            feedback,
            followUp,
          } = c as {
            id?: unknown;
            label?: unknown;
            correct?: unknown;
            feedback?: unknown;
            followUp?: unknown;
          };
          if (typeof cid !== 'string' || !cid.trim() || typeof label !== 'string' || !label.trim())
            continue;
          if (typeof feedback !== 'string' || !feedback.trim()) continue;
          choices.push({
            id: cid,
            label,
            correct: correct === true,
            feedback,
            followUp: typeof followUp === 'string' ? followUp : undefined,
          });
        }
      }
      if (!scene.trim() || !prompt.trim() || choices.length === 0) continue;
      out.push({ id, type: 'decision', title, xp, scene, prompt, choices });
      continue;
    }
    if (type === 'sequence') {
      const prompt = typeof a.prompt === 'string' ? a.prompt : '';
      const successFeedback = typeof a.successFeedback === 'string' ? a.successFeedback : '';
      const items = Array.isArray(a.items)
        ? a.items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      const correctOrder = Array.isArray(a.correctOrder)
        ? a.correctOrder.filter((x): x is number => typeof x === 'number' && Number.isInteger(x))
        : [];
      if (
        !prompt.trim() ||
        items.length < 2 ||
        correctOrder.length !== items.length ||
        !successFeedback.trim()
      ) {
        continue;
      }
      out.push({ id, type: 'sequence', title, xp, prompt, items, correctOrder, successFeedback });
      continue;
    }
    if (type === 'knowledge') {
      const prompt = typeof a.prompt === 'string' ? a.prompt : '';
      const correctId = typeof a.correctId === 'string' ? a.correctId : '';
      const successFeedback = typeof a.successFeedback === 'string' ? a.successFeedback : '';
      const incorrectFeedback = typeof a.incorrectFeedback === 'string' ? a.incorrectFeedback : '';
      const options: KnowledgeActivity['options'] = [];
      if (Array.isArray(a.options)) {
        for (const opt of a.options) {
          if (!opt || typeof opt !== 'object') continue;
          const oid = (opt as { id?: unknown }).id;
          const label = (opt as { label?: unknown }).label;
          if (typeof oid === 'string' && oid.trim() && typeof label === 'string' && label.trim()) {
            options.push({ id: oid, label });
          }
        }
      }
      if (
        !prompt.trim() ||
        !correctId ||
        options.length < 2 ||
        !successFeedback.trim() ||
        !incorrectFeedback.trim()
      ) {
        continue;
      }
      out.push({
        id,
        type: 'knowledge',
        title,
        xp,
        prompt,
        options,
        correctId,
        successFeedback,
        incorrectFeedback,
      });
    }
  }
  return out;
}

function parseInlineExperience(raw: unknown): InteractiveExperience | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id.trim() : '';
  const title = typeof o.title === 'string' ? o.title.trim() : '';
  const disclaimer = typeof o.disclaimer === 'string' ? o.disclaimer : '';
  const subtitle = typeof o.subtitle === 'string' ? o.subtitle : undefined;
  const activities = parseActivities(o.activities);
  if (!id || !title || !disclaimer.trim() || activities.length === 0) return null;
  return { id, title, subtitle, disclaimer, activities };
}

export interface ParsedInteractiveResource {
  kind: 'interactive';
  label: string;
  experience: InteractiveExperience;
}

export function parseInteractiveLessonResource(raw: unknown): ParsedInteractiveResource | null {
  if (!raw || typeof raw !== 'object') return null;
  if (!isInteractiveResource(raw as InteractiveResource)) return null;
  const label =
    typeof (raw as { label?: unknown }).label === 'string' &&
    (raw as { label: string }).label.trim()
      ? (raw as { label: string }).label
      : 'Interactive experience';

  const experienceId = (raw as InteractiveResource).experienceId;
  const inline = parseInlineExperience((raw as { experience?: unknown }).experience);
  const fromRegistry = getInteractiveExperienceById(experienceId);
  const experience = inline ?? fromRegistry;
  if (!experience) return null;
  return { kind: 'interactive', label, experience };
}
