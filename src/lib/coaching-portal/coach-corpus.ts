/**
 * GP-631 (Coaching advantage A4) — a coach's own knowledge base: pure rules.
 *
 * A coach adds their own material (podcast transcripts, book chapters, newsletters,
 * frameworks, SOPs). Each item belongs to one coach, is used only after the coach approves
 * it, and can be removed by the coach at any time. Ask my coach (GP-630) quotes it word for
 * word, one paragraph at a time, with the item named as the source.
 *
 * Nothing here calls a model. Two licence guards apply at ingest and at read:
 * - IICRC standard text is refused at ingest (CLAUDE.md, IICRC AI-use prohibition), using
 *   the course-kit excerpt scanner on the whole text and on every paragraph;
 * - any passage touching certification, accreditation, CEC or CPD wording is never quoted.
 */
import {
  isComplianceSensitiveQuestion,
  type CoachKnowledgeItem,
} from '@/lib/coaching-portal/ask-my-coach';
import { scanTextForStandardExcerpt } from '@/lib/course-kit/standards-excerpt';

export const COACH_CORPUS_SOURCE_TYPES = {
  transcript: 'Transcript',
  book_chapter: 'Book chapter',
  newsletter: 'Newsletter',
  framework: 'Framework',
  sop: 'SOP',
} as const;

export type CoachCorpusSourceType = keyof typeof COACH_CORPUS_SOURCE_TYPES;

export type CoachCorpusRecord = {
  id: string;
  coachId: string;
  sourceType: CoachCorpusSourceType;
  title: string;
  body: string;
  provenanceUrl: string | null;
  approvedAt: Date | null;
  createdAt: Date;
};

export type CoachCorpusInput = Pick<
  CoachCorpusRecord,
  'sourceType' | 'title' | 'body' | 'provenanceUrl'
>;

export const COACH_CORPUS_TITLE_MAX = 200;
export const COACH_CORPUS_BODY_MIN = 50;
/** About a long book chapter or a two-hour transcript. */
export const COACH_CORPUS_BODY_MAX = 200_000;
export const COACH_CORPUS_URL_MAX = 500;
/** Longest passage quoted in one answer. Longer paragraphs are split at sentence ends. */
export const COACH_CORPUS_PASSAGE_MAX = 1200;

export function isCoachCorpusSourceType(v: unknown): v is CoachCorpusSourceType {
  return (
    typeof v === 'string' && Object.prototype.hasOwnProperty.call(COACH_CORPUS_SOURCE_TYPES, v)
  );
}

function normaliseProvenanceUrl(raw: unknown): string | null | undefined {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  if (!v) return null;
  if (v.length > COACH_CORPUS_URL_MAX) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export type CorpusValidation = { ok: true; value: CoachCorpusInput } | { ok: false; error: string };

export function validateCorpusInput(raw: unknown): CorpusValidation {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'Add a title and the text.' };
  const r = raw as Record<string, unknown>;
  if (!isCoachCorpusSourceType(r.sourceType)) {
    return { ok: false, error: 'Choose what kind of material this is.' };
  }
  const title = typeof r.title === 'string' ? r.title.replace(/\s+/g, ' ').trim() : '';
  if (!title || title.length > COACH_CORPUS_TITLE_MAX) {
    return { ok: false, error: `Add a title (up to ${COACH_CORPUS_TITLE_MAX} characters).` };
  }
  const body = typeof r.body === 'string' ? r.body.replace(/\r\n?/g, '\n').trim() : '';
  if (body.length < COACH_CORPUS_BODY_MIN || body.length > COACH_CORPUS_BODY_MAX) {
    return {
      ok: false,
      error: `Add between ${COACH_CORPUS_BODY_MIN} and ${COACH_CORPUS_BODY_MAX.toLocaleString('en-AU')} characters of text.`,
    };
  }
  const provenanceUrl = normaliseProvenanceUrl(r.provenanceUrl);
  if (provenanceUrl === undefined) {
    return { ok: false, error: 'The source link must be a web address starting with https://.' };
  }
  return { ok: true, value: { sourceType: r.sourceType, title, body, provenanceUrl } };
}

function paragraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/** Split one long paragraph at sentence ends (or hard, as a last resort) under the cap. */
function splitLong(p: string): string[] {
  if (p.length <= COACH_CORPUS_PASSAGE_MAX) return [p];
  const sentences = p.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [p];
  const out: string[] = [];
  let cur = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > COACH_CORPUS_PASSAGE_MAX) {
      if (cur) out.push(cur);
      cur = '';
      for (let i = 0; i < s.length; i += COACH_CORPUS_PASSAGE_MAX) {
        out.push(s.slice(i, i + COACH_CORPUS_PASSAGE_MAX).trim());
      }
      continue;
    }
    const next = cur ? `${cur} ${s}` : s;
    if (next.length > COACH_CORPUS_PASSAGE_MAX) {
      out.push(cur);
      cur = s;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out.filter(Boolean);
}

/** The passages an item is quoted in: one per paragraph, long paragraphs split. */
export function chunkCorpusText(body: string): string[] {
  return paragraphs(body).flatMap(splitLong);
}

/**
 * True when the text looks like pasted IICRC standard body text. Checked on the whole text
 * and on each paragraph, so an excerpt buried in a long transcript is still caught.
 */
export function isStandardsText(body: string): boolean {
  if (scanTextForStandardExcerpt(body)) return true;
  return paragraphs(body).some((p) => scanTextForStandardExcerpt(p) !== null);
}

function passageIsUsable(title: string, passage: string): boolean {
  return !isComplianceSensitiveQuestion(`${title} ${passage}`);
}

/** How many passages of this text will never be quoted because they touch credential topics. */
export function heldBackPassageCount(body: string, title = ''): number {
  return chunkCorpusText(body).filter((p) => !passageIsUsable(title, p)).length;
}

export function corpusSourceLabel(r: Pick<CoachCorpusRecord, 'sourceType' | 'title'>): string {
  return `${COACH_CORPUS_SOURCE_TYPES[r.sourceType]}: ${r.title}`;
}

/**
 * Knowledge items for Ask my coach: approved records only, one item per usable passage, the
 * record named as the source. The caller has already scoped the records to one coach.
 */
export function corpusKnowledgeItems(records: readonly CoachCorpusRecord[]): CoachKnowledgeItem[] {
  return records
    .filter((r) => r.approvedAt !== null)
    .flatMap((r) =>
      chunkCorpusText(r.body)
        .map((text, i) => ({ text, i }))
        .filter(({ text }) => passageIsUsable(r.title, text))
        .map(({ text, i }) => ({
          id: `corpus-${r.id}-${i + 1}`,
          title: r.title,
          body: text,
          sourceLabel: corpusSourceLabel(r),
          sourceHref: r.provenanceUrl ?? '',
        }))
    );
}
