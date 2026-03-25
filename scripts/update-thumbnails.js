/**
 * update-thumbnails.js
 * Connects directly to Supabase and updates thumbnail_url for all courses
 * that can be matched to a carsi.com.au WooCommerce product image.
 *
 * Run: node scripts/update-thumbnails.js
 */

const { Client } = require('pg');

const DB_URL =
  'postgresql://postgres.ofzafxvxobjggjisrbsa:qB8hT1Pmi17FkTuZ@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres';

// ── WooCommerce slug → real image URL mapping ───────────────────────────────
// Scraped from carsi.com.au/restoration-courses/ via browser on 25/03/2026.
// Format: [wp_slug, image_url, ...alt_db_slugs_to_also_match]
const WP_IMAGE_MAP = [
  ['admin-sole-trader',         'https://carsi.com.au/wp-content/uploads/2021/06/admin.png',                          'admin'],
  ['asthmaallergy',             'https://carsi.com.au/wp-content/uploads/2021/02/ASTHMA-AND-ALLERGY.png',             'asthma-and-allergy', 'asthma-allergy'],
  ['carpet-cleaning-basics',    'https://carsi.com.au/wp-content/uploads/2021/02/CARPET-CLEANING-2.png',              'carpet-cleaning-basics'],
  ['carsi-chatgpt-ebook',       'https://carsi.com.au/wp-content/uploads/2023/05/GPT-BOOK.png',                       'chatgpt-ebook', 'chatgpt'],
  ['collaborative-development-your-personal-ai-assistant', 'https://carsi.com.au/wp-content/uploads/2024/10/Copy-of-Add-a-heading.png', 'collaborative-development'],
  ['chat-gpt',                  'https://carsi.com.au/wp-content/uploads/2023/09/chat-gpt.png',                       'chat-gpt-course'],
  ['donning-and-doffing-ppe',   'https://carsi.com.au/wp-content/uploads/2021/03/DONNING-AND-DOFFING-1-1.png',        'donning-doffing', 'ppe'],
  ['free-library',              'https://carsi.com.au/wp-content/uploads/2021/03/Copy-of-EDUCATIONAL-SITES-COURSE.png', 'free-library-resources'],
  ['fundamental-business-framework', 'https://carsi.com.au/wp-content/uploads/2022/04/FBF.png',                     'fbf', 'fundamental-business'],
  ['glass-cleaning-course',     'https://carsi.com.au/wp-content/uploads/2022/05/GLASS-CLEANING.png',                'glass-cleaning'],
  ['heat-drying',               'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png', 'heat-drying-systems'],
  ['infection-control-in-child-care', 'https://carsi.com.au/wp-content/uploads/2021/02/CHILD-CARE.png',             'infection-control-childcare', 'childcare'],
  ['infectious-control-for-the-business-owner', 'https://carsi.com.au/wp-content/uploads/2021/02/BUSINESS-OWNER.png', 'infection-control-business'],
  ['initial-inspection-report-course', 'https://carsi.com.au/wp-content/uploads/2021/10/INSPECTION.png',            'initial-inspection', 'inspection-report'],
  ['adjusters',                 'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png'],
  ['advanced-applied',          'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png', 'advanced-applied-structural'],
  ['introduction-to-advanced-drying-equipment-and-methods', 'https://carsi.com.au/wp-content/uploads/2023/12/advanced-drying-1.png', 'advanced-drying-equipment'],
  ['advancedstructural',        'https://carsi.com.au/wp-content/uploads/2023/12/applied-structural-drying-1.png',   'advanced-structural', 'advancedstructural-drying'],
  ['applied-microbial',         'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques-1.png', 'applied-microbial-remediation'],
  ['structural-drying-2',       'https://carsi.com.au/wp-content/uploads/2023/12/applied-structural-drying-1.png',   'structural-drying', 'applied-structural-drying'],
  ['asbestos',                  'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png', 'asbestos-awareness'],
  ['carpet-cleaning',           'https://carsi.com.au/wp-content/uploads/2023/12/basic-carpet-cleaning.png',         'basic-carpet-cleaning'],
  ['biologicalcontaminants',    'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-2.png', 'biological-contaminants', 'biological'],
  ['complex-water-losses',      'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png'],
  ['controlled-drying',         'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png'],
  ['introduction-to-creating-a-clean-air-environment', 'https://carsi.com.au/wp-content/uploads/2025/05/CLEAN-AIR-ENVIRONMENT-COVER-1.png', 'clean-air-environment'],
  ['dryingprotocol',            'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png', 'drying-protocol'],
  ['moisture-mapping',          'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques.png'],
  ['agi-smallbusiness',         'https://carsi.com.au/wp-content/uploads/2024/05/Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques.png', 'agi-essentials', 'agi-small-business'],
  // Extra discipline-level thumbnails reused for Introduction series
  ['introduction-to-iaq',       'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques-2.png', 'introduction-to-iaq-and-mould', 'introduction-to-iaq-and-mould-understanding-airborne-spread'],
  ['introduction-to-water-damage', 'https://carsi.com.au/wp-content/uploads/2023/12/applied-structural-drying-1.png', 'introduction-to-improving-indoor-air-quality-after-waterdamage', 'introduction-to-water'],
  ['introduction-to-monitoring', 'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-Copy-of-drying-techniques.png', 'introduction-to-monitoring-air-quality-job-site', 'introduction-to-monitoring-air'],
  ['introduction-to-air-quality', 'https://carsi.com.au/wp-content/uploads/2024/04/Copy-of-Copy-of-drying-techniques-1.png', 'introduction-to-air-quality-fundamentals'],
  ['dehumidifiers',              'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png'],
  ['infrared',                   'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png'],
  ['ultraviolet',                'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png'],
  ['litigation-support',         'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png'],
  ['drying-healthcare',          'https://carsi.com.au/wp-content/uploads/2021/02/CHILD-CARE.png', 'healthcare'],
  ['hospitality',                'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP.png'],
  ['educational',                'https://carsi.com.au/wp-content/uploads/2021/03/Copy-of-EDUCATIONAL-SITES-COURSE.png'],
  ['antiques',                   'https://carsi.com.au/wp-content/uploads/2024/09/Copy-of-Copy-of-Copy-of-INTRO-SERIES-MEMBERSHIP-17-1.png'],
  ['submerged-items-recovery',   'https://carsi.com.au/wp-content/uploads/2024/06/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-1.png', 'submerged-items'],
  ['drying-transportation',      'https://carsi.com.au/wp-content/uploads/2024/07/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-2.png'],
  ['industrial-2',               'https://carsi.com.au/wp-content/uploads/2024/08/Copy-of-Copy-of-Copy-of-Copy-of-Copy-of-drying-techniques-3.png', 'industrial'],
];

// Build flat slug → url lookup (primary slug + all alt slugs)
const SLUG_TO_IMG = new Map();
for (const [primary, url, ...alts] of WP_IMAGE_MAP) {
  SLUG_TO_IMG.set(primary, url);
  for (const alt of alts) SLUG_TO_IMG.set(alt, url);
}

async function main() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected to Supabase');

  // Get all courses
  const { rows } = await client.query('SELECT id, slug, title, thumbnail_url FROM lms_courses ORDER BY slug');
  console.log(`📚 Found ${rows.length} courses in DB\n`);

  let matched = 0;
  let skipped = 0;
  let already = 0;

  for (const course of rows) {
    if (course.thumbnail_url) { already++; continue; }

    const img = SLUG_TO_IMG.get(course.slug);
    if (img) {
      await client.query('UPDATE lms_courses SET thumbnail_url = $1 WHERE id = $2', [img, course.id]);
      console.log(`  ✓  ${course.slug}`);
      matched++;
    } else {
      console.log(`  -  ${course.slug} (no match)`);
      skipped++;
    }
  }

  await client.end();
  console.log(`\n📊 Results:`);
  console.log(`   Updated : ${matched}`);
  console.log(`   Already had image: ${already}`);
  console.log(`   No match: ${skipped}`);
  console.log(`   Total   : ${rows.length}`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
