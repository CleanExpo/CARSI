"""
003 — Gamification, Subscription, and IICRC CEC Reporting

Adds:
  - 4 new columns on lms_users (IICRC professional identity)
  - lms_xp_events      — XP award audit log
  - lms_user_levels    — per-student XP totals, level, streak
  - lms_subscriptions  — Stripe recurring subscription tracking
  - lms_cec_reports    — IICRC CEC email audit trail

Revision ID: 003
Revises: 002
Create Date: 2026-03-04
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- New columns on lms_users ----
    op.add_column("lms_users", sa.Column("iicrc_member_number", sa.String(20), nullable=True))
    op.add_column("lms_users", sa.Column("iicrc_card_image_url", sa.Text(), nullable=True))
    op.add_column("lms_users", sa.Column("iicrc_expiry_date", sa.Date(), nullable=True))
    op.add_column(
        "lms_users",
        sa.Column(
            "iicrc_certifications",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default="[]",
        ),
    )

    # ---- lms_xp_events ----
    op.create_table(
        "lms_xp_events",
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
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("xp_awarded", sa.Integer(), nullable=False),
        sa.Column(
            "earned_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_lms_xp_events_student_id", "lms_xp_events", ["student_id"])

    # ---- lms_user_levels ----
    op.create_table(
        "lms_user_levels",
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_level", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("current_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date(), nullable=True),
    )

    # ---- lms_subscriptions ----
    op.create_table(
        "lms_subscriptions",
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
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="trialling"),
        sa.Column("plan", sa.String(50), nullable=False, server_default="yearly"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_lms_subscriptions_student_id", "lms_subscriptions", ["student_id"]
    )

    # ---- lms_cec_reports ----
    op.create_table(
        "lms_cec_reports",
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
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_courses.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("iicrc_member_number", sa.String(20), nullable=False),
        sa.Column("email_to", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("lms_cec_reports")
    op.drop_table("lms_subscriptions")
    op.drop_table("lms_user_levels")
    op.drop_table("lms_xp_events")
    op.drop_column("lms_users", "iicrc_certifications")
    op.drop_column("lms_users", "iicrc_expiry_date")
    op.drop_column("lms_users", "iicrc_card_image_url")
    op.drop_column("lms_users", "iicrc_member_number")
