/**
 * Moderation audit (spec 2026-10-18 D1, D3, D4; AC-3): the event table is append-only, a hide
 * without a reason fails in the database too, and an edit after a hide is detectable.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { displayAuthor, reviewContentSha256, toModerationDto } from './course-reviews';

const MIGRATION = readFileSync(
  join(process.cwd(), 'prisma/migrations/20261018100000_review_moderation_and_request_ledger/migration.sql'),
  'utf8'
);
const SERVICE = readFileSync(join(process.cwd(), 'src/lib/server/course-reviews.ts'), 'utf8');

describe('moderation event table (D1, D3)', () => {
  it('the database rejects a hide event without a reason', () => {
    expect(MIGRATION).toMatch(/CHECK \("action" <> 'hide' OR "reason" IS NOT NULL\)/);
  });

  it('the database allows only the four listed reasons', () => {
    expect(MIGRATION).toContain(
      `"reason" IN ('offensive', 'personal_information', 'not_about_course', 'spam_or_fake')`
    );
  });

  it('the migration is additive: it never alters, updates or deletes existing data', () => {
    const statements = MIGRATION.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
    expect(statements).not.toMatch(/\bALTER TABLE "lms_course_reviews"/);
    expect(statements).not.toMatch(/^\s*(UPDATE|DELETE FROM|DROP|TRUNCATE)\b/im);
  });

  it('application code never updates or deletes a moderation event', () => {
    expect(SERVICE).not.toMatch(/lmsCourseReviewModerationEvent\.(update|updateMany|upsert|delete|deleteMany)\b/);
  });

  it('review emails are unique per enrolment in the database', () => {
    expect(MIGRATION).toMatch(/CREATE UNIQUE INDEX "lms_review_request_emails_enrollment_id_key"/);
  });
});

describe('toModerationDto (D3, D4)', () => {
  const at = new Date('2026-10-03T00:00:00.000Z');

  it('a visible review reports no hide', () => {
    expect(toModerationDto({ isPublished: true, title: 'a', body: 'b' }, null)).toEqual({
      hidden_reason: null,
      hidden_at: null,
      hidden_before_reasons_recorded: false,
      edited_after_hide: false,
    });
  });

  it('a review hidden before reasons were recorded is labelled as such, never given a reason', () => {
    expect(toModerationDto({ isPublished: false, title: 'a', body: 'b' }, null)).toMatchObject({
      hidden_reason: null,
      hidden_before_reasons_recorded: true,
    });
  });

  it('an unchanged hidden review is not flagged as edited', () => {
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a', 'b'), createdAt: at };
    expect(toModerationDto({ isPublished: false, title: 'a', body: 'b' }, latest).edited_after_hide).toBe(false);
  });

  it('a hidden review the learner edited afterwards is flagged', () => {
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a', 'b'), createdAt: at };
    expect(toModerationDto({ isPublished: false, title: 'a', body: 'changed' }, latest).edited_after_hide).toBe(true);
  });

  it('the content hash distinguishes a moved newline (title/body boundary)', () => {
    expect(reviewContentSha256('ab', 'c')).not.toBe(reviewContentSha256('a', 'bc'));
  });
});

describe('displayAuthor (D8)', () => {
  it('uses the first name only', () => {
    expect(displayAuthor({ fullName: 'Sam Rivers' })).toBe('Sam');
  });
  it('never derives a public name from the email', () => {
    const shown = displayAuthor({ fullName: null, email: 'john.smith.waterdamage@gmail.com' } as never);
    expect(shown).toBe('CARSI learner');
    expect(shown.toLowerCase()).not.toContain('john');
  });
  it('treats a blank name as no name', () => {
    expect(displayAuthor({ fullName: '   ' })).toBe('CARSI learner');
  });
});
