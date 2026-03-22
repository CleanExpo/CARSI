-- =============================================================================
-- CARSI LMS — Development Seed Data
-- =============================================================================
-- Run after migrations: supabase db reset
-- =============================================================================

-- Note: In production, run the wp-migrate.ts script to generate course data
-- from the WordPress export. This file seeds development/test data only.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Ensure roles exist (idempotent)
-- ---------------------------------------------------------------------------
INSERT INTO public.lms_roles (name, description) VALUES
    ('admin', 'Full platform administrator'),
    ('instructor', 'Can create and manage courses'),
    ('student', 'Can enrol in and complete courses')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Seed LMS Categories (IICRC disciplines + general)
-- ---------------------------------------------------------------------------
INSERT INTO public.lms_categories (name, slug, description) VALUES
    ('Water Restoration', 'water-restoration', 'IICRC WRT — Water Damage Restoration Technician certification courses'),
    ('Carpet Cleaning', 'carpet-cleaning', 'IICRC CCT — Carpet Cleaning Technician certification courses'),
    ('Carpet Restoration', 'carpet-restoration', 'IICRC CRT — Carpet Repair and Reinstallation Technician courses'),
    ('Odour Control', 'odour-control', 'IICRC OCT — Odour Control Technician certification courses'),
    ('Applied Structural Drying', 'structural-drying', 'IICRC ASD — Applied Structural Drying certification courses'),
    ('Fire & Smoke Restoration', 'fire-smoke', 'IICRC FSRT — Fire and Smoke Restoration Technician courses'),
    ('Upholstery & Fabric', 'upholstery-fabric', 'IICRC UFT — Upholstery and Fabric Cleaning Technician courses'),
    ('Health & Safety', 'health-safety', 'WHS and safety compliance training for restoration professionals'),
    ('Business & Leadership', 'business-leadership', 'Business management, quoting, and leadership skills'),
    ('Free Courses', 'free', 'Complimentary introductory content')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Sample course data (21 IICRC courses from production seed)
-- ---------------------------------------------------------------------------
-- Note: Full course catalog is seeded via apps/backend seed_full_catalog.py
-- This is a minimal development subset

-- To load full WordPress export, run:
--   npx ts-node scripts/wp-migrate.ts --generate-sql
-- Then review and apply data/wordpress-export/lms-courses.json

-- ---------------------------------------------------------------------------
-- 4. Development test users (created via Supabase Auth signup)
-- ---------------------------------------------------------------------------
-- Test users are created by signing up through the UI or API:
--   admin@carsi.com.au (assign admin role manually)
--   instructor@carsi.com.au (assign instructor role manually)
--   student@carsi.com.au (gets student role automatically)

-- To promote a user to admin after signup:
-- INSERT INTO public.lms_user_roles (user_id, role_id)
-- SELECT u.id, r.id
-- FROM public.lms_users u, public.lms_roles r
-- WHERE u.email = 'admin@carsi.com.au' AND r.name = 'admin'
-- ON CONFLICT DO NOTHING;

COMMIT;

-- =============================================================================
-- Post-seed verification queries
-- =============================================================================
-- SELECT COUNT(*) AS role_count FROM public.lms_roles;
-- SELECT COUNT(*) AS category_count FROM public.lms_categories;
-- SELECT name, slug FROM public.lms_categories ORDER BY name;
