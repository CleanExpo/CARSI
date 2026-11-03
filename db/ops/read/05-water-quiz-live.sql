-- CARSI · 05 · READ-ONLY · What quiz the Water course has on the live site right now
-- Database: DigitalOcean managed Postgres "carsi-db". Changes nothing.
-- In TablePlus, run each query on its own (select it, then Cmd/Ctrl+Enter).

-- Q1. The quizzes attached to the Water course, with question and attempt counts.
--     The new course should end up with ONE set of quizzes. If an old quiz is still
--     attached after go-live, learners can't complete the course, so this is what we check.
SELECT q.id AS quiz_id, q.title, q.pass_percentage, q.attempts_allowed,
       (SELECT count(*) FROM lms_quiz_questions qq WHERE qq.quiz_id = q.id) AS questions,
       (SELECT count(*) FROM lms_quiz_attempts  qa WHERE qa.quiz_id = q.id) AS attempts,
       q.created_at
FROM lms_quizzes q
JOIN lms_courses c ON c.id = q.course_id
WHERE c.slug = 'water-damage-restoration-fundamentals'
ORDER BY q.created_at;

-- Q2. Structure of each quiz: question order only. Question text and
--     answers are deliberately NOT selected: DB ops logs are public, and printing them would
--     publish the assessment key. To read the questions themselves, open this course's quiz
--     in TablePlus or the admin screen, never through DB ops.
SELECT q.title AS quiz, qq.order_index + 1 AS question_no, qq.id AS question_id
FROM lms_quiz_questions qq
JOIN lms_quizzes q ON q.id = qq.quiz_id
JOIN lms_courses c ON c.id = q.course_id
WHERE c.slug = 'water-damage-restoration-fundamentals'
ORDER BY q.created_at, qq.order_index;
