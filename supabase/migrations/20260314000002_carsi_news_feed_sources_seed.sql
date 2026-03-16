-- =============================================================================
-- CARSI Hub — Initial RSS News Feed Sources Seed (UNI-86)
-- 20+ sources covering Australian restoration, HVAC, flooring, IAQ, and
-- related indoor environment industries.
-- =============================================================================

INSERT INTO news_feed_sources (name, rss_url, industry_categories, fetch_interval_minutes, is_active)
VALUES
  -- Restoration & Remediation
  ('R&R Magazine', 'https://www.randrmagonline.com/rss/news', ARRAY['Restoration','Water Damage','Mould Remediation','Fire Restoration'], 60, TRUE),
  ('Restoration & Remediation (R&R) News', 'https://www.randrmagonline.com/rss/topic/news', ARRAY['Restoration','Standards & Compliance'], 60, TRUE),
  ('IICRC News', 'https://www.iicrc.org/news/rss', ARRAY['Restoration','Standards & Compliance','Carpet & Upholstery Cleaning'], 120, TRUE),
  ('Cleaning & Maintenance Management', 'https://www.cmmonline.com/rss/news', ARRAY['Carpet & Upholstery Cleaning','Building & Construction'], 60, TRUE),

  -- Indoor Air Quality & Environment
  ('Indoor Air Quality Association (IAQA)', 'https://www.iaqa.org/news/feed/', ARRAY['Indoor Air Quality','Mould Remediation'], 120, TRUE),
  ('Indoor Environment Connections', 'https://www.iaqnet.com/feed', ARRAY['Indoor Air Quality','Standards & Compliance'], 120, TRUE),

  -- HVAC & Building Services
  ('AIRAH News (Australian Institute of Refrigeration, Air Conditioning and Heating)', 'https://www.airah.org.au/content/news/rss', ARRAY['HVAC','Building & Construction'], 120, TRUE),
  ('HVAC&R Nation', 'https://www.hvacrnation.com.au/feed', ARRAY['HVAC'], 60, TRUE),
  ('ACHR News', 'https://www.achrnews.com/rss/news', ARRAY['HVAC','Building & Construction'], 60, TRUE),

  -- Building & Construction (Australian)
  ('Australian Building Codes Board (ABCB) News', 'https://www.abcb.gov.au/news/rss', ARRAY['Building & Construction','Standards & Compliance'], 240, TRUE),
  ('HIA News (Housing Industry Association)', 'https://hia.com.au/resources/news/rss', ARRAY['Building & Construction'], 120, TRUE),
  ('Master Builders Australia', 'https://www.masterbuilders.com.au/news/feed', ARRAY['Building & Construction','Standards & Compliance'], 120, TRUE),
  ('AIBS News (Australian Institute of Building Surveyors)', 'https://www.aibs.com.au/news/rss', ARRAY['Building & Construction','Standards & Compliance'], 240, TRUE),

  -- Flooring
  ('Floor Covering News', 'https://www.floorcoveringnews.net/rss/news', ARRAY['Flooring'], 60, TRUE),
  ('Carpet & Rug Institute News', 'https://www.carpet-rug.org/news/rss', ARRAY['Flooring','Carpet & Upholstery Cleaning'], 120, TRUE),
  ('Surfaces Reporter (Australian Flooring)', 'https://surfacesreporter.com/feed', ARRAY['Flooring'], 120, TRUE),

  -- Pest Control
  ('Pest Manager Magazine Australia', 'https://pestmanagermag.com.au/feed', ARRAY['Pest Control'], 120, TRUE),
  ('PCT Online (Pest Control Technology)', 'https://www.pctonline.com/rss/news', ARRAY['Pest Control'], 60, TRUE),

  -- Insurance & Claims
  ('Insurance Business Australia', 'https://www.insurancebusinessmag.com/au/news/rss', ARRAY['Insurance & Claims'], 60, TRUE),
  ('Insurance News Australia', 'https://www.insurancenews.com.au/feed', ARRAY['Insurance & Claims'], 60, TRUE),

  -- General Industry / Trade
  ('Facility Management (FM) Magazine Australia', 'https://www.facilitymanagement.com.au/feed', ARRAY['Building & Construction','HVAC'], 120, TRUE),
  ('Sourceable Industry News', 'https://sourceable.net/feed', ARRAY['Building & Construction','Standards & Compliance'], 60, TRUE),
  ('SafeWork Australia News', 'https://www.safeworkaustralia.gov.au/news/rss', ARRAY['Standards & Compliance'], 240, TRUE)

ON CONFLICT (rss_url) DO NOTHING;
