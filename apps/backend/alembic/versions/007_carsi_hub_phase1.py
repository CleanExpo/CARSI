"""
007 — CARSI Hub Phase 1 Tables

Creates: industry_events, professionals, job_listings, news_feed_sources, news_articles.
Adds GIN indexes for JSONB category arrays, UNIQUE constraints, and rollback-safe downgrade.
Seeds news_feed_sources with 20+ AU industry RSS feeds.

Revision ID: 007
Revises: 006
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # industry_events
    # ------------------------------------------------------------------
    op.create_table(
        "industry_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("location_name", sa.String(255), nullable=True),
        sa.Column("location_city", sa.String(100), nullable=True),
        sa.Column("location_state", sa.String(10), nullable=True),
        sa.Column("location_address", sa.String(500), nullable=True),
        sa.Column("location_lat", sa.String(20), nullable=True),
        sa.Column("location_lng", sa.String(20), nullable=True),
        sa.Column("is_virtual", sa.Boolean, server_default="false", nullable=False),
        sa.Column("organiser_name", sa.String(255), nullable=True),
        sa.Column("organiser_url", sa.String(1000), nullable=True),
        sa.Column("event_url", sa.String(1000), nullable=True),
        sa.Column("ticket_url", sa.String(1000), nullable=True),
        sa.Column("schema_event_status", sa.String(50), server_default="EventScheduled", nullable=False),
        sa.Column("image_url", sa.String(1000), nullable=True),
        sa.Column("is_free", sa.Boolean, nullable=True),
        sa.Column("price_range", sa.String(100), nullable=True),
        sa.Column("source", sa.String(50), server_default="manual", nullable=False),
        sa.Column("source_id", sa.String(255), nullable=True),
        sa.Column("published", sa.Boolean, server_default="false", nullable=False),
        sa.Column("featured", sa.Boolean, server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "event_type IN ('conference','training','webinar','workshop','networking','other')",
            name="ck_industry_events_event_type",
        ),
        sa.CheckConstraint(
            "end_date IS NULL OR end_date >= start_date",
            name="ck_industry_events_event_dates",
        ),
    )
    op.create_index("ix_industry_events_start_date", "industry_events", ["start_date"])
    op.create_index("ix_industry_events_event_type", "industry_events", ["event_type"])
    op.create_index("ix_industry_events_published", "industry_events", ["published"])
    op.create_index(
        "ix_industry_events_categories_gin",
        "industry_events",
        ["industry_categories"],
        postgresql_using="gin",
    )
    op.create_index(
        "uix_industry_events_source_dedup",
        "industry_events",
        ["source", "source_id"],
        unique=True,
        postgresql_where=sa.text("source_id IS NOT NULL"),
    )

    # ------------------------------------------------------------------
    # professionals
    # ------------------------------------------------------------------
    op.create_table(
        "professionals",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False, unique=True),
        sa.Column("headline", sa.String(500), nullable=True),
        sa.Column("bio", sa.Text, nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("website", sa.String(1000), nullable=True),
        sa.Column("linkedin_url", sa.String(1000), nullable=True),
        sa.Column("avatar_url", sa.String(1000), nullable=True),
        sa.Column("location_city", sa.String(100), nullable=True),
        sa.Column("location_state", sa.String(10), nullable=True),
        sa.Column(
            "specialisations",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "certifications",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("nrpg_member", sa.Boolean, server_default="false", nullable=False),
        sa.Column("nrpg_member_id", sa.String(100), nullable=True, unique=True),
        sa.Column("years_experience", sa.Integer, nullable=True),
        sa.Column("published", sa.Boolean, server_default="false", nullable=False),
        sa.Column("featured", sa.Boolean, server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_professionals_slug", "professionals", ["slug"], unique=True)
    op.create_index("ix_professionals_published", "professionals", ["published"])
    op.create_index(
        "ix_professionals_specialisations_gin",
        "professionals",
        ["specialisations"],
        postgresql_using="gin",
    )

    # ------------------------------------------------------------------
    # job_listings
    # ------------------------------------------------------------------
    op.create_table(
        "job_listings",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("company_website", sa.String(1000), nullable=True),
        sa.Column("company_logo_url", sa.String(1000), nullable=True),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("employment_type", sa.String(50), server_default="FULL_TIME", nullable=False),
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("location_city", sa.String(100), nullable=True),
        sa.Column("location_state", sa.String(10), nullable=True),
        sa.Column("location_postcode", sa.String(10), nullable=True),
        sa.Column("is_remote", sa.Boolean, server_default="false", nullable=False),
        sa.Column("salary_min", sa.Integer, nullable=True),
        sa.Column("salary_max", sa.Integer, nullable=True),
        sa.Column("apply_url", sa.String(1000), nullable=True),
        sa.Column("apply_email", sa.String(255), nullable=True),
        sa.Column("submitter_name", sa.String(255), nullable=False),
        sa.Column("submitter_email", sa.String(255), nullable=False),
        sa.Column("submitter_phone", sa.String(50), nullable=True),
        sa.Column("source", sa.String(50), server_default="manual", nullable=False),
        sa.Column("source_id", sa.String(255), nullable=True),
        sa.Column("valid_through", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published", sa.Boolean, server_default="false", nullable=False),
        sa.Column("featured", sa.Boolean, server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "employment_type IN ('FULL_TIME','PART_TIME','CONTRACTOR','CASUAL','INTERNSHIP')",
            name="ck_job_listings_employment_type",
        ),
        sa.CheckConstraint(
            "apply_url IS NOT NULL OR apply_email IS NOT NULL",
            name="ck_job_listings_apply_method",
        ),
    )
    op.create_index("ix_job_listings_valid_through", "job_listings", ["valid_through"])
    op.create_index("ix_job_listings_published", "job_listings", ["published"])
    op.create_index(
        "ix_job_listings_categories_gin",
        "job_listings",
        ["industry_categories"],
        postgresql_using="gin",
    )

    # ------------------------------------------------------------------
    # news_feed_sources
    # ------------------------------------------------------------------
    op.create_table(
        "news_feed_sources",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("rss_url", sa.String(1000), nullable=False, unique=True),
        sa.Column("website_url", sa.String(1000), nullable=True),
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("fetch_interval_minutes", sa.Integer, server_default="60", nullable=False),
        sa.Column("last_fetched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default="true", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_news_feed_sources_rss_url", "news_feed_sources", ["rss_url"], unique=True)
    op.create_index("ix_news_feed_sources_is_active", "news_feed_sources", ["is_active"])

    # ------------------------------------------------------------------
    # news_articles
    # ------------------------------------------------------------------
    op.create_table(
        "news_articles",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "source_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("news_feed_sources.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("guid", sa.String(1000), nullable=False, unique=True),
        sa.Column("original_title", sa.String(1000), nullable=False),
        sa.Column("source_url", sa.String(2000), nullable=False),
        sa.Column("author", sa.String(255), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("image_url", sa.String(2000), nullable=True),
        sa.Column("ai_title", sa.String(1000), nullable=True),
        sa.Column("ai_summary", sa.Text, nullable=True),
        sa.Column(
            "ai_tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="[]",
        ),
        sa.Column("relevance_score", sa.Float, nullable=True),
        sa.Column("is_featured", sa.Boolean, server_default="false", nullable=False),
        sa.Column("published", sa.Boolean, server_default="false", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_news_articles_guid", "news_articles", ["guid"], unique=True)
    op.create_index("ix_news_articles_source_id", "news_articles", ["source_id"])
    op.create_index("ix_news_articles_published_at", "news_articles", ["published_at"])
    op.create_index("ix_news_articles_published", "news_articles", ["published"])
    op.create_index(
        "ix_news_articles_categories_gin",
        "news_articles",
        ["industry_categories"],
        postgresql_using="gin",
    )

    # ------------------------------------------------------------------
    # Seed: 20+ AU industry RSS sources
    # ------------------------------------------------------------------
    op.execute("""
        INSERT INTO news_feed_sources (name, rss_url, website_url, industry_categories, fetch_interval_minutes) VALUES
        ('R&R Magazine',              'https://www.randrmagonline.com/rss',                     'https://www.randrmagonline.com',              '["Restoration","Water Damage","Fire Restoration","Mould Remediation"]', 60),
        ('Restoration & Remediation', 'https://www.randrmag.com/rss.xml',                       'https://www.randrmag.com',                   '["Restoration","Mould Remediation","Indoor Air Quality"]', 60),
        ('AIRAH News',                'https://www.airah.org.au/news/rss',                      'https://www.airah.org.au',                   '["HVAC","Indoor Air Quality","Standards & Compliance"]', 120),
        ('HIA News',                  'https://hia.com.au/about/newsroom/rss',                  'https://hia.com.au',                         '["Building & Construction","Standards & Compliance"]', 120),
        ('Master Builders Australia', 'https://www.masterbuilders.com.au/rss',                  'https://www.masterbuilders.com.au',          '["Building & Construction","Standards & Compliance"]', 120),
        ('Floor Covering News',       'https://www.floorcoveringnews.net/rss.xml',              'https://www.floorcoveringnews.net',           '["Flooring","Carpet & Upholstery Cleaning"]', 60),
        ('Floor Covering Weekly',     'https://www.floorcoveringweekly.com/main/rss',           'https://www.floorcoveringweekly.com',         '["Flooring"]', 60),
        ('IAQ.net News',              'https://www.iaq.net/news/rss',                           'https://www.iaq.net',                        '["Indoor Air Quality","Mould Remediation"]', 120),
        ('IICRC News',                'https://www.iicrc.org/news/rss',                         'https://www.iicrc.org',                      '["Restoration","Standards & Compliance","Water Damage"]', 240),
        ('Insurance Business AU',     'https://www.insurancebusinessmag.com/au/rss/all',        'https://www.insurancebusinessmag.com/au',     '["Insurance & Claims"]', 60),
        ('The Underwriter',           'https://www.theunderwriter.com.au/rss',                  'https://www.theunderwriter.com.au',          '["Insurance & Claims"]', 60),
        ('Sourceable',                'https://sourceable.net/feed/',                           'https://sourceable.net',                     '["Building & Construction","Standards & Compliance"]', 120),
        ('Architecture & Design AU',  'https://www.architectureanddesign.com.au/rss',           'https://www.architectureanddesign.com.au',   '["Building & Construction"]', 240),
        ('Pest Manager Magazine',     'https://www.pestmanagermag.com.au/rss',                  'https://www.pestmanagermag.com.au',          '["Pest Control"]', 120),
        ('Pest Control Technology',   'https://www.pctonline.com/rss.aspx',                     'https://www.pctonline.com',                  '["Pest Control"]', 120),
        ('ProRestore Products',       'https://www.prorestore.com/news/rss',                    'https://www.prorestore.com',                 '["Restoration","Water Damage","Fire Restoration"]', 240),
        ('Cleaning & Maintenance Mgmt', 'https://www.cmmonline.com/rss',                        'https://www.cmmonline.com',                  '["Carpet & Upholstery Cleaning","Flooring"]', 60),
        ('BuildingGreen',             'https://www.buildinggreen.com/rss.xml',                  'https://www.buildinggreen.com',              '["Building & Construction","Indoor Air Quality","Standards & Compliance"]', 240),
        ('Disaster Recovery Journal', 'https://www.drj.com/rss.xml',                           'https://www.drj.com',                        '["Restoration","Insurance & Claims"]', 120),
        ('Claims Journal',            'https://www.claimsjournal.com/rss/recent.xml',           'https://www.claimsjournal.com',              '["Insurance & Claims"]', 60),
        ('Safety+Health Magazine',    'https://www.safetyandhealthmagazine.com/rss.xml',        'https://www.safetyandhealthmagazine.com',    '["Standards & Compliance","Indoor Air Quality"]', 240),
        ('WorkSafe Australia',        'https://www.safeworkaustralia.gov.au/news-events/rss',   'https://www.safeworkaustralia.gov.au',       '["Standards & Compliance"]', 480),
        ('Standards Australia',       'https://www.standards.org.au/news-and-media/rss',        'https://www.standards.org.au',               '["Standards & Compliance"]', 480)
        ON CONFLICT (rss_url) DO NOTHING;
    """)


def downgrade() -> None:
    # Remove seed data first (handled by CASCADE on news_articles)
    op.execute("DELETE FROM news_articles;")
    op.execute("DELETE FROM news_feed_sources;")

    op.drop_index("ix_news_articles_categories_gin", table_name="news_articles")
    op.drop_index("ix_news_articles_published", table_name="news_articles")
    op.drop_index("ix_news_articles_published_at", table_name="news_articles")
    op.drop_index("ix_news_articles_source_id", table_name="news_articles")
    op.drop_index("ix_news_articles_guid", table_name="news_articles")
    op.drop_table("news_articles")

    op.drop_index("ix_news_feed_sources_is_active", table_name="news_feed_sources")
    op.drop_index("ix_news_feed_sources_rss_url", table_name="news_feed_sources")
    op.drop_table("news_feed_sources")

    op.drop_index("ix_job_listings_categories_gin", table_name="job_listings")
    op.drop_index("ix_job_listings_published", table_name="job_listings")
    op.drop_index("ix_job_listings_valid_through", table_name="job_listings")
    op.drop_table("job_listings")

    op.drop_index("ix_professionals_specialisations_gin", table_name="professionals")
    op.drop_index("ix_professionals_published", table_name="professionals")
    op.drop_index("ix_professionals_slug", table_name="professionals")
    op.drop_table("professionals")

    op.drop_index("uix_industry_events_source_dedup", table_name="industry_events")
    op.drop_index("ix_industry_events_categories_gin", table_name="industry_events")
    op.drop_index("ix_industry_events_published", table_name="industry_events")
    op.drop_index("ix_industry_events_event_type", table_name="industry_events")
    op.drop_index("ix_industry_events_start_date", table_name="industry_events")
    op.drop_table("industry_events")
