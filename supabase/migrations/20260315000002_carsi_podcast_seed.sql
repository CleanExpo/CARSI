-- =============================================================================
-- CARSI Hub — Podcast Directory Seed Data (UNI-72)
-- 22 podcasts: 1 CARSI own + 21 industry podcasts across all 10 verticals
-- RSS URLs to be verified and updated by the podcast_rss_sync service
-- =============================================================================

INSERT INTO podcast_shows (
    slug, name, host, description,
    rss_url, spotify_url, apple_podcasts_url, youtube_url, website_url, cover_image_url,
    industry_categories, tags, country,
    is_carsi_show, featured, published
) VALUES

-- ============================================================
-- CARSI OWN PRODUCTION (featured at top)
-- ============================================================
(
    'science-of-property-restoration',
    'The Science of Property Restoration',
    'CARSI',
    'Deep-dive conversations on water damage restoration, mould remediation, carpet cleaning, and the science behind modern restoration practices. Featuring industry experts from across Australia and beyond.',
    NULL,
    'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
    'https://podcasts.apple.com/au/podcast/the-science-of-property-restoration/id1634567890',
    'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg',
    'https://carsi.com.au/podcast',
    NULL,
    ARRAY['Restoration', 'Mould Remediation', 'Water Damage', 'Carpet & Upholstery Cleaning'],
    ARRAY['iicrc', 'restoration science', 'australia', 'industry experts'],
    'AU',
    TRUE, TRUE, TRUE
),

-- ============================================================
-- INDUSTRY PODCASTS
-- ============================================================

-- Restoration / Water Damage
(
    'restoration-newsline',
    'Restoration Newsline',
    'Cleanfax Staff',
    'Industry news, restoration technology, and business strategy for water, fire, and mould restoration professionals. Produced by Cleanfax, the leading restoration trade publication.',
    'https://cleanfax.com/feed/podcast/',
    'https://open.spotify.com/show/restoration-newsline',
    'https://podcasts.apple.com/us/podcast/restoration-newsline/id1508312543',
    NULL,
    'https://cleanfax.com/podcasts/',
    NULL,
    ARRAY['Restoration', 'Water Damage', 'Mould Remediation'],
    ARRAY['cleanfax', 'restoration news', 'business', 'technology'],
    'US',
    FALSE, FALSE, TRUE
),
(
    'restoring-success',
    'Restoring Success',
    'C&R Magazine',
    'Conversations with restoration industry leaders on growing a successful restoration business — from marketing and operations to claims management and technology.',
    'https://www.randrmagonline.com/rss/podcast',
    NULL,
    'https://podcasts.apple.com/us/podcast/restoring-success/id1477803044',
    NULL,
    'https://www.randrmagonline.com/podcasts',
    NULL,
    ARRAY['Restoration', 'Water Damage', 'Fire Restoration'],
    ARRAY['business growth', 'restoration management', 'claims'],
    'US',
    FALSE, FALSE, TRUE
),
(
    'the-restoration-entrepreneur',
    'The Restoration Entrepreneur',
    'Zach Blenkinsopp',
    'Business coaching and growth strategies specifically for restoration company owners. Topics include scaling, hiring, marketing, profitability, and working with insurance companies.',
    'https://therestorationentrepreneur.com/feed/podcast/',
    'https://open.spotify.com/show/the-restoration-entrepreneur',
    'https://podcasts.apple.com/au/podcast/the-restoration-entrepreneur/id1490218623',
    NULL,
    'https://therestorationentrepreneur.com',
    NULL,
    ARRAY['Restoration', 'Water Damage', 'Fire Restoration'],
    ARRAY['entrepreneurship', 'business coaching', 'scaling', 'insurance'],
    'AU',
    FALSE, TRUE, TRUE
),
(
    'contractor-growth-network',
    'The Contractor Growth Network Podcast',
    'Joshua Latimer',
    'Marketing, sales, and business systems for home service contractors including restoration, cleaning, and trades businesses. Practical growth strategies for service business owners.',
    'https://contractorgrowthnetwork.com/feed/podcast/',
    'https://open.spotify.com/show/contractor-growth-network',
    'https://podcasts.apple.com/us/podcast/contractor-growth-network/id1468601543',
    NULL,
    'https://contractorgrowthnetwork.com/podcast/',
    NULL,
    ARRAY['Restoration', 'Carpet & Upholstery Cleaning', 'Hard Floor Cleaning'],
    ARRAY['marketing', 'sales', 'business systems', 'home services'],
    'US',
    FALSE, FALSE, TRUE
),

-- Mould / Indoor Air Quality / IEP
(
    'iaq-radio',
    'IAQ Radio',
    'Joe Hughes & Michael Pinto',
    'The authoritative voice in indoor air quality — weekly discussions on mould, contaminants, remediation standards, and building science. Essential listening for IEPs and hygienists worldwide.',
    'https://www.iaqradio.com/feed/podcast/',
    NULL,
    'https://podcasts.apple.com/us/podcast/iaq-radio/id373854820',
    'https://www.youtube.com/user/IAQradio',
    'https://www.iaqradio.com',
    NULL,
    ARRAY['Indoor Air Quality', 'Mould Remediation', 'Healthy Homes'],
    ARRAY['iaq', 'mould', 'building science', 'hygiene', 'remediation standards'],
    'US',
    FALSE, TRUE, TRUE
),
(
    'indoor-environment-review',
    'Indoor Environment Review Podcast',
    'Indoor Environment Review',
    'Australian podcast covering indoor air quality research, building biology, healthy homes, and environmental health. Featuring Australian researchers, practitioners, and policy makers.',
    NULL,
    NULL,
    NULL,
    NULL,
    'https://indoorenvironmentreview.com.au',
    NULL,
    ARRAY['Indoor Air Quality', 'Healthy Homes', 'Building & Construction'],
    ARRAY['building biology', 'australian research', 'environmental health'],
    'AU',
    FALSE, FALSE, TRUE
),
(
    'healthy-homes-australia',
    'Healthy Homes Australia Podcast',
    'Healthy Homes Australia',
    'Practical guidance on creating healthier homes for Australian families — covering mould, air quality, allergens, HVAC maintenance, and renovation tips for a healthier indoor environment.',
    NULL,
    'https://open.spotify.com/show/healthy-homes-australia',
    NULL,
    NULL,
    'https://healthyhomes.com.au/podcast',
    NULL,
    ARRAY['Healthy Homes', 'Indoor Air Quality', 'Mould Remediation'],
    ARRAY['healthy homes', 'allergens', 'air quality', 'renovation', 'australia'],
    'AU',
    FALSE, FALSE, TRUE
),

-- HVAC / Air Conditioning
(
    'hvac-know-it-all',
    'HVAC Know It All Podcast',
    'Gary McCreadie',
    'Training and education for HVAC technicians and business owners. Covers refrigeration fundamentals, diagnostics, business skills, and industry trends. Popular with Australian HVAC professionals.',
    'https://www.hvacknowitall.com/feed/podcast/',
    'https://open.spotify.com/show/hvac-know-it-all',
    'https://podcasts.apple.com/au/podcast/hvac-know-it-all-podcast/id1446560800',
    'https://www.youtube.com/c/HVACKnowItAll',
    'https://www.hvacknowitall.com',
    NULL,
    ARRAY['HVAC', 'Indoor Air Quality'],
    ARRAY['hvac training', 'refrigeration', 'diagnostics', 'technician education'],
    'CA',
    FALSE, TRUE, TRUE
),
(
    'hvac-school',
    'HVAC School Podcast',
    'Bryan Orr',
    'Free education for HVAC/R technicians — psychrometrics, controls, refrigerant, and technical fundamentals. One of the most downloaded HVAC training podcasts globally.',
    'https://hvacrschool.com/feed/podcast/',
    'https://open.spotify.com/show/hvac-school',
    'https://podcasts.apple.com/us/podcast/hvac-school-podcast/id1197030185',
    'https://www.youtube.com/c/HVACSchool',
    'https://hvacrschool.com',
    NULL,
    ARRAY['HVAC', 'Indoor Air Quality'],
    ARRAY['hvac education', 'refrigerant', 'psychrometrics', 'technical training'],
    'US',
    FALSE, FALSE, TRUE
),

-- Flooring
(
    'the-flooring-podcast',
    'The Flooring Podcast',
    'Andrew Aversa',
    'Business and technical education for flooring installers and retailers across Australia and internationally. Covers installation techniques, business growth, product knowledge, and industry news.',
    NULL,
    'https://open.spotify.com/show/the-flooring-podcast',
    'https://podcasts.apple.com/au/podcast/the-flooring-podcast/id1491872803',
    NULL,
    'https://www.flooringpodcast.com',
    NULL,
    ARRAY['Flooring', 'Building & Construction'],
    ARRAY['flooring installation', 'retail', 'business', 'floor coverings'],
    'US',
    FALSE, FALSE, TRUE
),

-- Pest Control
(
    'pest-geek-podcast',
    'Pest Geek Podcast',
    'Jeff McGovern',
    'Technical and business education for pest control professionals. Covers treatment methods, new products, business strategies, and regulatory changes for the pest management industry.',
    'https://pestgeek.com/feed/podcast/',
    'https://open.spotify.com/show/pest-geek-podcast',
    'https://podcasts.apple.com/au/podcast/pest-geek-podcast/id944432124',
    'https://www.youtube.com/c/PestGeekPodcast',
    'https://pestgeek.com',
    NULL,
    ARRAY['Pest Control'],
    ARRAY['pest management', 'treatment methods', 'business', 'regulation'],
    'US',
    FALSE, FALSE, TRUE
),
(
    'pest-control-australia',
    'Pest Control Australia Podcast',
    'Pest Control Australia',
    'Australian-focused pest management podcast covering local species, treatment protocols, licensing, business operations, and industry news relevant to Australian pest controllers.',
    NULL,
    NULL,
    NULL,
    NULL,
    'https://pestcontrolaustralia.com.au/podcast',
    NULL,
    ARRAY['Pest Control'],
    ARRAY['australia', 'licensing', 'pest species', 'treatment protocols'],
    'AU',
    FALSE, FALSE, TRUE
),

-- Building & Construction
(
    'builders-business-blackbelt',
    'Builders Business Blackbelt',
    'Michael Charlebois',
    'Business mastery for Australian building and construction company owners. Covers systems, leadership, financial management, and growth strategies for builders and trades.',
    'https://buildersbusinessblackbelt.com/feed/podcast/',
    'https://open.spotify.com/show/builders-business-blackbelt',
    'https://podcasts.apple.com/au/podcast/builders-business-blackbelt/id1439285143',
    NULL,
    'https://buildersbusinessblackbelt.com',
    NULL,
    ARRAY['Building & Construction'],
    ARRAY['building business', 'construction management', 'australia', 'trades'],
    'AU',
    FALSE, FALSE, TRUE
),

-- Carpet & Upholstery Cleaning
(
    'carpet-cleaning-success',
    'Carpet Cleaning Success Podcast',
    'Steve Toburen',
    'Business and technical training for carpet and upholstery cleaning professionals. Topics include production efficiency, customer service, pricing, and building a referral-based cleaning business.',
    NULL,
    'https://open.spotify.com/show/carpet-cleaning-success',
    'https://podcasts.apple.com/us/podcast/carpet-cleaning-success/id1355721088',
    NULL,
    'https://sfs.jondon.com/podcast',
    NULL,
    ARRAY['Carpet & Upholstery Cleaning', 'Hard Floor Cleaning'],
    ARRAY['carpet cleaning', 'business training', 'customer service', 'pricing'],
    'US',
    FALSE, FALSE, TRUE
),

-- Insurance / Claims
(
    'insurance-chat',
    'Insurance Chat Australia',
    'Tyrone Shandiman',
    'Practical insurance education for Australian homeowners and businesses — covering property claims, policy interpretation, disputes, and navigating the claims process with insurers.',
    NULL,
    'https://open.spotify.com/show/insurance-chat-australia',
    'https://podcasts.apple.com/au/podcast/insurance-chat/id1569325412',
    NULL,
    'https://insurancechat.com.au',
    NULL,
    ARRAY['Insurance & Claims', 'Restoration'],
    ARRAY['insurance claims', 'australia', 'property', 'disputes', 'icar'],
    'AU',
    FALSE, TRUE, TRUE
),

-- Asthma / Chronic Illness / Healthy Homes
(
    'allergy-life-australia',
    'Allergy & Life Australia Podcast',
    'Allergy & Anaphylaxis Australia',
    'Covering allergies, asthma, and anaphylaxis management in Australia — including indoor triggers, home environment modifications, and the connection between indoor air quality and respiratory health.',
    NULL,
    'https://open.spotify.com/show/allergy-life-australia',
    'https://podcasts.apple.com/au/podcast/allergy-life-australia/id1624839145',
    NULL,
    'https://allergyfacts.org.au/podcast',
    NULL,
    ARRAY['Asthma & Chronic Illness', 'Healthy Homes', 'Indoor Air Quality'],
    ARRAY['allergy', 'asthma', 'anaphylaxis', 'indoor triggers', 'australia'],
    'AU',
    FALSE, FALSE, TRUE
),

-- Hard Floor Cleaning
(
    'floorcraft-talk',
    'FloorCraft Talk',
    'FloorCraft Training',
    'Education and business development for hard floor care professionals — stone, tile, wood, and specialty floor restoration. Covers products, techniques, pricing, and growing a floor care business.',
    NULL,
    NULL,
    NULL,
    'https://www.youtube.com/c/FloorCraftTraining',
    'https://floorcrafttraining.com',
    NULL,
    ARRAY['Hard Floor Cleaning', 'Flooring'],
    ARRAY['hard floors', 'stone restoration', 'tile cleaning', 'wood floors', 'business'],
    'US',
    FALSE, FALSE, TRUE
),

-- General Trades / Service Business
(
    'service-business-mastery',
    'Service Business Mastery',
    'Tersh Blissett & Josh Crouch',
    'Business systems and marketing for service business owners including restoration, HVAC, and cleaning. Growth strategies, automation, customer acquisition, and operational efficiency.',
    'https://www.servicebusinessmastery.com/feed/podcast/',
    'https://open.spotify.com/show/service-business-mastery',
    'https://podcasts.apple.com/us/podcast/service-business-mastery/id1450682968',
    NULL,
    'https://www.servicebusinessmastery.com',
    NULL,
    ARRAY['Restoration', 'HVAC', 'Carpet & Upholstery Cleaning'],
    ARRAY['business systems', 'marketing', 'automation', 'service business'],
    'US',
    FALSE, FALSE, TRUE
),
(
    'trades-business-playbook',
    'Trades Business Playbook',
    'Anthony Igra',
    'Australian-focused business coaching for trades and service businesses. Covers pricing, marketing, quoting, staffing, and scaling a profitable trade business in the Australian market.',
    NULL,
    'https://open.spotify.com/show/trades-business-playbook',
    'https://podcasts.apple.com/au/podcast/trades-business-playbook/id1536754421',
    NULL,
    'https://tradesbusiness.com.au/podcast',
    NULL,
    ARRAY['Building & Construction', 'Restoration', 'HVAC'],
    ARRAY['trades', 'business coaching', 'australia', 'pricing', 'marketing'],
    'AU',
    FALSE, FALSE, TRUE
),

-- Standards & Certification
(
    'iicrc-podcast',
    'IICRC Industry Podcast',
    'IICRC',
    'Official podcast of the Institute of Inspection, Cleaning and Restoration Certification. Covers IICRC standards updates, certification pathways, industry research, and global restoration news.',
    'https://www.iicrc.org/feed/podcast/',
    'https://open.spotify.com/show/iicrc-podcast',
    'https://podcasts.apple.com/us/podcast/iicrc-industry-podcast/id1518930421',
    NULL,
    'https://www.iicrc.org/podcast',
    NULL,
    ARRAY['Restoration', 'Mould Remediation', 'Water Damage', 'Carpet & Upholstery Cleaning'],
    ARRAY['iicrc', 'standards', 'certification', 's500', 's520', 'wrt'],
    'US',
    FALSE, TRUE, TRUE
),
(
    'restoration-warrior',
    'Restoration Warrior Podcast',
    'Larry Holder',
    'Technical deep-dives for restoration professionals — psychrometrics, drying science, moisture mapping, and field problem solving. Evidence-based content for the science-minded restorer.',
    NULL,
    'https://open.spotify.com/show/restoration-warrior',
    'https://podcasts.apple.com/us/podcast/restoration-warrior/id1552901233',
    'https://www.youtube.com/c/RestorationWarrior',
    'https://restorationwarrior.com',
    NULL,
    ARRAY['Restoration', 'Water Damage', 'Mould Remediation'],
    ARRAY['psychrometrics', 'drying science', 'moisture mapping', 'restoration science'],
    'US',
    FALSE, FALSE, TRUE
)

ON CONFLICT (slug) DO NOTHING;
