"""Tests for check-read-sql.py: python3 db/ops/test_check_read_sql.py (exit 1 on any failure).

Each REFUSE case is a real bypass reported in review (#999) or a write/exfiltration pattern;
each ALLOW case is a legitimate query whose comments or strings merely contain those words.
"""
import importlib.util
import pathlib
import sys

here = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("check", here / "check-read-sql.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)

REFUSE = {
    "gexec on the same line": "SELECT 'SET default_transaction_read_only = off' \\gexec\n",
    "shell on the same line": "SELECT 1 \\! env\n",
    "comment marker inside a string hides a write": "SELECT '/*';\nUPDATE t SET a=1;\nSELECT '*/';\n",
    "quoted set_config": "SELECT \"set_config\"('default_transaction_read_only','off',false);\n",
    "E-string escape hides a write": "SELECT E'\\'';\nUPDATE t SET a=2;\nSELECT 1;\n",
    "dollar quotes around a write": "SELECT $$ x $$; DELETE FROM t; SELECT $a$ ; $a$;\n",
    "nested comment": "/* a /* b */ c */ UPDATE t SET a=3;\n",
    "data-modifying CTE": "WITH x AS (UPDATE t SET a=4 RETURNING 1) SELECT * FROM x;\n",
    "EXPLAIN ANALYZE write": "EXPLAIN ANALYZE DELETE FROM t;\n",
    "SELECT INTO": "SELECT * INTO u FROM t;\n",
    "SET then write": "SET default_transaction_read_only = off;\nUPDATE t SET a=5;\n",
    "COMMIT mid-file": "SELECT 1; COMMIT; SELECT 2;\n",
    "DO block": "DO $$ BEGIN PERFORM 1; END $$;\n",
    "unterminated string": "SELECT 'abc;\n",
    "learner table": "SELECT \"email\" FROM \"lms_users\";\n",
    "server file read": "SELECT pg_read_file('/etc/passwd');\n",
    "table not on the allowlist": "SELECT id FROM admin_users;\n",
    "schema-qualified non-allowlisted table": "SELECT id FROM \"public\".\"lms_team_invites\";\n",
    "table_to_xml dump": "SELECT table_to_xml('lms_courses', true, false, '');\n",
    "row_to_json dump": "SELECT row_to_json(c) FROM lms_courses c;\n",
    "U& escaped identifier": "SELECT 1 FROM U&\"lms\\005fusers\";\n",
    "bare star": "SELECT * FROM lms_courses;\n",
    "quiz answers": "SELECT question_text, correct_index FROM lms_quiz_questions;\n",
    "learner ids": "SELECT student_id FROM lms_enrollments;\n",
    "catalog view": "SELECT query FROM pg_stat_activity;\n",
}
ALLOW = {
    "words inside strings and comments": "SELECT 'drop; update /* -- ' AS a, \"title\" FROM t; -- delete\n",
    "plain join with counts": "SELECT c.slug, (SELECT count(*) FROM m WHERE m.c = c.id) FROM c;\n",
    "allowed tables with counts": "SELECT c.slug, count(*) FROM lms_courses c JOIN lms_modules m ON m.course_id = c.id GROUP BY c.slug;\n",
}

WRITE_REFUSE = {
    "write file with a shell escape": "UPDATE t SET a = 1;\n\\! env\n",
    "write file with gexec": "SELECT 'DROP TABLE t' \\gexec\n",
}

failed = 0
for name, sql in REFUSE.items():
    if not check.problems(sql):
        print(f"FAIL (allowed, should refuse): {name}")
        failed += 1
for name, sql in ALLOW.items():
    if check.problems(sql):
        print(f"FAIL (refused, should allow): {name}: {check.problems(sql)}")
        failed += 1
for name, sql in WRITE_REFUSE.items():
    if not check.write_problems(sql):
        print(f"FAIL (write file allowed, should refuse): {name}")
        failed += 1
for f in sorted((here / "write").glob("*.sql")):
    if check.write_problems(f.read_text(encoding="utf-8")):
        print(f"FAIL (real write file refused): {f.name}")
        failed += 1
for f in sorted((here / "read").glob("*.sql")):
    if check.problems(f.read_text(encoding="utf-8")):
        print(f"FAIL (real read file refused): {f.name}")
        failed += 1
print(f"{len(REFUSE)} refuse + {len(ALLOW)} allow + {len(WRITE_REFUSE)} write cases, {failed} failed")
sys.exit(1 if failed else 0)
