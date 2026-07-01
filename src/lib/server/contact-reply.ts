/**
 * IICRC-grounded contact-reply composer (Phase 2).
 *
 * Pure, dependency-light helpers the `carsi-contact-reply` skill and the
 * admin reply API share. They assemble an original-wording, *cited* reply with
 * the finalized assistant disclaimer footer, run the enforced no-verbatim
 * copyright guardrail, and build the provenance/audit record persisted for every
 * outbound draft.
 *
 * Design constraints (see docs/specs/2026-07-01-carsi-assistant-and-contact-reply.md):
 * - copyright-safe: paraphrase + cite only; the no-verbatim guard fails a draft
 *   closed rather than letting a >= n-gram overlap through;
 * - never auto-send: this module only *builds* and *validates* a draft — sending
 *   is a separate, human-approved step;
 * - the disclaimer is single-sourced from assistant-disclaimer.ts so the wording
 *   legal signs off on renders in the chat one-liner, the first-open notice, and
 *   this reply footer identically.
 */

import { ASSISTANT_DISCLAIMER } from '@/lib/assistant-disclaimer';
import { assertNoVerbatimSource, type NoVerbatimResult } from '@/lib/server/no-verbatim-guard';

/** A standard passage the reply was grounded in, used both for citation and the n-gram check. */
export interface ReplySource {
  /** Standard name, e.g. "IICRC S500". */
  standard: string;
  /** Optional section/clause reference, e.g. "12.2.3". */
  section?: string;
  /**
   * The source passage the draft was grounded in. Never rendered to the
   * recipient — it exists so `assertNoVerbatimSource` can prove the draft does
   * not reproduce it verbatim, and so the provenance record is auditable.
   */
  passage?: string;
}

export interface ContactReplyInput {
  /** The recipient's first name (or full name) for the greeting. */
  recipientName: string;
  /** The paraphrased, original-wording answer paragraphs. */
  answerParagraphs: string[];
  /** The standards the answer is grounded in — at least one is required to cite. */
  sources: ReplySource[];
}

/** The finalized disclaimer footer, single-sourced. */
export const CONTACT_REPLY_DISCLAIMER = ASSISTANT_DISCLAIMER;

function citationLabel(source: ReplySource): string {
  const standard = source.standard.trim();
  const section = source.section?.trim();
  return section ? `${standard} §${section}` : standard;
}

/**
 * The list of distinct standard citations for a set of sources, order-preserving
 * and de-duplicated, e.g. ["IICRC S500 §12.2.3", "IICRC S520"].
 */
export function citedStandards(sources: ReplySource[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const source of sources) {
    if (!source?.standard?.trim()) continue;
    const label = citationLabel(source);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/**
 * Build the plain-text reply body: greeting, the paraphrased answer, an explicit
 * citation line, and the disclaimer footer. Original wording only — this function
 * never emits source passages.
 *
 * @throws if there is no answer or no citable standard (fails closed — CARSI does
 *         not send an uncited standards claim).
 */
export function buildContactReplyText(input: ContactReplyInput): string {
  const name = input.recipientName?.trim() || 'there';
  const paragraphs = (input.answerParagraphs ?? [])
    .map((p) => p?.trim())
    .filter((p): p is string => Boolean(p));
  const standards = citedStandards(input.sources ?? []);

  if (paragraphs.length === 0) {
    throw new Error('Contact reply requires at least one answer paragraph.');
  }
  if (standards.length === 0) {
    throw new Error('Contact reply must cite at least one IICRC/RIA standard.');
  }

  const citation =
    standards.length === 1
      ? `This guidance is grounded in ${standards[0]}.`
      : `This guidance is grounded in ${standards.slice(0, -1).join(', ')} and ${
          standards[standards.length - 1]
        }.`;

  return [
    `Hi ${name},`,
    'Thanks for reaching out to CARSI.',
    ...paragraphs,
    citation,
    CONTACT_REPLY_DISCLAIMER,
    'Warm regards,\nThe CARSI team',
  ].join('\n\n');
}

/**
 * Run the enforced no-verbatim copyright guardrail against the drafted reply,
 * comparing it to every source passage. A draft that fails MUST NOT be queued —
 * it is returned to the drafter for regeneration.
 */
export function validateReplyNoVerbatim(
  replyText: string,
  sources: ReplySource[],
  n = 8,
): NoVerbatimResult {
  const passages = (sources ?? [])
    .map((s) => s?.passage?.trim())
    .filter((p): p is string => Boolean(p));
  return assertNoVerbatimSource(replyText, passages, n);
}

/**
 * Guarantee the finalized disclaimer footer is present on a reply body,
 * idempotently. AI drafts already carry it; a founder's free-text inline reply
 * gets it appended so every outbound reply — human or AI — footers identically.
 */
export function ensureReplyDisclaimer(body: string): string {
  const trimmed = (body ?? '').trimEnd();
  if (trimmed.includes(CONTACT_REPLY_DISCLAIMER)) return trimmed;
  return `${trimmed}\n\n${CONTACT_REPLY_DISCLAIMER}`;
}

export interface JudgeVerdict {
  score?: number;
  verdict?: string;
  notes?: string;
}

/** The defensible per-draft audit record persisted for every outbound reply. */
export interface ContactReplyProvenance {
  question: string;
  standardsCited: string[];
  /** Source references (standard + section) — passages are NOT persisted verbatim. */
  stormSources: Array<{ standard: string; section?: string }>;
  judgeVerdict?: JudgeVerdict | null;
  /** Always "pass": a failing draft is never persisted (fails closed). */
  ngramCheck: 'pass';
  /** The drafting agent identifier. */
  draftedBy: string;
  /** The human who approved the send; null until approved. */
  approvedBy?: string | null;
  /** ISO timestamp the reply was sent; null until sent. */
  sentAt?: string | null;
}

/**
 * SLA window: if the founder hasn't replied from the Contacts section within
 * this window, an auto-send-eligible AI draft is dispatched automatically.
 * Founder-authorized 2026-07-01 (overrides the spec's "never auto-send" default).
 */
export const CONTACT_REPLY_SLA_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface AutoSendCheck {
  /** The draft's status — only 'pending_approval' drafts can auto-send. */
  status: string;
  /**
   * Whether the draft cleared the deterministic gates (no-verbatim guard PASS +
   * judge verdict PASS). A draft that failed either is NEVER auto-sent — it stays
   * for a human. This is the copyright/accuracy net that survives dropping the
   * human-approval gate.
   */
  autoSendEligible: boolean;
  /** The parent contact submission's status; a replied/archived thread never auto-sends. */
  submissionStatus: string;
  /** When the contact submission arrived. */
  submissionCreatedAt: Date | string | number;
  /** Injectable clock for testing. */
  now?: Date | number;
}

/**
 * True when an AI draft is due to auto-send: it is still pending, cleared the
 * deterministic gates, its thread is unanswered, and the 2-hour SLA has elapsed.
 * Fails closed — any missing precondition returns false.
 */
export function isDueForAutoSend(check: AutoSendCheck): boolean {
  if (check.status !== 'pending_approval') return false;
  if (!check.autoSendEligible) return false;
  if (check.submissionStatus === 'replied' || check.submissionStatus === 'archived') {
    return false;
  }
  const created = new Date(check.submissionCreatedAt).getTime();
  const now = check.now ? new Date(check.now).getTime() : Date.now();
  if (!Number.isFinite(created)) return false;
  return now - created >= CONTACT_REPLY_SLA_MS;
}

export interface BuildProvenanceInput {
  question: string;
  sources: ReplySource[];
  draftedBy: string;
  judgeVerdict?: JudgeVerdict | null;
  approvedBy?: string | null;
  sentAt?: string | null;
}

/**
 * Assemble the provenance/audit record. Only source *references* (standard +
 * section) are retained — never the copyrighted passages — so the record is safe
 * to store and surface to the approving human.
 */
export function buildReplyProvenance(input: BuildProvenanceInput): ContactReplyProvenance {
  return {
    question: input.question?.trim() ?? '',
    standardsCited: citedStandards(input.sources ?? []),
    stormSources: (input.sources ?? [])
      .filter((s) => s?.standard?.trim())
      .map((s) => ({
        standard: s.standard.trim(),
        ...(s.section?.trim() ? { section: s.section.trim() } : {}),
      })),
    judgeVerdict: input.judgeVerdict ?? null,
    ngramCheck: 'pass',
    draftedBy: input.draftedBy,
    approvedBy: input.approvedBy ?? null,
    sentAt: input.sentAt ?? null,
  };
}
