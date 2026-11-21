-- GP-729: a rubric criterion is critical by a stored flag, not by its wording.
-- A failed critical criterion (points below max_points) fails the practical assessment.
ALTER TABLE "lms_rubric_criteria"
  ADD COLUMN "critical" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: freeze today's label rule into data. It is the JavaScript test
-- /\(\s*critical\s*\)/i that isCriticalCriterion applied: the exact marker "(critical)",
-- any case, optional whitespace inside the brackets. A conditional label such as
-- "(critical for the tap test)" stays false. The whitespace class lists the characters
-- JavaScript's \s matches, so the two rules select the same rows.
UPDATE "lms_rubric_criteria"
SET "critical" = true
WHERE "label" ~* '\([\s   -     　﻿]*critical[\s   -     　﻿]*\)';
