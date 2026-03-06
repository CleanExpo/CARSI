"""
004 — Course Idea Catalog + AI Outline

Revision ID: 004
Revises: 003
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- lms_course_ideas ----
    op.create_table(
        "lms_course_ideas",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("iicrc_discipline", sa.String(10), nullable=True),
        sa.Column(
            "suggested_by_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("vote_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(50), nullable=False, server_default=sa.text("'idea'")),
        sa.Column(
            "ai_outline",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
        sa.Column("ai_outline_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_lms_course_ideas_vote_count", "lms_course_ideas", ["vote_count"])

    # ---- lms_course_idea_votes ----
    op.create_table(
        "lms_course_idea_votes",
        sa.Column(
            "idea_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_course_ideas.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "voted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("lms_course_idea_votes")
    op.drop_index("ix_lms_course_ideas_vote_count", table_name="lms_course_ideas")
    op.drop_table("lms_course_ideas")
