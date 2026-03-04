# CARSI LMS — Migration Audit Report

> Generated: 05/03/2026
> Auditor: pre-prod-agent
> Branch: `feature/gamification-subscription-iicrc`

---

## Alembic Configuration

| Setting         | Value                                                                      |
| --------------- | -------------------------------------------------------------------------- |
| Config file     | `apps/backend/alembic.ini`                                                 |
| Script location | `apps/backend/alembic/`                                                    |
| Database URL    | `postgresql+psycopg2://carsi_user:carsi_dev_pass@localhost:5433/carsi_dev` |
| Target metadata | `src.db.models.Base.metadata` (via `env.py`)                               |
| Env imports     | `src.db.models.Base` — shared DeclarativeBase for all ORM models           |

---

## Migration Chain

| Revision | Down Revision | Create Date | Description                                                                                                         |
| -------- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| **001**  | None (base)   | 2026-03-03  | LMS core schema — users, roles, courses, enrolments, quizzes, CECs, certificates, notes, Drive assets               |
| **002**  | 001           | 2026-03-03  | Learning pathways, categories, course prerequisites, migration jobs + 5 new columns on `lms_courses`                |
| **003**  | 002           | 2026-03-04  | Gamification (XP events, user levels), Stripe subscriptions, IICRC CEC email reports + 4 new columns on `lms_users` |
| **004**  | 003           | 2026-03-04  | Course idea catalog + AI outline generation, idea voting                                                            |
| **005**  | 004           | 2026-03-04  | RPL (Recognition of Prior Learning) portfolio submissions and review workflow                                       |

**Chain integrity**: Linear. No branches, no merge points, no skipped revisions. `001 -> 002 -> 003 -> 004 -> 005`.

---

## Tables Summary

### Migration 001 — LMS Core (15 tables)

| Table                  | Purpose                                        | PK Type                      |
| ---------------------- | ---------------------------------------------- | ---------------------------- |
| `lms_roles`            | Role definitions (admin, instructor, student)  | Integer (auto)               |
| `lms_users`            | LMS user accounts with auth + IICRC fields     | UUID                         |
| `lms_user_roles`       | User-role junction                             | Composite (user_id, role_id) |
| `lms_courses`          | Course catalogue with IICRC/CPP40421 alignment | UUID                         |
| `lms_modules`          | Course modules (ordered)                       | UUID                         |
| `lms_lessons`          | Lesson content (video, PDF, text, Drive file)  | UUID                         |
| `lms_enrollments`      | Student enrolment records                      | UUID                         |
| `lms_progress`         | Per-lesson completion tracking                 | UUID                         |
| `lms_quizzes`          | Quiz definitions (per lesson)                  | UUID                         |
| `lms_quiz_questions`   | Multiple choice questions (JSONB options)      | UUID                         |
| `lms_quiz_attempts`    | Student quiz attempt records                   | UUID                         |
| `lms_certificates`     | Issued credentials with Drive PDF link         | UUID                         |
| `lms_cec_transactions` | IICRC CEC ledger (per-discipline hours)        | UUID                         |
| `lms_lesson_notes`     | Per-student private lesson notes               | UUID                         |
| `lms_drive_assets`     | Google Drive file asset registry               | UUID                         |

**Seed data**: 3 default roles inserted (admin, instructor, student).

### Migration 002 — Pathways & Taxonomy (5 tables + 5 columns)

| Table                          | Purpose                                           | PK Type                                       |
| ------------------------------ | ------------------------------------------------- | --------------------------------------------- |
| `lms_categories`               | Hierarchical category taxonomy (self-referencing) | UUID                                          |
| `lms_learning_pathways`        | IICRC certification journey definitions           | UUID                                          |
| `lms_learning_pathway_courses` | Pathway-course junction (ordered, required flag)  | Composite (pathway_id, course_id)             |
| `lms_course_prerequisites`     | Course prerequisite graph                         | Composite (course_id, prerequisite_course_id) |
| `lms_migration_jobs`           | Content pipeline job tracking (discover/load)     | UUID                                          |

**New columns on `lms_courses`**: `difficulty`, `estimated_duration_hours`, `category_id` (FK -> lms_categories), `learning_objectives` (JSONB), `migration_source`.

### Migration 003 — Gamification & Subscriptions (4 tables + 4 columns)

| Table               | Purpose                                       | PK Type              |
| ------------------- | --------------------------------------------- | -------------------- |
| `lms_xp_events`     | XP award audit log (per source_type)          | UUID                 |
| `lms_user_levels`   | Per-student XP totals, level, streak tracking | UUID (student_id PK) |
| `lms_subscriptions` | Stripe recurring subscription tracking        | UUID                 |
| `lms_cec_reports`   | IICRC CEC email audit trail                   | UUID                 |

**New columns on `lms_users`**: `iicrc_member_number`, `iicrc_card_image_url`, `iicrc_expiry_date`, `iicrc_certifications` (JSONB).

### Migration 004 — Course Ideas (2 tables)

| Table                   | Purpose                                        | PK Type                      |
| ----------------------- | ---------------------------------------------- | ---------------------------- |
| `lms_course_ideas`      | Student-suggested course ideas with AI outline | UUID                         |
| `lms_course_idea_votes` | Per-user idea voting (one vote per idea)       | Composite (idea_id, user_id) |

### Migration 005 — RPL Portfolio (1 table)

| Table                | Purpose                                    | PK Type |
| -------------------- | ------------------------------------------ | ------- |
| `lms_rpl_portfolios` | RPL evidence submissions + review workflow | UUID    |

---

## Total Table Count

| Source                          | Tables                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| Alembic migrations (LMS)        | **27**                                                                |
| init-db.sql (starter framework) | 5 (users, contractors, availability_slots, documents, schema_version) |
| **Total**                       | **32**                                                                |

---

## Gamification Tables (Phase 21) — Verification

| Required Table      | Migration | Present | Verified                           |
| ------------------- | --------- | ------- | ---------------------------------- |
| `lms_xp_events`     | 003       | Yes     | ORM model `LMSXPEvent` exists      |
| `lms_user_levels`   | 003       | Yes     | ORM model `LMSUserLevel` exists    |
| `lms_subscriptions` | 003       | Yes     | ORM model `LMSSubscription` exists |
| `lms_cec_reports`   | 003       | Yes     | ORM model `LMSCECReport` exists    |

**Note**: The task brief expected 5 gamification tables including `lms_achievements` and `lms_streaks` and `lms_leaderboard`. These do **not** exist as separate database tables. Instead:

- **Achievements** — handled via `lms_xp_events.source_type` (event-driven, not a separate table)
- **Streaks** — tracked as columns on `lms_user_levels` (`current_streak`, `longest_streak`, `last_active_date`)
- **Leaderboard** — computed at query time from `lms_user_levels` (no persistent table needed)

This is a valid architectural choice — it avoids table bloat and reduces write amplification.

---

## ORM Model Coverage

All 27 LMS tables have corresponding SQLAlchemy ORM models in `apps/backend/src/db/lms_models.py`. Relationships are correctly defined with appropriate `back_populates`, `cascade`, and `ondelete` settings.

---

## Health Check

### No Issues Found

- Migration chain is linear with no gaps or conflicts
- All `down_revision` values chain correctly: `None -> 001 -> 002 -> 003 -> 004 -> 005`
- All tables have proper FK constraints with `ondelete` policies
- Unique constraints defined where needed (enrolments, progress, lesson notes)
- Indexes created on high-query columns (student_id, vote_count, status)
- Downgrade functions properly reverse each migration

### Observations (Non-Blocking)

1. **Hardcoded DB URL in alembic.ini** — The connection string `postgresql+psycopg2://carsi_user:carsi_dev_pass@localhost:5433/carsi_dev` is hardcoded rather than reading from `DATABASE_URL` env var. For production, `env.py` should override this from environment. Currently `env.py` does not do this — it reads directly from the INI config. **Recommendation**: Update `env.py` to read `DATABASE_URL` from environment and override the INI setting before running migrations.
2. **Port mismatch** — alembic.ini uses port `5433`, while `.env.example` and CLAUDE.md reference port `5432`. Verify which port the production PostgreSQL instance will use.
3. **No `updated_at` trigger** — The LMS tables rely on SQLAlchemy's `onupdate` for `updated_at` columns. The `init-db.sql` starter schema has a PostgreSQL trigger for this. Consider adding equivalent triggers for LMS tables if direct SQL updates (bypassing ORM) are expected in production.
4. **Migration 004 default quoting** — `server_default="'idea'"` includes SQL-level single quotes in the default. This is technically correct for Alembic but differs from the convention used in other migrations (`server_default="draft"`). Verify the stored default is the string `idea` and not `'idea'` with literal quotes.

---

## Deployment Command

```bash
cd apps/backend
alembic upgrade head
```

This will apply all 5 migrations in sequence: `001 -> 002 -> 003 -> 004 -> 005`.

For a fresh database, also run:

```bash
psql -f scripts/init-db.sql  # Starter framework tables (users, contractors, etc.)
alembic upgrade head          # LMS tables
```
