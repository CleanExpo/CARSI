-- CARSI · 04 · READ-ONLY · Pre-check before the Water Restoration Practitioner goes live
-- Database: DigitalOcean managed Postgres "carsi-db". Changes nothing.
-- Going live replaces this course's lessons. That wipes any learner's lesson progress
-- on it, so we check first whether anyone has any.

SELECT c.slug, c.title, c.status, c.is_published, c.price_aud,
       (SELECT count(*) FROM lms_enrollments e WHERE e.course_id = c.id) AS enrolments,
       (SELECT count(*) FROM lms_lesson_progress p
          JOIN lms_lessons l ON l.id = p.lesson_id
          JOIN lms_modules m ON m.id = l.module_id
         WHERE m.course_id = c.id)                                  AS progress_rows
FROM lms_courses c
WHERE c.slug = 'water-damage-restoration-fundamentals';

-- What it means:
--   no rows            -> the course isn't in the live database yet; going live creates it.
--   progress_rows = 0  -> safe; nobody loses anything.
--   progress_rows > 0  -> STOP. Send the numbers to Claude before anything else.
-- The go-live itself is not SQL: it is a seed command run from the repo (Rana's step),
-- once the Water promotion PR has merged.
