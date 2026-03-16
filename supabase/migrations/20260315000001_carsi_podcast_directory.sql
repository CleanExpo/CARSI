-- =============================================================================
-- CARSI Hub — Podcast Directory Schema (UNI-72)
-- Tables: podcast_shows, podcast_episodes
-- RSS-driven directory: CARSI own productions + industry podcasts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Podcast Shows (the directory of podcasts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS podcast_shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identification
    slug VARCHAR(255) NOT NULL UNIQUE,          -- URL-friendly identifier
    name VARCHAR(500) NOT NULL,
    host VARCHAR(500),                          -- Host name(s)
    description TEXT,

    -- External links
    rss_url VARCHAR(2000),                      -- RSS feed for auto-sync
    spotify_url VARCHAR(2000),
    apple_podcasts_url VARCHAR(2000),
    youtube_url VARCHAR(2000),
    amazon_music_url VARCHAR(2000),
    website_url VARCHAR(2000),

    -- Media
    cover_image_url VARCHAR(2000),

    -- Stats (populated by RSS sync)
    episode_count INTEGER,
    latest_episode_title VARCHAR(1000),
    latest_episode_date TIMESTAMPTZ,
    latest_episode_url VARCHAR(2000),

    -- Classification
    industry_categories VARCHAR(100)[] NOT NULL DEFAULT '{}',
    tags VARCHAR(100)[] NOT NULL DEFAULT '{}',
    country VARCHAR(10) NOT NULL DEFAULT 'AU',   -- ISO 3166-1 alpha-2

    -- Flags
    is_carsi_show BOOLEAN NOT NULL DEFAULT FALSE,  -- CARSI own production
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,

    -- Sync tracking
    rss_synced_at TIMESTAMPTZ,
    rss_error TEXT,                             -- last RSS fetch error if any

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcast_shows_published
    ON podcast_shows(published, is_carsi_show DESC, featured DESC) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_podcast_shows_categories
    ON podcast_shows USING GIN(industry_categories);
CREATE INDEX IF NOT EXISTS idx_podcast_shows_slug
    ON podcast_shows(slug);

-- ---------------------------------------------------------------------------
-- Podcast Episodes (fetched via RSS, linked to a show)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS podcast_episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID NOT NULL REFERENCES podcast_shows(id) ON DELETE CASCADE,

    -- RSS-sourced fields
    guid VARCHAR(2000) NOT NULL,                -- RSS item guid for dedup
    title VARCHAR(1000) NOT NULL,
    description TEXT,
    episode_url VARCHAR(2000),                  -- Link to episode page
    audio_url VARCHAR(2000),                    -- Direct audio file
    image_url VARCHAR(2000),
    duration_seconds INTEGER,
    episode_number INTEGER,
    season_number INTEGER,
    published_at TIMESTAMPTZ,

    -- Classification (from RSS + AI tagging)
    tags VARCHAR(100)[] NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (show_id, guid)
);

CREATE INDEX IF NOT EXISTS idx_podcast_episodes_show
    ON podcast_episodes(show_id, published_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger for podcast_shows
-- ---------------------------------------------------------------------------

CREATE TRIGGER podcast_shows_updated_at
    BEFORE UPDATE ON podcast_shows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
