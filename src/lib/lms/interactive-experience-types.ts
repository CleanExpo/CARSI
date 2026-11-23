/**
 * Structured interactive lesson activities (pilot — water damage restoration).
 * Parsed from `LmsLesson.resources` entries with `kind: "interactive"`.
 */

export type InteractiveActivityType =
  | 'scenario'
  | 'diagram'
  | 'hazard-spot'
  | 'decision'
  | 'sequence'
  | 'knowledge';

export interface ScenarioStep {
  prompt: string;
  choices: { id: string; label: string; correct?: boolean; feedback: string }[];
}

export interface DiagramHotspot {
  id: string;
  label: string;
  /** Matches numbered markers on the course diagram (1–6 on hazard map). */
  markerNumber?: number;
  /** Percent of image box (0–100). */
  x: number;
  y: number;
  w: number;
  h: number;
  detail: string;
}

export interface InteractiveActivityBase {
  id: string;
  type: InteractiveActivityType;
  title: string;
  xp: number;
}

export interface ScenarioActivity extends InteractiveActivityBase {
  type: 'scenario';
  intro: string;
  steps: ScenarioStep[];
}

export interface DiagramActivity extends InteractiveActivityBase {
  type: 'diagram';
  imageSrc: string;
  imageAlt: string;
  hotspots: DiagramHotspot[];
}

export interface HazardSpotActivity extends InteractiveActivityBase {
  type: 'hazard-spot';
  prompt: string;
  options: { id: string; label: string }[];
  /** Option ids learners must select (all correct hazards). */
  correctIds: string[];
  successFeedback: string;
}

export interface DecisionChoice {
  id: string;
  label: string;
  correct?: boolean;
  feedback: string;
  followUp?: string;
}

export interface DecisionActivity extends InteractiveActivityBase {
  type: 'decision';
  scene: string;
  prompt: string;
  choices: DecisionChoice[];
}

export interface SequenceActivity extends InteractiveActivityBase {
  type: 'sequence';
  prompt: string;
  items: string[];
  /** Indices into `items` in the correct order (must use every item once). */
  correctOrder: number[];
  successFeedback: string;
}

export interface KnowledgeActivity extends InteractiveActivityBase {
  type: 'knowledge';
  prompt: string;
  options: { id: string; label: string }[];
  correctId: string;
  successFeedback: string;
  incorrectFeedback: string;
}

export type InteractiveActivity =
  | ScenarioActivity
  | DiagramActivity
  | HazardSpotActivity
  | DecisionActivity
  | SequenceActivity
  | KnowledgeActivity;

export interface InteractiveExperience {
  id: string;
  title: string;
  subtitle?: string;
  /** Shown above activities — simulations are not competency assessment. */
  disclaimer: string;
  activities: InteractiveActivity[];
}

export interface InteractiveResource {
  kind: 'interactive';
  label?: string;
  url?: undefined;
  experienceId: string;
}

export function isInteractiveResource(
  resource: { kind?: unknown; experienceId?: unknown }
): resource is InteractiveResource {
  return resource.kind === 'interactive' && typeof resource.experienceId === 'string' && resource.experienceId.trim().length > 0;
}