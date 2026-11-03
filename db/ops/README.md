# db/ops — reviewed SQL for the production database

The production database is DigitalOcean managed Postgres `carsi-db`. Files here run against it
through the **DB ops** workflow (`.github/workflows/db-ops.yml`), so nobody pastes the database
password into a chat, a terminal history or an agent session. The workflow reads it from the
`DATABASE_URL` GitHub Actions secret.

| Folder   | What may go here             | How it runs                                                                                                              |
| -------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `read/`  | Queries that only read.      | Only from `main`, in a read-only session (`default_transaction_read_only=on`), so a stray write fails instead of saving. |
| `write/` | Statements that change data. | Only from `main`, inside one transaction, and only after a person approves the run in the `production-db` environment.   |

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
3. **Text check (backstop only).** The workflow refuses a `read/` file that names `lms_users` or a
   column called email, password, phone, token or stripe. Dynamic SQL can get past a text check,
   so it is not a control on its own.

**Run one:** Actions → DB ops → Run workflow → pick the file path (e.g. `db/ops/read/04-water-go-live-preflight.sql`).
The same files also work pasted into TablePlus.
