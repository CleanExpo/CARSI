// GP-734: guards for the public-site trust breaks found in the 17/11/2026 stranger walk.
// Reads source text on purpose: these are copy and link defects, not logic.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');

describe('GP-734 trust breaks', () => {
  it('career-opportunity links point at the real /jobs board, not the 404 /hub/jobs', () => {
    const src = read('src/components/lms/CourseHubContext.tsx');
    expect(src).not.toContain('/hub/jobs');
    expect(src).toContain('href="/jobs"');
  });

  it('/ideas does not wait on an API that has no backing route', () => {
    const src = read('app/(public)/ideas/page.tsx');
    expect(src).not.toContain('/api/lms/ideas');
    expect(src).not.toMatch(/Loading…/);
  });

  it('course pages state GST on the single-course price', () => {
    const src = read('src/components/lms/CoursePublicDetail.tsx');
    expect(src).toContain('GST included');
  });

  it('course pages use the same name as /subscribe for the $795 plan', () => {
    const src = read('src/components/lms/CoursePublicDetail.tsx');
    expect(src).not.toContain('CARSI Pro');
    expect(src).toContain('Yearly membership');
  });

  it('Terms contact section gives an email address', () => {
    expect(read('app/(public)/terms/page.tsx')).toContain('support@carsi.com.au');
  });
});
