import { describe, expect, it } from 'vitest';

import { ASSISTANT_DISCLAIMER } from '@/lib/assistant-disclaimer';
import {
  CONTACT_REPLY_DISCLAIMER,
  CONTACT_REPLY_SLA_MS,
  buildContactReplyText,
  buildReplyProvenance,
  citedStandards,
  ensureReplyDisclaimer,
  isDueForAutoSend,
  validateReplyNoVerbatim,
  type ReplySource,
} from '@/lib/server/contact-reply';

const S500: ReplySource = {
  standard: 'IICRC S500',
  section: '12.2.3',
  passage:
    'Restorers should establish drying goals based on a documented moisture standard for materials and continuously monitor progress until those goals are achieved.',
};
const S520: ReplySource = { standard: 'IICRC S520', passage: 'Condition 2 contamination requires source removal and cleaning.' };

describe('citedStandards', () => {
  it('formats standard + section and de-duplicates order-preserving', () => {
    expect(citedStandards([S500, S520, { ...S500 }])).toEqual(['IICRC S500 §12.2.3', 'IICRC S520']);
  });

  it('drops sources with no standard name', () => {
    expect(citedStandards([{ standard: '  ' }, S520])).toEqual(['IICRC S520']);
  });
});

describe('buildContactReplyText', () => {
  it('greets, includes the answer, cites the standard, and appends the finalized disclaimer', () => {
    const text = buildContactReplyText({
      recipientName: 'Daniel',
      answerParagraphs: ['Set measurable drying goals and monitor until they are met.'],
      sources: [S500],
    });
    expect(text).toContain('Hi Daniel,');
    expect(text).toContain('Set measurable drying goals');
    expect(text).toContain('grounded in IICRC S500 §12.2.3.');
    expect(text).toContain(CONTACT_REPLY_DISCLAIMER);
    expect(CONTACT_REPLY_DISCLAIMER).toBe(ASSISTANT_DISCLAIMER); // single-sourced
  });

  it('joins multiple citations with a serial "and"', () => {
    const text = buildContactReplyText({
      recipientName: 'Sam',
      answerParagraphs: ['Follow the applicable standards.'],
      sources: [S500, S520],
    });
    expect(text).toContain('grounded in IICRC S500 §12.2.3 and IICRC S520.');
  });

  it('fails closed when there is no answer', () => {
    expect(() => buildContactReplyText({ recipientName: 'X', answerParagraphs: [], sources: [S500] })).toThrow();
  });

  it('fails closed when no standard is cited (no uncited standards claim)', () => {
    expect(() => buildContactReplyText({ recipientName: 'X', answerParagraphs: ['hi'], sources: [] })).toThrow();
  });
});

describe('ensureReplyDisclaimer', () => {
  it('appends the disclaimer to a free-text reply that lacks it', () => {
    const out = ensureReplyDisclaimer('Hi Daniel,\n\nHappy to help.');
    expect(out.endsWith(CONTACT_REPLY_DISCLAIMER)).toBe(true);
  });

  it('is idempotent when the disclaimer is already present', () => {
    const withDisc = `Hi Daniel,\n\nHappy to help.\n\n${CONTACT_REPLY_DISCLAIMER}`;
    expect(ensureReplyDisclaimer(withDisc)).toBe(withDisc);
  });
});

describe('validateReplyNoVerbatim', () => {
  it('passes an original-wording paraphrase', () => {
    const draft = buildContactReplyText({
      recipientName: 'Daniel',
      answerParagraphs: ['Define moisture targets up front and keep checking readings until the material is dry.'],
      sources: [S500],
    });
    expect(validateReplyNoVerbatim(draft, [S500], 8).ok).toBe(true);
  });

  it('fails a draft that reproduces an >= 8-word run from a source', () => {
    const planted = `Hi Daniel,\n\n${S500.passage}`;
    const result = validateReplyNoVerbatim(planted, [S500], 8);
    expect(result.ok).toBe(false);
    expect(result.match).toBeTruthy();
  });
});

describe('buildReplyProvenance', () => {
  it('records cited standards + section refs but never the copyrighted passage', () => {
    const prov = buildReplyProvenance({
      question: 'What does S500 say about drying goals?',
      sources: [S500, S520],
      draftedBy: 'agent:carsi-contact-reply',
      judgeVerdict: { score: 94, verdict: 'APPROVE' },
    });
    expect(prov.standardsCited).toEqual(['IICRC S500 §12.2.3', 'IICRC S520']);
    expect(prov.stormSources).toEqual([{ standard: 'IICRC S500', section: '12.2.3' }, { standard: 'IICRC S520' }]);
    expect(prov.ngramCheck).toBe('pass');
    expect(prov.approvedBy).toBeNull();
    expect(prov.sentAt).toBeNull();
    expect(JSON.stringify(prov)).not.toContain(S500.passage);
  });
});

describe('isDueForAutoSend', () => {
  const base = {
    status: 'pending_approval',
    autoSendEligible: true,
    submissionStatus: 'new',
    submissionCreatedAt: new Date('2026-07-01T00:00:00Z'),
  };
  const justAfterSla = new Date('2026-07-01T02:00:01Z');
  const beforeSla = new Date('2026-07-01T01:30:00Z');

  it('sends once the 2h SLA has elapsed on an eligible pending draft', () => {
    expect(isDueForAutoSend({ ...base, now: justAfterSla })).toBe(true);
  });

  it('does not send before the SLA elapses', () => {
    expect(isDueForAutoSend({ ...base, now: beforeSla })).toBe(false);
  });

  it('never auto-sends a draft that failed the deterministic gates', () => {
    expect(isDueForAutoSend({ ...base, autoSendEligible: false, now: justAfterSla })).toBe(false);
  });

  it('never auto-sends once the thread is already replied', () => {
    expect(isDueForAutoSend({ ...base, submissionStatus: 'replied', now: justAfterSla })).toBe(false);
  });

  it('never re-sends a draft that is no longer pending', () => {
    expect(isDueForAutoSend({ ...base, status: 'sent', now: justAfterSla })).toBe(false);
  });

  it('exposes a 2-hour window', () => {
    expect(CONTACT_REPLY_SLA_MS).toBe(2 * 60 * 60 * 1000);
  });
});
