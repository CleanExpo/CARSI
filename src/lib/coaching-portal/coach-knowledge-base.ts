/**
 * GP-630 — the knowledge base "Ask my coach" answers from, keyed by coach.
 *
 * GP-631 (A4) will give each coach their own ingested, coach-owned corpus. Until it lands,
 * the default coach's knowledge base is the coaching material CARSI already publishes: the
 * programme inclusions shown on the coaching page and the curated portal resources. It is
 * built from those modules at runtime, so there is one home for the words and nothing here
 * can drift from what members already see.
 *
 * Fail closed: an unknown coach has no knowledge base (every question goes to the coach), and
 * any item that touches certification, accreditation or CEC wording is left out.
 */
import {
  isComplianceSensitiveQuestion,
  type CoachKnowledgeBase,
  type CoachKnowledgeItem,
} from '@/lib/coaching-portal/ask-my-coach';
import { DEFAULT_COACHING_COACH } from '@/lib/coaching-portal/coach-routing';
import { COACHING_RESOURCE_SECTIONS } from '@/lib/coaching-portal/coaching-resources';
import { carsiCoachingMonthlyInclusions } from '@/lib/marketing/carsi-coaching-program';

/** Programme categories that describe the coaching itself (Platform is product status, not advice). */
const PROGRAMME_CATEGORIES = new Set([
  'Strategy & plan',
  'Marketing & visibility',
  'Operations & money',
  'Training & AI',
]);

const PROGRAMME_SOURCE = { label: 'Coaching programme: what is included', href: '/ccw-training' };

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildDefaultCoachItems(): CoachKnowledgeItem[] {
  const programme: CoachKnowledgeItem[] = carsiCoachingMonthlyInclusions
    .filter((block) => PROGRAMME_CATEGORIES.has(block.category))
    .flatMap((block) =>
      block.items.map((item) => ({
        id: `programme-${slug(item.title)}`,
        title: item.title,
        body: item.detail,
        sourceLabel: PROGRAMME_SOURCE.label,
        sourceHref: PROGRAMME_SOURCE.href,
      }))
    );

  const resources: CoachKnowledgeItem[] = COACHING_RESOURCE_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: `resource-${section.id}-${item.id}`,
      title: item.title,
      body: item.description,
      sourceLabel: `Coaching resources: ${section.title}`,
      sourceHref: item.href,
    }))
  );

  return [...programme, ...resources];
}

/** Where a coach's knowledge base comes from. GP-631 adds coach-owned sources beside this one. */
export type CoachKnowledgeSource = {
  id: string;
  label: string;
  items: () => CoachKnowledgeItem[];
};

/**
 * The default source (owner decision, 4 Nov 2026): CARSI's own published coaching programme
 * and portal resource text, quoted word for word.
 */
export const CARSI_PUBLISHED_KNOWLEDGE_SOURCE: CoachKnowledgeSource = {
  id: 'carsi-published-programme-and-resources',
  label: 'CARSI published coaching programme and resources',
  items: buildDefaultCoachItems,
};

/** Coach id to knowledge source. Replace one entry to give that coach their own material. */
export const DEFAULT_COACH_KNOWLEDGE_SOURCES: Readonly<Record<string, CoachKnowledgeSource>> =
  Object.freeze({
    [DEFAULT_COACHING_COACH.id]: CARSI_PUBLISHED_KNOWLEDGE_SOURCE,
  });

/**
 * The knowledge base for one coach, or null when that coach has none. Whatever the source,
 * items touching certification, accreditation or CEC wording are dropped (fail closed).
 */
export function getCoachKnowledgeBase(
  coachId: string,
  sources: Readonly<Record<string, CoachKnowledgeSource>> = DEFAULT_COACH_KNOWLEDGE_SOURCES
): CoachKnowledgeBase | null {
  const source = Object.prototype.hasOwnProperty.call(sources, coachId)
    ? sources[coachId]
    : undefined;
  if (!source) return null;
  return {
    coachId,
    sourceId: source.id,
    items: source
      .items()
      .filter((item) => !isComplianceSensitiveQuestion(`${item.title} ${item.body}`)),
  };
}
