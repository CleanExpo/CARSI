import { isDeepStrictEqual } from 'node:util';

import { describe, expect, it, vi } from 'vitest';

import { AiCourseBuilderError, parseAiCourseBuilderInput } from './ai-course-builder';
import { buildDifferentialCases } from './ai-course-builder-zod3-cases';
import oracle from './ai-course-builder-zod3-oracle.json';

vi.mock('@/lib/admin/admin-session', () => ({
  getAdminSessionOrNull: async () => ({ id: 'test-admin' }),
}));

// Differential check of the zod 3 -> 4 upgrade: every case in ai-course-builder-zod3-cases.ts
// was run through the pre-upgrade source under zod 3.25.76 and its outcome recorded in the
// oracle (ok = parsed value, error = AiCourseBuilderError message and status, throws = any
// other exception, which the route answers with a 500). The current source must match all.
type Outcome =
  { ok: unknown } | { error: string; status: number } | { throws: string; message: string };

function outcome(input: unknown): Outcome {
  try {
    return { ok: parseAiCourseBuilderInput(input) };
  } catch (e) {
    if (e instanceof AiCourseBuilderError) return { error: e.message, status: e.status };
    const err = e as Error;
    return { throws: err.name, message: err.message };
  }
}

const expected = new Map<string, Outcome>();
for (const group of oracle.outcomes) {
  for (const name of group.cases) expected.set(name, group.outcome as Outcome);
}

describe('parseAiCourseBuilderInput matches the zod 3 source on every differential case', () => {
  const cases = buildDifferentialCases();

  it('covers exactly the recorded case set', () => {
    expect(cases).toHaveLength(oracle.cases);
    expect(new Set(cases.map(([name]) => name))).toEqual(new Set(expected.keys()));
  });

  it('gives the zod 3 outcome for every case', () => {
    const mismatches = cases
      .map(([name, input]) => ({ name, want: expected.get(name), got: outcome(input) }))
      .filter((r) => !isDeepStrictEqual(r.want, r.got));
    expect(mismatches).toEqual([]);
  });
});

describe('AI course builder route keeps the zod 3 status for a throwing numeric coercion', () => {
  it.each([
    ['object with toString null', '{"toString":null}'],
    ['array holding it', '[{"toString":null}]'],
  ])('module_count %s -> 500, never a 400 validation message', async (_label, moduleCount) => {
    const { POST } = await import('../../../app/api/lms/admin/ai-course-builder/route');
    const body = JSON.parse(
      `{"title":"Valid original course","course_outline":"An original Australian course outline with adequate detail.","module_count":${moduleCount}}`
    );
    const res = await POST({ json: async () => body } as never);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ detail: 'Failed to generate course content' });
  });
});
