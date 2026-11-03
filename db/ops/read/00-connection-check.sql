-- CARSI · 00 · READ-ONLY · Can the db-ops job reach the production database?
SELECT current_database() AS database, now() AS server_time,
       (SELECT count(*) FROM lms_courses) AS courses;
