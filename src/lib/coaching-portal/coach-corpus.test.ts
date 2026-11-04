/**
 * GP-631 (Coaching advantage A4) — pure rules for a coach's own knowledge base.
 * Validation, the standards-text refusal at ingest, passage splitting, and which stored items
 * may ever ground an answer (approved only, never a compliance-sensitive passage).
 */
import { describe, expect, it } from 'vitest';

import { answerFromKnowledgeBase } from '@/lib/coaching-portal/ask-my-coach';
import {
  COACH_CORPUS_BODY_MAX,
  COACH_CORPUS_PASSAGE_MAX,
  chunkCorpusText,
  corpusKnowledgeItems,
  heldBackPassageCount,
  isStandardsText,
  validateCorpusInput,
  type CoachCorpusRecord,
} from '@/lib/coaching-portal/coach-corpus';

const TRANSCRIPT = [
  'Welcome back to the show. Today we talk about pricing carpet cleaning jobs.',
  'When you quote a carpet cleaning job, walk the rooms first and measure the square metres. Price the job on the area and the soiling, never on a guess at the door.',
  'Write the quote down on the spot so the customer sees the number and what it includes.',
].join('\n\n');

function record(over: Partial<CoachCorpusRecord> = {}): CoachCorpusRecord {
  return {
    id: 'item-1',
    coachId: 'coach-a',
    sourceType: 'transcript',
    title: 'Episode 12: pricing carpet jobs',
    body: TRANSCRIPT,
    provenanceUrl: 'https://example.test/podcast/12',
    approvedAt: new Date('2026-11-04T00:00:00Z'),
    createdAt: new Date('2026-11-03T00:00:00Z'),
    ...over,
  };
}

describe('validateCorpusInput', () => {
  it('accepts a pasted transcript with a provenance URL', () => {
    const r = validateCorpusInput({
      sourceType: 'transcript',
      title: '  Episode 12  ',
      body: TRANSCRIPT,
      provenanceUrl: 'https://example.test/podcast/12',
    });
    expect(r).toEqual({
      ok: true,
      value: {
        sourceType: 'transcript',
        title: 'Episode 12',
        body: TRANSCRIPT,
        provenanceUrl: 'https://example.test/podcast/12',
      },
    });
  });

  it('accepts every ticket source type and nothing else', () => {
    for (const sourceType of ['transcript', 'book_chapter', 'newsletter', 'framework', 'sop']) {
      expect(validateCorpusInput({ sourceType, title: 'Title', body: TRANSCRIPT }).ok).toBe(true);
    }
    expect(validateCorpusInput({ sourceType: 'standard', title: 'T', body: TRANSCRIPT }).ok).toBe(
      false
    );
  });

  it('rejects missing title, too-short or too-long text, and non-http provenance', () => {
    expect(validateCorpusInput({ sourceType: 'sop', title: '', body: TRANSCRIPT }).ok).toBe(false);
    expect(validateCorpusInput({ sourceType: 'sop', title: 'T', body: 'too short' }).ok).toBe(
      false
    );
    expect(
      validateCorpusInput({
        sourceType: 'sop',
        title: 'T',
        body: 'x '.repeat(COACH_CORPUS_BODY_MAX),
      }).ok
    ).toBe(false);
    expect(
      validateCorpusInput({
        sourceType: 'sop',
        title: 'T',
        body: TRANSCRIPT,
        provenanceUrl: 'javascript:alert(1)',
      }).ok
    ).toBe(false);
    expect(validateCorpusInput(null).ok).toBe(false);
  });

  it('treats an empty provenance URL as none', () => {
    const r = validateCorpusInput({
      sourceType: 'sop',
      title: 'T',
      body: TRANSCRIPT,
      provenanceUrl: ' ',
    });
    expect(r.ok && r.value.provenanceUrl).toBeNull();
  });
});

describe('isStandardsText (IICRC AI-use prohibition at ingest)', () => {
  const excerpt =
    'ANSI/IICRC S500 Section 12.2.1 The restorer shall inspect the structure. ' +
    '12.2.2 The restorer shall document moisture readings. 12.2.3 The restorer shall ' +
    'establish drying goals before equipment is placed. Section 12.3 covers drying equipment ' +
    'placement and monitoring frequency for every affected area of the structure in detail.';

  it('refuses pasted standard body text, even inside a longer transcript', () => {
    expect(isStandardsText(excerpt)).toBe(true);
    expect(isStandardsText(`${TRANSCRIPT}\n\n${excerpt}\n\n${TRANSCRIPT}`)).toBe(true);
  });

  it('does not refuse ordinary coaching material', () => {
    expect(isStandardsText(TRANSCRIPT)).toBe(false);
  });
});

describe('chunkCorpusText', () => {
  it('splits on blank lines and keeps every passage under the cap', () => {
    const long = Array.from({ length: 40 }, (_, i) => `Sentence ${i} about quoting work.`).join(
      ' '
    );
    const chunks = chunkCorpusText(`${TRANSCRIPT}\n\n${long}`);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(COACH_CORPUS_PASSAGE_MAX);
    expect(chunks.join(' ')).toContain('measure the square metres');
  });

  it('drops empty paragraphs', () => {
    expect(chunkCorpusText('\n\n  \n\nOne paragraph only.\n\n')).toEqual(['One paragraph only.']);
  });
});

describe('corpusKnowledgeItems', () => {
  it('uses approved items only, quoting passages with the item as the source', () => {
    const items = corpusKnowledgeItems([
      record(),
      record({ id: 'draft', approvedAt: null, title: 'Unapproved draft' }),
    ]);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.id.startsWith('corpus-item-1-'))).toBe(true);
    expect(items[0].sourceLabel).toBe('Transcript: Episode 12: pricing carpet jobs');
    expect(items[0].sourceHref).toBe('https://example.test/podcast/12');
  });

  it('leaves the link empty when the item has no provenance URL', () => {
    const [item] = corpusKnowledgeItems([record({ provenanceUrl: null })]);
    expect(item.sourceHref).toBe('');
  });

  it('never offers a passage that mentions certification or CEC wording', () => {
    const body = `${TRANSCRIPT}\n\nAsk me directly about CEC hours and your recertification.`;
    const items = corpusKnowledgeItems([record({ body })]);
    // The clean paragraphs stay usable; only the one that touches credentials is held back.
    expect(items).toHaveLength(3);
    expect(items.some((i) => /CEC|recert/i.test(i.body))).toBe(false);
    expect(heldBackPassageCount(body)).toBe(1);
  });

  it('grounds an answer from an approved passage', () => {
    const kb = { coachId: 'coach-a', items: corpusKnowledgeItems([record()]) };
    const a = answerFromKnowledgeBase('How should I price a carpet cleaning quote?', kb);
    expect(a.status).toBe('answered');
  });
});
