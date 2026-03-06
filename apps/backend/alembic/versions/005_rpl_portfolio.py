"""
005 — RPL Portfolio

Students submit evidence of prior learning mapped to CPP40421 unit codes.
Instructors/admins review and approve/reject each submission.

Revision ID: 005
Revises: 004
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lms_rpl_portfolios",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        # CPP40421 unit being claimed
        sa.Column("unit_code", sa.String(20), nullable=False),
        sa.Column("unit_name", sa.String(255), nullable=False),
        # Evidence provided by the student
        sa.Column("evidence_description", sa.Text, nullable=False),
        sa.Column(
            "evidence_urls",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'"),
        ),
        # Review workflow
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'pending'")),
        # pending | under_review | approved | rejected
        sa.Column(
            "reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("reviewer_notes", sa.Text, nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_lms_rpl_portfolios_student_id", "lms_rpl_portfolios", ["student_id"]
    )
    op.create_index(
        "ix_lms_rpl_portfolios_status", "lms_rpl_portfolios", ["status"]
    )


def downgrade() -> None:
    op.drop_index("ix_lms_rpl_portfolios_status", table_name="lms_rpl_portfolios")
    op.drop_index("ix_lms_rpl_portfolios_student_id", table_name="lms_rpl_portfolios")
    op.drop_table("lms_rpl_portfolios")
