-- =============================================================================
-- NodeJS-Starter-V1 Database Initialization
-- PostgreSQL 15 with pgvector
-- Self-contained - No external dependencies
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- =============================================================================
-- SECTION 1: Authentication Schema (Simple JWT-based auth)
-- =============================================================================

-- Users table for JWT authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt hash
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_login_at TIMESTAMPTZ,

    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for auth
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- =============================================================================
-- SECTION 2: Helper Functions
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SECTION 3: Business Schema (Contractor Availability)
-- =============================================================================

-- Custom ENUM types
CREATE TYPE australian_state AS ENUM ('QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT');
CREATE TYPE availability_status AS ENUM ('available', 'booked', 'tentative', 'unavailable');

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- Optional link to user account
    name VARCHAR(100) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    abn VARCHAR(20),
    email VARCHAR(255),
    specialisation VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Australian mobile format: 04XX XXX XXX
    CONSTRAINT mobile_format CHECK (mobile ~ '^04\\d{2} \\d{3} \\d{3}$'),
    -- Australian ABN format: XX XXX XXX XXX
    CONSTRAINT abn_format CHECK (abn IS NULL OR abn ~ '^\\d{2} \\d{3} \\d{3} \\d{3}$')
);

-- Availability slots table
CREATE TABLE IF NOT EXISTS availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contractor_id UUID NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    suburb VARCHAR(100) NOT NULL,
    state australian_state NOT NULL DEFAULT 'QLD',
    postcode VARCHAR(10),
    status availability_status DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT end_after_start CHECK (end_time > start_time)
);

-- Triggers for updated_at
CREATE TRIGGER contractors_updated_at
    BEFORE UPDATE ON contractors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER availability_slots_updated_at
    BEFORE UPDATE ON availability_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for contractors
CREATE INDEX IF NOT EXISTS idx_contractors_mobile ON contractors(mobile);
CREATE INDEX IF NOT EXISTS idx_contractors_abn ON contractors(abn);
CREATE INDEX IF NOT EXISTS idx_contractors_user_id ON contractors(user_id);

-- Indexes for availability
CREATE INDEX IF NOT EXISTS idx_availability_contractor ON availability_slots(contractor_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_contractor_date_status ON availability_slots(contractor_id, date, status);
CREATE INDEX IF NOT EXISTS idx_availability_location ON availability_slots(suburb, state);
CREATE INDEX IF NOT EXISTS idx_availability_status ON availability_slots(status);

-- =============================================================================
-- SECTION 4: AI/Embeddings Support (pgvector)
-- =============================================================================

-- Documents table for RAG/semantic search
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- OpenAI/Anthropic embedding dimension
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for vector similarity search
CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_created ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_metadata ON documents USING GIN (metadata);

-- Trigger for documents
CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SECTION 5: Seed Data (Default Admin User)
-- =============================================================================

-- Insert default admin user
-- Password: "admin123" (bcrypt hash)
-- IMPORTANT: Change this password immediately in production!
INSERT INTO users (email, password_hash, full_name, is_admin)
VALUES (
    'admin@local.dev',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Y7R.PZCjJxWe',  -- "admin123"
    'System Administrator',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

-- =============================================================================
-- SECTION 6: Utility Views
-- =============================================================================

-- View for available contractors (users can query this)
CREATE OR REPLACE VIEW available_contractors AS
SELECT
    c.id,
    c.name,
    c.mobile,
    c.specialisation,
    COUNT(a.id) AS available_slots,
    MIN(a.date) AS next_available_date
FROM contractors c
LEFT JOIN availability_slots a ON c.id = a.contractor_id
    AND a.status = 'available'
    AND a.date >= CURRENT_DATE
GROUP BY c.id, c.name, c.mobile, c.specialisation;

-- =============================================================================
-- SECTION 7: Database Metadata
-- =============================================================================

-- Track database version for migration management
CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(50) PRIMARY KEY,
    description TEXT,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

INSERT INTO schema_version (version, description)
VALUES ('1.0.0-init', 'Initial self-contained database setup')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- SECTION N: CARSI Hub — Research Articles CMS
-- =============================================================================

-- Article publication status enum
DO $$ BEGIN
    CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Research articles table
-- Supports rich-text content, FAQ schema (FAQPage), SEO metadata, and NRPG author linkage.
CREATE TABLE IF NOT EXISTS research_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(300) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,

    category VARCHAR(100),
    tags JSONB NOT NULL DEFAULT '[]',

    seo_title VARCHAR(70),
    seo_description VARCHAR(160),
    canonical_url VARCHAR(500),
    og_image_url VARCHAR(500),

    -- FAQPage structured data: array of {"question": "...", "answer": "..."} objects
    faq_items JSONB NOT NULL DEFAULT '[]',

    -- NRPG author linkage (nullable until UNI-59 NRPG API integration)
    author_nrpg_id VARCHAR(100),
    author_name VARCHAR(255),
    author_bio TEXT,

    -- Related RestoreAssist features: array of {"feature": "...", "url": "..."} objects
    related_restore_assist JSONB NOT NULL DEFAULT '[]',

    status article_status NOT NULL DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_research_articles_slug ON research_articles(slug);
CREATE INDEX IF NOT EXISTS idx_research_articles_status ON research_articles(status);
CREATE INDEX IF NOT EXISTS idx_research_articles_category ON research_articles(category);
CREATE INDEX IF NOT EXISTS idx_research_articles_published ON research_articles(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_research_articles_author_nrpg ON research_articles(author_nrpg_id) WHERE author_nrpg_id IS NOT NULL;

CREATE TRIGGER research_articles_updated_at
    BEFORE UPDATE ON research_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO schema_version (version, description)
VALUES ('1.1.0-carsi-articles', 'CARSI Hub Research Articles CMS + FAQ Schema')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- CARSI Hub Phase 1: Industry Calendar (UNI-68)
-- =============================================================================

CREATE TABLE IF NOT EXISTS industry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'conference',
    industry_categories JSONB NOT NULL DEFAULT '[]',

    -- Dates
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,

    -- Location
    location_name VARCHAR(255),
    location_address TEXT,
    location_city VARCHAR(100),
    location_state VARCHAR(10),
    location_lat VARCHAR(20),
    location_lng VARCHAR(20),
    is_virtual BOOLEAN NOT NULL DEFAULT FALSE,

    -- Organiser
    organiser_name VARCHAR(255),
    organiser_url VARCHAR(1000),
    event_url VARCHAR(1000),

    -- Schema.org event status
    schema_event_status VARCHAR(50) NOT NULL DEFAULT 'EventScheduled',

    -- Ticketing
    ticket_url VARCHAR(1000),
    is_free BOOLEAN NOT NULL DEFAULT FALSE,
    price_range VARCHAR(100),

    -- Media
    image_url VARCHAR(1000),

    -- Source
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),

    -- Publication
    published BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_event_type CHECK (event_type IN ('conference', 'training', 'webinar', 'workshop', 'networking', 'other')),
    CONSTRAINT valid_event_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_industry_events_start_date ON industry_events(start_date ASC);
CREATE INDEX IF NOT EXISTS idx_industry_events_published ON industry_events(published, start_date ASC) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_industry_events_type ON industry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_industry_events_categories ON industry_events USING GIN(industry_categories);
CREATE UNIQUE INDEX IF NOT EXISTS idx_industry_events_source_dedup ON industry_events(source, source_id) WHERE source_id IS NOT NULL;

CREATE TRIGGER industry_events_updated_at
    BEFORE UPDATE ON industry_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- CARSI Hub Phase 1: Job Board (UNI-67)
-- =============================================================================

CREATE TABLE IF NOT EXISTS job_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(1000),
    company_logo_url VARCHAR(1000),
    description TEXT NOT NULL,
    employment_type VARCHAR(50) NOT NULL DEFAULT 'FULL_TIME',
    industry_categories JSONB NOT NULL DEFAULT '[]',

    -- Location
    location_city VARCHAR(100),
    location_state VARCHAR(10),
    location_postcode VARCHAR(10),
    is_remote BOOLEAN NOT NULL DEFAULT FALSE,

    -- Compensation
    salary_min INTEGER,
    salary_max INTEGER,

    -- Application
    apply_url VARCHAR(1000),
    apply_email VARCHAR(255),

    -- Submitter
    submitter_name VARCHAR(255),
    submitter_email VARCHAR(255),
    submitter_phone VARCHAR(50),

    -- Source
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_id VARCHAR(255),

    -- 30-day auto-expiry
    valid_through TIMESTAMPTZ NOT NULL,

    -- Publication (manual approval required)
    published BOOLEAN NOT NULL DEFAULT FALSE,
    featured BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    CONSTRAINT valid_employment_type CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'CASUAL', 'INTERNSHIP')),
    CONSTRAINT valid_apply_method CHECK (apply_url IS NOT NULL OR apply_email IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_job_listings_published ON job_listings(published, valid_through) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_job_listings_valid_through ON job_listings(valid_through);
CREATE INDEX IF NOT EXISTS idx_job_listings_categories ON job_listings USING GIN(industry_categories);
CREATE INDEX IF NOT EXISTS idx_job_listings_location ON job_listings(location_state, location_city);

CREATE TRIGGER job_listings_updated_at
    BEFORE UPDATE ON job_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

INSERT INTO schema_version (version, description)
VALUES ('1.2.0-carsi-calendar-jobs', 'CARSI Hub Phase 1: Industry Calendar + Job Board')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- Initialization Complete
-- =============================================================================

-- Summary of created objects
DO $$
BEGIN
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Database initialization complete!';
    RAISE NOTICE '=============================================================================';
    RAISE NOTICE 'Extensions: uuid-ossp, vector (pgvector)';
    RAISE NOTICE 'Tables: users, contractors, availability_slots, documents, research_articles, schema_version';
    RAISE NOTICE 'Views: available_contractors';
    RAISE NOTICE 'Default admin: admin@local.dev / admin123 (CHANGE THIS!)';
    RAISE NOTICE '=============================================================================';
END $$;
