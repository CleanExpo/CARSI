-- CARSI · 02 · CHANGES DATA · Remove the 6 intro videos (DECISIONS #46)
-- Database: DigitalOcean managed Postgres "carsi-db".
-- The 6 videos still say "CEC-accredited", which those courses are not. This removes
-- the video link from each course. No learner progress, enrolment or lesson is touched.
--
-- STEP A (read-only). Run this first and keep the result.
SELECT slug, is_published,
       meta->>'introVideoUrl'    AS intro_video,
       meta->>'introCaptionsUrl' AS intro_captions
FROM lms_courses
WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
  'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
  'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions')
ORDER BY slug;

-- STEP B (the change). Run this block on its own, as one piece.
-- It is all-or-nothing: if it would ever touch more than 6 courses it stops,
-- undoes itself and saves nothing. Running it twice is harmless.
DO $$
DECLARE n integer;
BEGIN
  UPDATE lms_courses
  SET meta = (meta::jsonb - 'introVideoUrl' - 'introCaptionsUrl')
  WHERE slug IN ('mould-remediation-fundamentals','structural-drying-fundamentals',
    'category-3-sewage-black-water-remediation','fire-smoke-damage-restoration-fundamentals',
    'trauma-crime-scene-decontamination-fundamentals','assessing-indoor-environment-conditions')
    AND (meta::jsonb ? 'introVideoUrl' OR meta::jsonb ? 'introCaptionsUrl');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 6 THEN
    RAISE EXCEPTION 'Stopped: % rows would change (max 6). Nothing was saved.', n;
  END IF;
  RAISE NOTICE 'Intro videos removed from % course(s).', n;
END $$;

-- STEP C (read-only). Run STEP A again: intro_video and intro_captions should now be empty.
