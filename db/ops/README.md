# db/ops — reviewed SQL for the production database

The production database is DigitalOcean managed Postgres `carsi-db`. Files here run against it
through the **DB ops** workflow (`.github/workflows/db-ops.yml`), so nobody pastes the database
password into a chat, a terminal history or an agent session. The workflow reads it from the
`DATABASE_URL` GitHub Actions secret.

| Folder   | What may go here                      | How it runs                                                                                                                                                                                          |
| -------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `read/`  | Plain queries only (`SELECT`/`WITH`). | Only from `main`, after `db/ops/check-read-sql.py` passes, in a read-only session. Unattended when `DATABASE_URL_READONLY` is set; otherwise it waits for approval in `production-db`, like a write. |
| `write/` | Statements that change data.          | Only from `main`, inside one transaction, and only after a person approves the run in the `production-db` environment.                                                                               |

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
3. **Statement check (enforced).** `db/ops/check-read-sql.py` is a single-pass SQL lexer (comments,
   strings, dollar quotes and quoted identifiers handled the way PostgreSQL reads them). It runs
   before any connection and refuses a `read/` file unless every statement is a plain query: no
   `SET`, `COMMIT`, `DO`, writes, DDL, `set_config()`, server file functions, backslash commands,
   or learner tables and sensitive columns. Its regression cases, including every bypass found in
   review, are in `db/ops/test_check_read_sql.py` and run on every DB ops run.
4. **No psql for reads.** `db/ops/run-read.py` sends the SQL text only, in a `READ ONLY`
   transaction that is rolled back, so psql meta-commands cannot run at all. Without
   `DATABASE_URL_READONLY`, reads also wait for a person's approval in `production-db`.

**Run one:** Actions → DB ops → Run workflow → pick the file path (e.g. `db/ops/read/04-water-go-live-preflight.sql`).
The same files also work pasted into TablePlus.
