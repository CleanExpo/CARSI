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

-- Q2. Every question in those quizzes, in order, with the correct answer spelled out.
SELECT q.title AS quiz, qq.order_index + 1 AS question_no, qq.question_text,
       qq.options->>qq.correct_index AS correct_answer,
       qq.options AS all_options
FROM lms_quiz_questions qq
JOIN lms_quizzes q ON q.id = qq.quiz_id
JOIN lms_courses c ON c.id = q.course_id
WHERE c.slug = 'water-damage-restoration-fundamentals'
ORDER BY q.created_at, qq.order_index;
