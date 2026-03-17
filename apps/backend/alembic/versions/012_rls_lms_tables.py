"""
012 — RLS for LMS tables

Enable PostgreSQL Row Level Security on the six core LMS tables that contain
per-student data. Uses a service-role bypass pattern: the application's DB user
(starter_user) and postgres superuser each receive an unrestricted USING/WITH CHECK
policy, so existing SQLAlchemy queries are completely unaffected.

Future direct-connection roles (e.g. reporting read-only users) will be blocked by
default and must have explicit policies added.

Revision ID: 012
Revises: 011
"""

from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None

_TABLES = [
    "lms_enrollments",
    "lms_progress",
    "lms_quiz_attempts",
    "lms_credentials",
    "lms_notes",
    "lms_xp_events",
]


def upgrade() -> None:
    for table in _TABLES:
        # Enable RLS — queries from roles without a matching policy are denied
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")

        # FastAPI application user — unrestricted (all operations, all rows)
        op.execute(
            f"""
            CREATE POLICY app_service_full_access ON {table}
              FOR ALL TO starter_user
              USING (true)
              WITH CHECK (true)
            """
        )

        # Postgres superuser — bypass for migrations and maintenance
        op.execute(
            f"""
            CREATE POLICY superuser_bypass ON {table}
              FOR ALL TO postgres
              USING (true)
              WITH CHECK (true)
            """
        )


def downgrade() -> None:
    for table in reversed(_TABLES):
        op.execute(f'DROP POLICY IF EXISTS app_service_full_access ON {table}')
        op.execute(f'DROP POLICY IF EXISTS superuser_bypass ON {table}')
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
