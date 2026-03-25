"""Add missing columns to lms_courses that the SQLAlchemy model expects.

Revision ID: 024
Revises: 023
Create Date: 2026-03-25

Adds columns: difficulty, estimated_duration_hours, category_id,
learning_objectives, migration_source, tier
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "024"
down_revision = "023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lms_courses", sa.Column("difficulty", sa.String(50), nullable=True))
    op.add_column(
        "lms_courses",
        sa.Column("estimated_duration_hours", sa.Numeric(5, 1), nullable=True),
    )
    op.add_column(
        "lms_courses",
        sa.Column(
            "category_id",
            UUID(as_uuid=True),
            sa.ForeignKey("lms_categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "lms_courses",
        sa.Column("learning_objectives", JSONB, nullable=True, server_default="[]"),
    )
    op.add_column(
        "lms_courses",
        sa.Column("migration_source", sa.String(50), nullable=True),
    )
    op.add_column(
        "lms_courses",
        sa.Column("tier", sa.String(50), nullable=False, server_default="foundation"),
    )

    # Also publish all draft courses so the course listing works
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
