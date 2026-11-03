# db/ops — reviewed SQL for the production database

The production database is DigitalOcean managed Postgres `carsi-db`. Files here run against it
through the **DB ops** workflow (`.github/workflows/db-ops.yml`), so nobody pastes the database
password into a chat, a terminal history or an agent session. The workflow reads it from the
`DATABASE_URL` GitHub Actions secret.

| Folder   | What may go here                       | How it runs                                                                                                                                                         |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read/`  | Plain queries over allowlisted tables. | Only from `main`, after `db/ops/check-read-sql.py` passes, in a `READ ONLY` transaction (`db/ops/run-read.py`), after a person approves the run in `production-db`. |
| `write/` | Statements that change data.           | Only from `main`, in one transaction (`db/ops/run-write.py`), after a person approves the run in `production-db`.                                                   |

**This repository is public, and so are its Actions logs.** A `read/` query may return only
course, quiz and catalogue metadata or counts. It must never select learner names, emails,
passwords, payment ids or tokens, nor quiz questions or answers. Three controls protect this, in
order of strength:

1. **Provenance (enforced).** The workflow runs a file only from `main`, so every query has passed
   a reviewed PR. SQL written on a side branch never reaches the database.
2. **Least privilege (recommended, founder/ops to set up).** Add a `DATABASE_URL_READONLY` secret
   for a Postgres role with `SELECT` on course and quiz tables only, and none on `lms_users` or other
   learner tables. When it is set, read files connect as that role, so even a query that slipped
   through review cannot read learner data.
3. **Table allowlist and statement check (enforced).** `db/ops/check-read-sql.py` is a single-pass
   SQL lexer that runs before any connection. A `read/` file may only contain plain queries
   (`SELECT`/`WITH`/`TABLE`/`VALUES`) over the tables on its `ALLOWED_TABLES` list. Every other table
   named in `prisma/schema.prisma` and every `pg_*` catalog name is refused, as are learner ids, quiz
   content (question text, options, answers), a bare `*`, row/table serialisers (`table_to_xml`,
   `row_to_json`, `json_agg`), `&` (escaped names), writes, `SET`/`COMMIT`/`DO`, and backslash
   commands. Regression cases for every bypass found in review are in
   `db/ops/test_check_read_sql.py`; they run on every DB ops run.
4. **No psql, and a person approves every run.** `run-read.py` and `run-write.py` (psycopg) send
   the SQL text only, so psql meta-commands cannot run. Every run, read or write, waits for approval
   in `production-db`, where the approver sees which file is about to run.

**Run one:** Actions → DB ops → Run workflow → pick the file path (e.g. `db/ops/read/04-water-go-live-preflight.sql`).
The same files also work pasted into TablePlus.
