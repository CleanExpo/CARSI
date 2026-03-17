"""Phase C6: Add onboarding columns to lms_users.

Revision ID: 019
Revises: 018
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE lms_users
        ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE
    """)
    op.execute("""
        ALTER TABLE lms_users
        ADD COLUMN IF NOT EXISTS recommended_pathway VARCHAR(50)
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE lms_users DROP COLUMN IF EXISTS recommended_pathway")
    op.execute("ALTER TABLE lms_users DROP COLUMN IF EXISTS onboarding_completed")
