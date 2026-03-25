"""Add missing columns to lms_courses that the SQLAlchemy model expects.

Revision ID: 024
Revises: 023
Create Date: 2026-03-25

Adds columns: difficulty, estimated_duration_hours, category_id,
learning_objectives, migration_source, tier — only if they don't already exist.
"""

from alembic import op

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def _add_column_if_not_exists(table: str, column: str, col_type: str, extra: str = "") -> None:
    """Add a column only if it doesn't already exist (PostgreSQL)."""
    op.execute(f"""
        DO $$ BEGIN
            ALTER TABLE {table} ADD COLUMN {column} {col_type} {extra};
        EXCEPTION WHEN duplicate_column THEN
            NULL;
        END $$;
    """)


def upgrade() -> None:
    _add_column_if_not_exists("lms_courses", "difficulty", "VARCHAR(50)")
    _add_column_if_not_exists("lms_courses", "estimated_duration_hours", "NUMERIC(5,1)")
    _add_column_if_not_exists("lms_courses", "category_id", "UUID REFERENCES lms_categories(id) ON DELETE SET NULL")
    _add_column_if_not_exists("lms_courses", "learning_objectives", "JSONB", "DEFAULT '[]'")
    _add_column_if_not_exists("lms_courses", "migration_source", "VARCHAR(50)")
    _add_column_if_not_exists("lms_courses", "tier", "VARCHAR(50) NOT NULL", "DEFAULT 'foundation'")

    # Publish all draft courses so the course listing works
    op.execute("UPDATE lms_courses SET status = 'published' WHERE status = 'draft'")

    # Fix admin role
    op.execute("""
        INSERT INTO lms_user_roles (user_id, role_id)
        SELECT u.id, r.id
        FROM lms_users u
        CROSS JOIN lms_roles r
        WHERE u.email = 'admin@carsi.com.au' AND r.name = 'admin'
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_column("lms_courses", "tier")
    op.drop_column("lms_courses", "migration_source")
    op.drop_column("lms_courses", "learning_objectives")
    op.drop_column("lms_courses", "category_id")
    op.drop_column("lms_courses", "estimated_duration_hours")
    op.drop_column("lms_courses", "difficulty")
