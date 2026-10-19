/**
 * Moderation audit (spec 2026-10-18 D1, D3, D4; AC-3): the event table is append-only, a hide
 * without a reason fails in the database too, and an edit after a hide is detectable.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { displayAuthor, REVIEW_MODERATION_AUDIT_MIGRATION, reviewContentSha256, toModerationDto } from './course-reviews';

const MIGRATION = readFileSync(
  join(process.cwd(), 'prisma/migrations/20261018100000_review_moderation_audit/migration.sql'),
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
    // No functions or triggers: nothing in this migration runs later against live data.
    expect(statements).not.toMatch(/\$\$|CREATE (OR REPLACE )?(FUNCTION|TRIGGER)/i);
    expect(statements).not.toMatch(/^\s*INSERT INTO\b/im);
    // The only change to an existing table: one new column with a constant default (metadata-only).
    const reviewAlters = statements.match(/ALTER TABLE "lms_course_reviews"[^;]*;/g) ?? [];
    expect(reviewAlters).toEqual(['ALTER TABLE "lms_course_reviews" ADD COLUMN "moderation_version" INTEGER NOT NULL DEFAULT 0;']);
    expect(statements).not.toMatch(/ALTER TABLE "lms_(users|courses|enrollments)"\s+(ADD|ALTER|DROP) COLUMN/);
    expect(statements).not.toMatch(/^\s*(UPDATE|DELETE FROM|DROP|TRUNCATE)\b/im);
  });

  it('the public policy date is read from a migration that exists (renaming it must update the constant)', () => {
    expect(existsSync(join(process.cwd(), 'prisma/migrations', REVIEW_MODERATION_AUDIT_MIGRATION, 'migration.sql'))).toBe(true);
  });

  it('application code never updates or deletes a moderation event', () => {
    expect(SERVICE).not.toMatch(/lmsCourseReviewModerationEvent\.(update|updateMany|upsert|delete|deleteMany)\b/);
  });

  it('two decisions can never share a place in one review\'s order (database unique index)', () => {
    expect(MIGRATION).toMatch(/CREATE UNIQUE INDEX "uq_lms_review_moderation_review_ref_sequence"\s+ON "lms_course_review_moderation_events"\("review_ref", "sequence"\)/);
  });
});

describe('toModerationDto (D3, D4)', () => {
  const at = new Date('2026-10-03T00:00:00.000Z');

  it('a visible review reports no hide', () => {
    expect(toModerationDto({ isPublished: true, rating: 4, title: 'a', body: 'b' }, null)).toEqual({
      hidden_reason: null,
      hidden_at: null,
      hidden_before_reasons_recorded: false,
      edited_after_hide: false,
    });
  });

  it('a review hidden before reasons were recorded is labelled as such, never given a reason', () => {
    expect(toModerationDto({ isPublished: false, rating: 4, title: 'a', body: 'b' }, null)).toMatchObject({
      hidden_reason: null,
      hidden_before_reasons_recorded: true,
    });
  });

  it('an unchanged hidden review is not flagged as edited', () => {
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a', 'b', 4), ratingAtAction: 4, createdAt: at };
    expect(toModerationDto({ isPublished: false, rating: 4, title: 'a', body: 'b' }, latest).edited_after_hide).toBe(false);
  });

  it('a hidden review the learner edited afterwards is flagged', () => {
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a', 'b', 4), ratingAtAction: 4, createdAt: at };
    expect(toModerationDto({ isPublished: false, rating: 4, title: 'a', body: 'changed' }, latest).edited_after_hide).toBe(true);
  });

  it('a rating-only change after the hide (4 stars to 1, same text) is flagged', () => {
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a', 'b', 4), ratingAtAction: 4, createdAt: at };
    expect(toModerationDto({ isPublished: false, rating: 1, title: 'a', body: 'b' }, latest).edited_after_hide).toBe(true);
  });

  it('the content hash distinguishes a moved newline (title/body boundary)', () => {
    expect(reviewContentSha256('ab', 'c', 4)).not.toBe(reviewContentSha256('a', 'bc', 4));
  });

  it('release-gate r5 collision: ("a\\nb","c") and ("a","b\\nc") no longer hash alike, so the edit is flagged', () => {
    expect(reviewContentSha256('a\nb', 'c', 4)).not.toBe(reviewContentSha256('a', 'b\nc', 4));
    const latest = { action: 'hide', reason: 'offensive', contentSha256: reviewContentSha256('a\nb', 'c', 4), ratingAtAction: 4, createdAt: at };
    expect(toModerationDto({ isPublished: false, rating: 4, title: 'a', body: 'b\nc' }, latest).edited_after_hide).toBe(true);
  });

  it.each([
    ['separator characters moved between fields', ['a","b', 'c'], ['a', '","bc']],
    ['a JSON-looking title', ['["x"]', ''], ['', '["x"]']],
    ['empty title vs empty body', ['x', ''], ['', 'x']],
    ['title and body swapped', ['good', 'bad'], ['bad', 'good']],
  ])('no collision: %s', (_label, [t1, b1], [t2, b2]) => {
    expect(reviewContentSha256(t1!, b1!, 4)).not.toBe(reviewContentSha256(t2!, b2!, 4));
  });

  it('the rating is part of the fingerprint', () => {
    expect(reviewContentSha256('a', 'b', 4)).not.toBe(reviewContentSha256('a', 'b', 1));
  });

  it.each([
    ['surrounding whitespace (upsertReview trims)', ['  a ', '\tb\n'], ['a', 'b']],
    ['null and blank are the same stored value', [null, ''], ['', null]],
    ['composed and decomposed accents (NFC)', ['Caf\u00e9', 'b'], ['Cafe\u0301', 'b']],
  ])('canonical equivalence: %s', (_label, [t1, b1], [t2, b2]) => {
    expect(reviewContentSha256(t1 as string | null, b1 as string | null, 4)).toBe(reviewContentSha256(t2 as string | null, b2 as string | null, 4));
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
