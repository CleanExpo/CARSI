-- CARSI · 06 · READ-ONLY · Orphan quizzes on the Water course (blocks completion)
-- Database: DigitalOcean managed Postgres "carsi-db". Changes nothing.
-- After quiz seed, every quiz on this course must be one of the seven approved ids below.
-- Any other row (e.g. retired draft 459ef333-f67e-5516-a2ed-cb2426b27916) blocks learners.

SELECT q.id, q.title, q.pass_percentage, q.created_at,
       (SELECT count(*) FROM lms_quiz_attempts a WHERE a.quiz_id = q.id) AS attempts
FROM lms_quizzes q
JOIN lms_courses c ON c.id = q.course_id
WHERE c.slug = 'water-damage-restoration-fundamentals'
  AND q.id NOT IN (
    '8874f437-a8ad-4c2c-bcdb-6dbf36c108a0',
    '9860fee3-daf0-4007-92b7-93229547a9d8',
    '618e4230-aa48-4ed6-977b-2389f20971e2',
    'eb442750-ac7a-4baf-bac4-fd6db0f7f30c',
    'ed90b217-493e-4dc0-93ac-87e51e86451c',
    '6220f5b8-3191-4701-8811-b1714153388b',
    'e7798876-961d-4e4c-a2f0-f91ded4cc2d1'
  );

-- No rows = OK. Any row = STOP; send output to Phill before announcing go-live.
