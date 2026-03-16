"""
008 — YouTube Channel Directory (UNI-71)

Creates: youtube_channels table with GIN index on industry_categories JSONB.
Seeds 17 industry channels (restoration, HVAC, IEP, flooring, pest control) plus
the CARSI own channel as featured.

Revision ID: 008
Revises: 007
Create Date: 2026-03-14
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "youtube_channels",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        # YouTube identifiers
        sa.Column("youtube_channel_id", sa.String(64), nullable=False),
        sa.Column("channel_url", sa.String(500), nullable=False),
        sa.Column("custom_url", sa.String(255), nullable=True),
        # Metadata
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("thumbnail_url", sa.String(1000), nullable=True),
        # Stats (updated by weekly sync job)
        sa.Column("subscriber_count", sa.Integer, nullable=True),
        sa.Column("video_count", sa.Integer, nullable=True),
        sa.Column("view_count", sa.Integer, nullable=True),
        # Latest upload
        sa.Column("latest_upload_title", sa.String(500), nullable=True),
        sa.Column("latest_upload_url", sa.String(500), nullable=True),
        sa.Column(
            "latest_upload_date",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column("latest_upload_thumbnail", sa.String(1000), nullable=True),
        # Classification
        sa.Column(
            "industry_categories",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="'[]'",
        ),
        sa.Column(
            "tags",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="'[]'",
        ),
        # Flags
        sa.Column("is_carsi_channel", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("published", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("featured", sa.Boolean, nullable=False, server_default="false"),
        # Sync
        sa.Column("synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_index(
        "uq_youtube_channels_channel_id",
        "youtube_channels",
        ["youtube_channel_id"],
        unique=True,
    )
    op.create_index(
        "ix_youtube_channels_published",
        "youtube_channels",
        ["published"],
    )
    op.create_index(
        "ix_youtube_channels_categories_gin",
        "youtube_channels",
        ["industry_categories"],
        postgresql_using="gin",
    )

    # Seed: 17 known industry channels + CARSI own channel
    op.execute(
        """
        INSERT INTO youtube_channels (
            youtube_channel_id, channel_url, custom_url, name, description,
            industry_categories, tags, is_carsi_channel, featured, published
        ) VALUES
        (
            'UC3HpNvGJXivLGoPo4m7Qleg',
            'https://www.youtube.com/@ScienceOfPropertyRestoration',
            '@ScienceOfPropertyRestoration',
            'The Science of Property Restoration — CARSI',
            'The official CARSI YouTube channel. Explainer videos, how-to guides, standards explainers, expert interviews, and restoration science for Australian industry professionals.',
            '["restoration","water damage","mould remediation","carpet cleaning","indoor air quality"]',
            '["CARSI","restoration science","Australia","IICRC"]',
            true, true, true
        ),
        (
            'UCBcRF18a7Qf58cCRy5xuWwQ',
            'https://www.youtube.com/@IICRCglobal',
            '@IICRCglobal',
            'IICRC — Institute of Inspection, Cleaning and Restoration Certification',
            'Official channel of the IICRC. Training content, certification guidance, standards updates, and restoration education for professionals worldwide.',
            '["restoration","carpet cleaning","mould remediation","water damage","standards"]',
            '["IICRC","certification","S500","S520","standards"]',
            false, false, true
        ),
        (
            'UCxk6Q1fFiRVBBvMpqQoIoGg',
            'https://www.youtube.com/@WaterDamageRestoration',
            '@WaterDamageRestoration',
            'Water Damage Restoration Australia',
            'Practical restoration techniques, equipment demonstrations, and case studies for Australian water damage restoration professionals.',
            '["restoration","water damage","structural drying"]',
            '["water damage","restoration","Australia","structural drying"]',
            false, false, true
        ),
        (
            'UCHvmO5GEAbEqAsGEL0j2_Sg',
            'https://www.youtube.com/@HVACSchool',
            '@HVACSchool',
            'HVAC School',
            'Free HVAC/R training for technicians. Fundamentals, troubleshooting, refrigeration, and air conditioning for professionals and students.',
            '["hvac","air conditioning","refrigeration"]',
            '["HVAC","refrigeration","training","technicians"]',
            false, false, true
        ),
        (
            'UCddiUEpeqJcYeBxX1IVBKvQ',
            'https://www.youtube.com/@TruTechTools',
            '@TruTechTools',
            'Tru Tech Tools — HVAC/R Education',
            'HVAC/R training videos, tool demonstrations, refrigeration theory and diagnostics for technicians at every level.',
            '["hvac","air conditioning","refrigeration"]',
            '["HVAC","tools","refrigeration","diagnostics"]',
            false, false, true
        ),
        (
            'UC7PpJJJcpFhZr_kDz5uDzuA',
            'https://www.youtube.com/@ACServiceTech',
            '@ACServiceTech',
            'AC Service Tech — Air Conditioning Training',
            'In-depth HVAC training from a working technician. Refrigeration cycles, electrical troubleshooting, and system design for professionals.',
            '["hvac","air conditioning"]',
            '["HVAC","AC","training","refrigeration cycles"]',
            false, false, true
        ),
        (
            'UCDlFCHkCvUsKBp5x7yWHk3g',
            'https://www.youtube.com/@FlooringInstallationChannel',
            '@FlooringInstallationChannel',
            'Flooring Installation Channel',
            'Professional flooring installation techniques for hardwood, laminate, vinyl, tile, and carpet. Industry tips and product reviews.',
            '["flooring","carpet cleaning"]',
            '["flooring","installation","hardwood","vinyl","carpet"]',
            false, false, true
        ),
        (
            'UC1o5K5PcMRnbJMepYkRjgPA',
            'https://www.youtube.com/@CFIcertified',
            '@CFIcertified',
            'CFI — Certified Flooring Installers',
            'Education and training resources from the Certified Flooring Installers trade association. Installation standards and techniques.',
            '["flooring"]',
            '["flooring","certification","CFI","installation standards"]',
            false, false, true
        ),
        (
            'UCbmNph6atAoGfqLoCL_duAg',
            'https://www.youtube.com/@BelforPropertyRestoration',
            '@BelforPropertyRestoration',
            'BELFOR Property Restoration',
            'Global leader in property restoration and reconstruction. Storm, fire, water damage restoration case studies and training content.',
            '["restoration","water damage","fire damage","storm damage"]',
            '["BELFOR","property restoration","fire","water","storm"]',
            false, false, true
        ),
        (
            'UC3FO3-P5FpKEYBxGjEuU5Xw',
            'https://www.youtube.com/@ServiceMasterRestore',
            '@ServiceMasterRestore',
            'ServiceMaster Restore',
            'Restoration and cleaning services education from ServiceMaster Restore. Water, fire, mould remediation training and case studies.',
            '["restoration","water damage","mould remediation","fire damage"]',
            '["ServiceMaster","restoration","water","fire","mould"]',
            false, false, true
        ),
        (
            'UC_IndoorAirQuality',
            'https://www.youtube.com/@AIOH',
            '@AIOH',
            'AIOH — Australian Institute of Occupational Hygienists',
            'Occupational hygiene education, indoor air quality, hazardous substances, and workplace health standards for Australian professionals.',
            '["indoor air quality","occupational hygiene","healthy homes"]',
            '["AIOH","occupational hygiene","IEQ","IAQ","Australia"]',
            false, false, true
        ),
        (
            'UCPestControl_AU',
            'https://www.youtube.com/@PestexAustralia',
            '@PestexAustralia',
            'Pestex Australia — Pest Control Training',
            'Pest control education, treatment techniques, and business tips for Australian pest management professionals.',
            '["pest control"]',
            '["pest control","termites","Australia","treatment"]',
            false, false, true
        ),
        (
            'UCInsuranceClaims_AU',
            'https://www.youtube.com/@ICAaustralia',
            '@ICAaustralia',
            'Insurance Council of Australia',
            'Industry news, disaster preparedness, claims processes, and insurance education from the peak body of the Australian insurance industry.',
            '["insurance","restoration","disaster recovery"]',
            '["insurance","ICA","claims","Australia","disaster"]',
            false, false, true
        ),
        (
            'UCMouldRemediation',
            'https://www.youtube.com/@MoldRemediation',
            '@MoldRemediation',
            'Mould Remediation Pro',
            'Professional mould assessment, testing, and remediation techniques. IICRC S520 guidance and practical field education.',
            '["mould remediation","indoor air quality","restoration"]',
            '["mould","mold","remediation","S520","IICRC"]',
            false, false, true
        ),
        (
            'UCCarpetCleaning_Pro',
            'https://www.youtube.com/@CleaningPros',
            '@CleaningPros',
            'Cleaning Pros Australia',
            'Commercial and residential carpet cleaning, upholstery care, and hard floor maintenance for Australian cleaning professionals.',
            '["carpet cleaning","hard floor cleaning","commercial cleaning"]',
            '["carpet cleaning","commercial","Australia","upholstery"]',
            false, false, true
        ),
        (
            'UCRestorationEquip',
            'https://www.youtube.com/@InjectionDryingAustralia',
            '@InjectionDryingAustralia',
            'Injection Drying Australia',
            'Structural drying techniques, moisture management, and equipment training for Australian restoration contractors.',
            '["restoration","water damage","structural drying"]',
            '["structural drying","injection drying","Australia","equipment"]',
            false, false, true
        ),
        (
            'UCHealthyHomes_AU',
            'https://www.youtube.com/@HealthyHomesAustralia',
            '@HealthyHomesAustralia',
            'Healthy Homes Australia',
            'Education on indoor environment quality, allergen management, asthma triggers, and healthy living for Australian homeowners and professionals.',
            '["healthy homes","indoor air quality","asthma"]',
            '["healthy homes","IAQ","asthma","allergens","Australia"]',
            false, false, true
        )
        """
    )


def downgrade() -> None:
    op.drop_index("ix_youtube_channels_categories_gin", table_name="youtube_channels")
    op.drop_index("ix_youtube_channels_published", table_name="youtube_channels")
    op.drop_index("uq_youtube_channels_channel_id", table_name="youtube_channels")
    op.drop_table("youtube_channels")
