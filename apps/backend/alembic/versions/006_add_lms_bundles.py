"""
006 — Course Bundles

Industry-tagged course bundles with pricing. Junction table links bundles
to courses with display ordering.

Revision ID: 006
Revises: 005
Create Date: 2026-03-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "lms_bundles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("slug", sa.String(200), nullable=False, unique=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price_aud", sa.Numeric(10, 2), nullable=False),
        sa.Column("original_price_aud", sa.Numeric(10, 2), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("industry_tag", sa.String(100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_lms_bundles_slug", "lms_bundles", ["slug"], unique=True)

    op.create_table(
        "lms_bundle_courses",
        sa.Column(
            "bundle_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_bundles.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "course_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lms_courses.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column("display_order", sa.Integer, server_default="0"),
    )
    op.create_index(
        "ix_lms_bundle_courses_bundle_id", "lms_bundle_courses", ["bundle_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_lms_bundle_courses_bundle_id", table_name="lms_bundle_courses")
    op.drop_table("lms_bundle_courses")
    op.drop_index("ix_lms_bundles_slug", table_name="lms_bundles")
    op.drop_table("lms_bundles")
