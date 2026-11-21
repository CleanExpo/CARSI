/**
 * Practical-assessment grading rule (GP-729). Pure and client-safe: the server
 * (reviewSubmission) and the admin review screen both call gradeRubric, so the
 * live "would pass" preview can never differ from the stored result.
 */

export type GradeRubricResult = {
  total: number;
  maxScore: number;
  /** Total as a percentage of maxScore (unrounded). */
  pct: number;
  /** Labels of critical criteria not met in full. */
  failedCriticalCriteria: string[];
  /** Total clears the threshold AND every critical criterion has full marks. */
  passed: boolean;
};

/** `scores` maps criterion id to points; a missing id counts as 0. */
export function gradeRubric(input: {
  criteria: { id: string; label: string; maxPoints: number; critical: boolean }[];
  scores: Record<string, number>;
  passThreshold: number;
}): GradeRubricResult {
  let total = 0;
  let maxScore = 0;
  const failedCriticalCriteria: string[] = [];
  for (const c of input.criteria) {
    const points = input.scores[c.id] ?? 0;
    total += points;
    maxScore += c.maxPoints;
    if (c.critical && points < c.maxPoints) {
      failedCriticalCriteria.push(c.label);
    }
  }
  const pct = maxScore > 0 ? (total / maxScore) * 100 : 0;
  return {
    total,
    maxScore,
    pct,
    failedCriticalCriteria,
    passed: pct >= input.passThreshold && failedCriticalCriteria.length === 0,
  };
}

/**
 * The admin review screen's live "would pass" projection. It is the server's own rule,
 * so a critical criterion below full points can never show Pass (GP-729).
 */
export function previewWouldPass(input: Parameters<typeof gradeRubric>[0]): boolean {
  return gradeRubric(input).passed;
}
