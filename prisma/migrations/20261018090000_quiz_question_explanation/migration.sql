-- Practitioner-authored explanation shown to a learner after a wrong answer (nullable, additive).
ALTER TABLE "lms_quiz_questions" ADD COLUMN "explanation" TEXT;
