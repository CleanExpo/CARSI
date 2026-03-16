-- =============================================================================
-- CARSI Hub Phase 1 Schema — UNI-59
-- Tables: news_feed_sources, news_articles, professionals, job_listings,
--         industry_events
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RSS News Feed Pipeline
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS news_feed_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rss_url VARCHAR(1000) NOT NULL UNIQUE,
    industry_categories VARCHAR(100)[] NOT NULL DEFAULT '{}',
    fetch_interval_minutes INTEGER NOT NULL DEFAULT 60,
    last_fetched_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_feed_sources_active ON news_feed_sources(is_active) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID NOT NULL REFERENCES news_feed_sources(id) ON DELETE CASCADE,
    guid VARCHAR(1000) NOT NULL UNIQUE,
    original_title VARCHAR(1000) NOT NULL,
    ai_title VARCHAR(1000),
    ai_summary TEXT,
    ai_tags VARCHAR(100)[] NOT NULL DEFAULT '{}',
    industry_categories VARCHAR(100)[] NOT NULL DEFAULT '{}',
    relevance_score DECIMAL(4,3),
    source_url VARCHAR(2000),
    author VARCHAR(500),
    published_at TIMESTAMPTZ,
    image_url VARCHAR(2000),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published, published_at DESC) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_articles_categories ON news_articles USING GIN(industry_categories);
CREATE INDEX IF NOT EXISTS idx_news_articles_guid ON news_articles(guid);

-- ---------------------------------------------------------------------------
-- NRPG Professional Directory
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nrpg_member_id VARCHAR(255) UNIQUE,
    name VARCHAR(500) NOT NULL,
    business_name VARCHAR(500),
    email VARCHAR(500),
    phone VARCHAR(50),
    website VARCHAR(1000),
    bio TEXT,
    certifications TEXT[] NOT NULL DEFAULT '{}',
    certification_details JSONB NOT NULL DEFAULT '[]',
    industries VARCHAR(100)[] NOT NULL DEFAULT '{}',
    service_areas TEXT[] NOT NULL DEFAULT '{}',
    location_city VARCHAR(255),
    location_state VARCHAR(10),
    location_postcode VARCHAR(10),
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    nrpg_membership_tier VARCHAR(50),
    nrpg_membership_status VARCHAR(50) DEFAULT 'active',
    nrpg_synced_at TIMESTAMPTZ,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_professionals_nrpg_id ON professionals(nrpg_member_id) WHERE nrpg_member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_professionals_state ON professionals(location_state);
CREATE INDEX IF NOT EXISTS idx_professionals_industries ON professionals USING GIN(industries);
CREATE INDEX IF NOT EXISTS idx_professionals_published ON professionals(published) WHERE published = TRUE;

-- ---------------------------------------------------------------------------
-- Job Board
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    company_name VARCHAR(500) NOT NULL,
    company_website VARCHAR(1000),
    company_logo_url VARCHAR(2000),
    description TEXT NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    industry_categories VARCHAR(100)[] NOT NULL DEFAULT '{}',
    location_city VARCHAR(255),
    location_state VARCHAR(10),
    location_postcode VARCHAR(10),
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,
    salary_min INTEGER,
    salary_max INTEGER,
    apply_url VARCHAR(2000),
    apply_email VARCHAR(500),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),
    valid_through TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    submitter_name VARCHAR(500),
    submitter_email VARCHAR(500),
    submitter_phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT employment_type_valid CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'CASUAL', 'INTERNSHIP'))
);

CREATE INDEX IF NOT EXISTS idx_job_listings_published ON job_listings(published, valid_through) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_listings_valid_through ON job_listings(valid_through);
CREATE INDEX IF NOT EXISTS idx_job_listings_categories ON job_listings USING GIN(industry_categories);
CREATE INDEX IF NOT EXISTS idx_job_listings_state ON job_listings(location_state);

-- ---------------------------------------------------------------------------
-- Industry Events / Calendar
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS industry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    event_type VARCHAR(50) NOT NULL DEFAULT 'conference',
    industry_categories VARCHAR(100)[] NOT NULL DEFAULT '{}',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    location_name VARCHAR(255),
    location_address TEXT,
    lat DECIMAL(10,7),
    lng DECIMAL(10,7),
    is_virtual BOOLEAN NOT NULL DEFAULT FALSE,
    event_url VARCHAR(2000),
    organiser_name VARCHAR(500),
    organiser_url VARCHAR(2000),
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),
    schema_event_status VARCHAR(50) DEFAULT 'EventScheduled',
    ticket_url VARCHAR(2000),
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    price_range VARCHAR(255),
    image_url VARCHAR(2000),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT event_type_valid CHECK (event_type IN ('conference', 'training', 'webinar', 'workshop', 'tradeshow', 'networking'))
);

CREATE INDEX IF NOT EXISTS idx_industry_events_start ON industry_events(start_date);
CREATE INDEX IF NOT EXISTS idx_industry_events_published ON industry_events(published, start_date) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_industry_events_categories ON industry_events USING GIN(industry_categories);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER news_feed_sources_updated_at
    BEFORE UPDATE ON news_feed_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER professionals_updated_at
    BEFORE UPDATE ON professionals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER job_listings_updated_at
    BEFORE UPDATE ON job_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER industry_events_updated_at
    BEFORE UPDATE ON industry_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
