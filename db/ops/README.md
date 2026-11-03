# db/ops — reviewed SQL for the production database

The production database is DigitalOcean managed Postgres `carsi-db`. Files here run against it
through the **DB ops** workflow (`.github/workflows/db-ops.yml`), so nobody pastes the database
password into a chat, a terminal history or an agent session. The workflow reads it from the
`DATABASE_URL` GitHub Actions secret.

| Folder | What may go here | How it runs |
| --- | --- | --- |
| `read/` | Queries that only read. | Any time, in a read-only session (`default_transaction_read_only=on`), so a stray write fails instead of saving. |
| `write/` | Statements that change data. | Only from `main`, inside one transaction, and only after a person approves the run in the `production-db` environment. |

**This repository is public, and so are its Actions logs.** A `read/` query may return only
course, quiz and catalogue data or counts. It must never select learner names, emails, passwords,
payment ids or tokens. The workflow refuses a `read/` file that names `lms_users` or a column
called email, password, phone, token or stripe. That check is a backstop, not a substitute for
review: every file reaches `main` through a reviewed PR.

**Run one:** Actions → DB ops → Run workflow → pick the file path (e.g. `db/ops/read/04-water-go-live-preflight.sql`).
The same files also work pasted into TablePlus.
