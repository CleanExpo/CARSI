-- CARSI · 03 · READ-ONLY · Find the 4 CEC-renewal courses missing from the live list
-- Database: DigitalOcean managed Postgres "carsi-db". Changes nothing.
-- Courses being looked for: Drying Techniques, Mould Identification, Porous Materials,
-- Psychrometry. Their CEC renewal packs are due before 18/01/2027.

SELECT slug, title, status, is_published
FROM lms_courses
WHERE slug ILIKE '%drying-techniques%' OR slug ILIKE '%mould-identification%'
   OR slug ILIKE '%porous-materials%' OR slug ILIKE '%psychrometry%'
   OR title ILIKE '%drying techniques%' OR title ILIKE '%mould identification%'
   OR title ILIKE '%porous%' OR title ILIKE '%psychrometry%'
ORDER BY title;

-- Send the rows (or "no rows") to Claude. Do not publish anything found here.
