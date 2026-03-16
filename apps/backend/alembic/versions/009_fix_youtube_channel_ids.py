"""
009 — Fix YouTube Channel IDs (UNI-71 QA fix)

Replaces 7 placeholder youtube_channel_id values seeded in migration 008
with verified real channel IDs or unpublishes channels where no verified
YouTube presence was found.

Actions:
- AIOH: update to verified ID UCWT1sXYvJ8eGK3DQVgGIB4Q (@TheAIOH)
- Insurance Council of Australia: update to verified ID UCozGv4KY7KjZzzoOH3_bzCA (@insurancecouncil)
- Injection Drying Australia → renamed Drymatic: update to verified ID UC2XJzHGnLB9444NKDvHKYrA (@drymatic)
- Healthy Homes Australia: update to UCJB-eyFNMCPBUt6olIpUDIg (@healthyhomesaustralia2451) [medium confidence]
- Pestex Australia: unpublish (no verified YouTube channel found)
- Mould Remediation Pro: unpublish (no verified YouTube channel found)
- Cleaning Pros Australia: unpublish (no verified YouTube channel found)

Revision ID: 009
Revises: 008
Create Date: 2026-03-14
"""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Fix AIOH — verified HIGH confidence
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCWT1sXYvJ8eGK3DQVgGIB4Q',
            channel_url        = 'https://www.youtube.com/@TheAIOH',
            custom_url         = '@TheAIOH',
            name               = 'AIOH — Australian Institute of Occupational Hygienists'
        WHERE youtube_channel_id = 'UC_IndoorAirQuality'
        """
    )

    # Fix Insurance Council of Australia — verified HIGH confidence
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCozGv4KY7KjZzzoOH3_bzCA',
            channel_url        = 'https://www.youtube.com/user/insurancecouncil',
            custom_url         = '@insurancecouncil',
            name               = 'Insurance Council of Australia'
        WHERE youtube_channel_id = 'UCInsuranceClaims_AU'
        """
    )

    # Fix Injection Drying Australia → Drymatic — verified HIGH confidence
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UC2XJzHGnLB9444NKDvHKYrA',
            channel_url        = 'https://www.youtube.com/@drymatic',
            custom_url         = '@drymatic',
            name               = 'Drymatic — Heat Drying Australia',
            description        = 'Drymatic Heat Drying Australia — instructional content for restorers on how to use Drymatic heat drying and injection drying equipment for structural drying and water damage restoration.'
        WHERE youtube_channel_id = 'UCRestorationEquip'
        """
    )

    # Fix Healthy Homes Australia — MEDIUM confidence (wellness focus, not IAQ-specific)
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCJB-eyFNMCPBUt6olIpUDIg',
            channel_url        = 'https://www.youtube.com/@healthyhomesaustralia2451',
            custom_url         = '@healthyhomesaustralia2451',
            name               = 'Healthy Homes Australia'
        WHERE youtube_channel_id = 'UCHealthyHomes_AU'
        """
    )

    # Unpublish channels with no verified YouTube presence
    op.execute(
        """
        UPDATE youtube_channels
        SET published = false
        WHERE youtube_channel_id IN (
            'UCPestControl_AU',
            'UCMouldRemediation',
            'UCCarpetCleaning_Pro'
        )
        """
    )


def downgrade() -> None:
    # Restore placeholders
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UC_IndoorAirQuality',
            channel_url        = 'https://www.youtube.com/@AIOH',
            custom_url         = '@AIOH',
            name               = 'AIOH — Australian Institute of Occupational Hygienists'
        WHERE youtube_channel_id = 'UCWT1sXYvJ8eGK3DQVgGIB4Q'
        """
    )
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCInsuranceClaims_AU',
            channel_url        = 'https://www.youtube.com/@ICAaustralia',
            custom_url         = '@ICAaustralia',
            name               = 'Insurance Council of Australia'
        WHERE youtube_channel_id = 'UCozGv4KY7KjZzzoOH3_bzCA'
        """
    )
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCRestorationEquip',
            channel_url        = 'https://www.youtube.com/@InjectionDryingAustralia',
            custom_url         = '@InjectionDryingAustralia',
            name               = 'Injection Drying Australia'
        WHERE youtube_channel_id = 'UC2XJzHGnLB9444NKDvHKYrA'
        """
    )
    op.execute(
        """
        UPDATE youtube_channels
        SET
            youtube_channel_id = 'UCHealthyHomes_AU',
            channel_url        = 'https://www.youtube.com/@HealthyHomesAustralia',
            custom_url         = '@HealthyHomesAustralia',
            name               = 'Healthy Homes Australia'
        WHERE youtube_channel_id = 'UCJB-eyFNMCPBUt6olIpUDIg'
        """
    )
    op.execute(
        """
        UPDATE youtube_channels
        SET published = true
        WHERE youtube_channel_id IN (
            'UCPestControl_AU',
            'UCMouldRemediation',
            'UCCarpetCleaning_Pro'
        )
        """
    )
