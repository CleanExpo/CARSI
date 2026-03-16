-- CARSI Hub — Row Level Security Policies

-- ============================================================
-- Enable RLS on all hub tables
-- ============================================================

ALTER TABLE public.news_feed_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.industry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_shows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hub_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_email_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- news_feed_sources — internal pipeline management only
-- ============================================================

CREATE POLICY "Service role manages news feed sources"
    ON public.news_feed_sources FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- news_articles — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published news articles"
    ON public.news_articles FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages news articles"
    ON public.news_articles FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- professionals — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published professionals"
    ON public.professionals FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages professionals"
    ON public.professionals FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- job_listings — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published job listings"
    ON public.job_listings FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages job listings"
    ON public.job_listings FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- industry_events — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published industry events"
    ON public.industry_events FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages industry events"
    ON public.industry_events FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- youtube_channels — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published youtube channels"
    ON public.youtube_channels FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages youtube channels"
    ON public.youtube_channels FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- research_articles — uses status enum, not published boolean
-- ============================================================

CREATE POLICY "Public can read published research articles"
    ON public.research_articles FOR SELECT
    USING (status = 'published');

CREATE POLICY "Service role manages research articles"
    ON public.research_articles FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- podcast_shows — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read published podcast shows"
    ON public.podcast_shows FOR SELECT
    USING (published = true);

CREATE POLICY "Service role manages podcast shows"
    ON public.podcast_shows FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- podcast_episodes — public read published, service role manages
-- ============================================================

CREATE POLICY "Public can read podcast episodes"
    ON public.podcast_episodes FOR SELECT
    USING (true);

CREATE POLICY "Service role manages podcast episodes"
    ON public.podcast_episodes FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- hub_submissions — anon insert, service role reads/manages
-- ============================================================

CREATE POLICY "Anon can submit to hub"
    ON public.hub_submissions FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Service role reads hub submissions"
    ON public.hub_submissions FOR SELECT
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages hub submissions"
    ON public.hub_submissions FOR UPDATE
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role deletes hub submissions"
    ON public.hub_submissions FOR DELETE
    USING (auth.role() = 'service_role');

-- ============================================================
-- submission_guidelines — public read, service role manages
-- ============================================================

CREATE POLICY "Public can read submission guidelines"
    ON public.submission_guidelines FOR SELECT
    USING (true);

CREATE POLICY "Service role manages submission guidelines"
    ON public.submission_guidelines FOR ALL
    USING (auth.role() = 'service_role');

-- ============================================================
-- submission_email_log — service role only
-- ============================================================

CREATE POLICY "Service role manages submission email log"
    ON public.submission_email_log FOR ALL
    USING (auth.role() = 'service_role');
