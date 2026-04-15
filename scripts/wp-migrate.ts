#!/usr/bin/env npx ts-node
/**
 * WordPress to CARSI LMS Migration Script
 *
 * Scrapes carsi.com.au WordPress REST API and exports:
 * - data/wordpress-export/posts.json
 * - data/wordpress-export/pages.json
 * - data/wordpress-export/products.json (WooCommerce courses)
 * - data/wordpress-export/courses.json (LMS-shaped courses, same as lms-courses.json)
 * - data/wordpress-export/users.json (WooCommerce customers, when API keys are set)
 * - data/wordpress-export/categories.json
 * - data/wordpress-export/tags.json
 * - data/wordpress-export/media.json
 * - data/wordpress-export/memberships.json
 * - data/wordpress-export/url-redirects.json
 *
 * Usage:
 *   npx ts-node scripts/wp-migrate.ts
 *   npx ts-node scripts/wp-migrate.ts --dry-run
 *   npx ts-node scripts/wp-migrate.ts --generate-sql
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Configuration
// ============================================================================

const WP_BASE_URL = 'https://carsi.com.au';
const WP_API_BASE = `${WP_BASE_URL}/wp-json/wp/v2`;
const WC_API_BASE = `${WP_BASE_URL}/wp-json/wc/v3`; // WooCommerce (requires auth)
const OUTPUT_DIR = path.join(__dirname, '..', 'data', 'wordpress-export');
const WORDPRESS_SEED_SQL_PATH = path.join(__dirname, '..', 'data', 'wordpress-seed.sql');

// WooCommerce API credentials (from environment)
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY || '';
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET || '';

// Rate limiting — be respectful to the production site
const DELAY_MS = 500;
const PER_PAGE = 100;

// IICRC discipline mapping from WP category slugs
const IICRC_DISCIPLINE_MAP: Record<string, string> = {
  'water-restoration': 'WRT',
  'water-damage-restoration': 'WRT',
  wrt: 'WRT',
  'carpet-cleaning': 'CCT',
  'carpet-restoration': 'CRT',
  crt: 'CRT',
  'odour-control': 'OCT',
  'odor-control': 'OCT',
  oct: 'OCT',
  'applied-structural-drying': 'ASD',
  asd: 'ASD',
  'fire-smoke': 'FSRT',
  'upholstery-cleaning': 'UFT',
};

// ============================================================================
// Types
// ============================================================================

interface WPPost {
  id: number;
  date: string;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  featured_media: number;
  categories: number[];
  tags: number[];
  link: string;
  _embedded?: {
    'wp:featuredmedia'?: Array<{ source_url: string }>;
  };
}

interface WPPage {
  id: number;
  date: string;
  slug: string;
  status: string;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  parent: number;
}

interface WPProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  status: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  categories: Array<{ id: number; name: string; slug: string }>;
  tags: Array<{ id: number; name: string; slug: string }>;
  images: Array<{ id: number; src: string; alt: string }>;
  meta_data: Array<{ key: string; value: unknown }>;
  // LearnDash or similar LMS plugin fields
  course_data?: {
    lessons?: number;
    duration?: string;
    cec_hours?: number;
    iicrc_discipline?: string;
  };
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent: number;
  count: number;
}

interface WPTag {
  id: number;
  name: string;
  slug: string;
  count: number;
}

interface WPMedia {
  id: number;
  date: string;
  slug: string;
  source_url: string;
  alt_text: string;
  mime_type: string;
  media_details?: {
    width: number;
    height: number;
    file: string;
  };
}

/** WooCommerce REST API customer (used as “users” export for migration). */
interface WCCustomer {
  id: number;
  date_created: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  role: string;
  billing?: Record<string, unknown>;
  shipping?: Record<string, unknown>;
  meta_data?: Array<{ key: string; value: unknown }>;
}

interface URLRedirect {
  old_path: string;
  new_path: string;
  status_code: 301 | 302;
}

interface LMSCourse {
  slug: string;
  title: string;
  description: string;
  short_description: string;
  thumbnail_url: string | null;
  status: 'draft' | 'published' | 'archived';
  price_aud: number;
  is_free: boolean;
  duration_hours: number | null;
  level: string | null;
  category: string | null;
  tags: string[];
  iicrc_discipline: string | null;
  cec_hours: number | null;
  cppp40421_unit_code: string | null;
  cppp40421_unit_name: string | null;
  meta: Record<string, unknown>;
  wp_id: number;
  wp_permalink: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

function saveJSON(filename: string, data: unknown): void {
  const filepath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`Saved: ${filepath}`);
}

function stripHTML(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

function _slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function detectIICRCDiscipline(categories: string[], title: string): string | null {
  // Check categories first
  for (const cat of categories) {
    const slug = cat.toLowerCase().replace(/\s+/g, '-');
    if (IICRC_DISCIPLINE_MAP[slug]) {
      return IICRC_DISCIPLINE_MAP[slug];
    }
  }

  // Check title keywords
  const titleLower = title.toLowerCase();
  if (titleLower.includes('water') || titleLower.includes('flood')) {
    return 'WRT';
  }
  if (titleLower.includes('carpet clean')) {
    return 'CCT';
  }
  if (titleLower.includes('carpet restor')) {
    return 'CRT';
  }
  if (titleLower.includes('odour') || titleLower.includes('odor')) {
    return 'OCT';
  }
  if (titleLower.includes('drying') || titleLower.includes('structural')) {
    return 'ASD';
  }

  return null;
}

function extractCECHours(metaData: Array<{ key: string; value: unknown }>): number | null {
  // Look for CEC-related meta fields
  const cecKeys = ['cec_hours', '_cec_hours', 'iicrc_cec', 'continuing_education_credits'];

  for (const meta of metaData) {
    if (cecKeys.includes(meta.key.toLowerCase())) {
      const val = parseFloat(String(meta.value));
      if (!isNaN(val)) return val;
    }
  }

  return null;
}

// ============================================================================
// WordPress API Fetchers
// ============================================================================

async function fetchAllPages<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const queryParams = new URLSearchParams({
      per_page: String(PER_PAGE),
      page: String(page),
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });

    const url = `${endpoint}?${queryParams}`;
    console.log(`Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CARSI-Migration-Script/1.0',
        },
      });

      if (!response.ok) {
        if (response.status === 400) {
          // No more pages
          hasMore = false;
          continue;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as T[];
      results.push(...data);

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;

      await delay(DELAY_MS);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      hasMore = false;
    }
  }

  return results;
}

async function fetchPosts(): Promise<WPPost[]> {
  console.log('\n--- Fetching Posts ---');
  return fetchAllPages<WPPost>(`${WP_API_BASE}/posts`, {
    _embed: 'wp:featuredmedia',
  });
}

async function fetchPages(): Promise<WPPage[]> {
  console.log('\n--- Fetching Pages ---');
  return fetchAllPages<WPPage>(`${WP_API_BASE}/pages`);
}

async function fetchCategories(): Promise<WPCategory[]> {
  console.log('\n--- Fetching Categories ---');
  return fetchAllPages<WPCategory>(`${WP_API_BASE}/categories`);
}

async function fetchTags(): Promise<WPTag[]> {
  console.log('\n--- Fetching Tags ---');
  return fetchAllPages<WPTag>(`${WP_API_BASE}/tags`);
}

async function fetchMedia(): Promise<WPMedia[]> {
  console.log('\n--- Fetching Media ---');
  return fetchAllPages<WPMedia>(`${WP_API_BASE}/media`);
}

async function fetchWooCommerceProducts(): Promise<WPProduct[]> {
  console.log('\n--- Fetching Products (WooCommerce API) ---');
  const results: WPProduct[] = [];
  let page = 1;
  let hasMore = true;

  // Create Basic Auth header for WooCommerce
  const authHeader =
    'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

  while (hasMore) {
    const url = `${WC_API_BASE}/products?per_page=${PER_PAGE}&page=${page}`;
    console.log(`Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CARSI-Migration-Script/1.0',
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('WooCommerce API authentication failed. Check your API keys.');
          return results;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as WPProduct[];
      results.push(...data);
      console.log(`  Fetched ${data.length} products (total: ${results.length})`);

      // Check if there are more pages
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;

      await delay(DELAY_MS);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      hasMore = false;
    }
  }

  return results;
}

async function fetchWooCommerceCustomers(): Promise<WCCustomer[]> {
  console.log('\n--- Fetching Customers (WooCommerce API) ---');
  const results: WCCustomer[] = [];
  let page = 1;
  let hasMore = true;

  const authHeader =
    'Basic ' + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString('base64');

  while (hasMore) {
    const url = `${WC_API_BASE}/customers?per_page=${PER_PAGE}&page=${page}`;
    console.log(`Fetching: ${url}`);

    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CARSI-Migration-Script/1.0',
          Authorization: authHeader,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('WooCommerce customers: authentication failed. Check your API keys.');
          return results;
        }
        if (response.status === 403 || response.status === 404) {
          console.warn(
            `WooCommerce customers: HTTP ${response.status} (${response.statusText}). Ensure the key has read access to customers.`
          );
          return results;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as WCCustomer[];
      results.push(...data);
      console.log(`  Fetched ${data.length} customers (total: ${results.length})`);

      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1');
      hasMore = page < totalPages;
      page++;

      await delay(DELAY_MS);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      hasMore = false;
    }
  }

  return results;
}

async function fetchCustomers(): Promise<WCCustomer[]> {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) {
    console.log('\n--- Customers: skipping (WC_CONSUMER_KEY / WC_CONSUMER_SECRET not set) ---');
    return [];
  }
  return fetchWooCommerceCustomers();
}

async function fetchProducts(): Promise<WPProduct[]> {
  console.log('\n--- Fetching Products ---');

  // Try WooCommerce API with authentication first
  if (WC_CONSUMER_KEY && WC_CONSUMER_SECRET) {
    console.log('Using WooCommerce API with authentication...');
    const wcProducts = await fetchWooCommerceProducts();
    if (wcProducts.length > 0) {
      console.log(`Found ${wcProducts.length} WooCommerce products`);
      return wcProducts;
    }
  }

  // Fallback: Try LearnDash courses if WooCommerce fails
  try {
    const courses = await fetchAllPages<WPPost>(`${WP_API_BASE}/sfwd-courses`, {
      _embed: 'wp:featuredmedia',
    });
    if (courses.length > 0) {
      console.log(`Found ${courses.length} LearnDash courses`);
      return courses.map((course) => ({
        id: course.id,
        name: stripHTML(course.title.rendered),
        slug: course.slug,
        permalink: course.link,
        date_created: course.date,
        status: course.status,
        description: course.content.rendered,
        short_description: course.excerpt.rendered,
        price: '0',
        regular_price: '0',
        sale_price: '',
        categories: course.categories.map((id) => ({
          id,
          name: '',
          slug: '',
        })),
        tags: course.tags.map((id) => ({ id, name: '', slug: '' })),
        images:
          course._embedded?.['wp:featuredmedia']?.map((m, i) => ({
            id: i,
            src: m.source_url,
            alt: '',
          })) || [],
        meta_data: [],
      }));
    }
  } catch {
    console.log('No LearnDash courses found');
  }

  console.log('No products found via any method.');
  return [];
}

// ============================================================================
// Data Transformers
// ============================================================================

function transformToLMSCourses(products: WPProduct[], categories: WPCategory[]): LMSCourse[] {
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  return products.map((product) => {
    const categoryNames = product.categories.map(
      (c) => categoryMap.get(c.id)?.name || c.name || ''
    );
    const tagNames = product.tags.map((t) => t.name);

    const price = parseFloat(product.regular_price || product.price || '0');

    return {
      slug: product.slug,
      title: stripHTML(product.name),
      description: product.description,
      short_description: stripHTML(product.short_description),
      thumbnail_url: product.images?.[0]?.src || null,
      status: product.status === 'publish' ? 'published' : 'draft',
      price_aud: price,
      is_free: price === 0,
      duration_hours: product.course_data?.duration
        ? parseFloat(product.course_data.duration)
        : null,
      level: null,
      category: categoryNames[0] || null,
      tags: tagNames,
      iicrc_discipline:
        product.course_data?.iicrc_discipline || detectIICRCDiscipline(categoryNames, product.name),
      cec_hours: product.course_data?.cec_hours || extractCECHours(product.meta_data) || null,
      cppp40421_unit_code: null,
      cppp40421_unit_name: null,
      meta: {
        wp_id: product.id,
        wp_categories: product.categories,
        wp_tags: product.tags,
        original_price: product.regular_price,
        sale_price: product.sale_price,
      },
      wp_id: product.id,
      wp_permalink: product.permalink,
    };
  });
}

function generateURLRedirects(
  posts: WPPost[],
  pages: WPPage[],
  products: WPProduct[]
): URLRedirect[] {
  const redirects: URLRedirect[] = [];

  // Post redirects: /blog/slug -> /blog/slug (may be same)
  for (const post of posts) {
    const oldPath = new URL(post.link).pathname;
    redirects.push({
      old_path: oldPath,
      new_path: `/blog/${post.slug}`,
      status_code: 301,
    });
  }

  // Page redirects
  for (const page of pages) {
    const oldPath = new URL(page.link).pathname;

    // Map common WP pages to new routes
    const pageMap: Record<string, string> = {
      '/about/': '/about',
      '/about-us/': '/about',
      '/contact/': '/contact',
      '/contact-us/': '/contact',
      '/courses/': '/courses',
      '/course-catalog/': '/courses',
      '/course-catalogue/': '/courses',
      '/membership/': '/subscribe',
      '/pricing/': '/subscribe',
      '/my-account/': '/student',
      '/dashboard/': '/student',
      '/cart/': '/subscribe',
      '/checkout/': '/subscribe',
      '/shop/': '/courses',
      '/faq/': '/faq',
      '/faqs/': '/faq',
      '/testimonials/': '/testimonials',
      '/reviews/': '/testimonials',
      '/podcast/': '/podcast',
      '/privacy-policy/': '/privacy',
      '/terms-and-conditions/': '/terms',
      '/terms/': '/terms',
    };

    const newPath = pageMap[oldPath] || `/${page.slug}`;
    redirects.push({
      old_path: oldPath,
      new_path: newPath,
      status_code: 301,
    });
  }

  // Product/Course redirects
  for (const product of products) {
    const oldPath = new URL(product.permalink).pathname;
    redirects.push({
      old_path: oldPath,
      new_path: `/courses/${product.slug}`,
      status_code: 301,
    });

    // Also handle /product/slug format
    if (!oldPath.startsWith('/product/')) {
      redirects.push({
        old_path: `/product/${product.slug}`,
        new_path: `/courses/${product.slug}`,
        status_code: 301,
      });
    }
  }

  // WooCommerce category pages
  redirects.push(
    { old_path: '/product-category/', new_path: '/courses', status_code: 301 },
    {
      old_path: '/product-category/iicrc/',
      new_path: '/courses?filter=iicrc',
      status_code: 301,
    },
    {
      old_path: '/product-category/courses/',
      new_path: '/courses',
      status_code: 301,
    }
  );

  // Remove duplicates
  const seen = new Set<string>();
  return redirects.filter((r) => {
    const key = r.old_path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// SQL Generator
// ============================================================================

function generateSeedSQL(courses: LMSCourse[], categories: WPCategory[]): string {
  const lines: string[] = [
    '-- ============================================================================',
    '-- CARSI LMS Seed Data — Generated from WordPress Export',
    `-- Generated: ${new Date().toISOString()}`,
    '-- ============================================================================',
    '',
    '-- NOTE: Run Alembic migrations first to create the schema',
    '-- This seed file populates the LMS tables with WordPress course data',
    '',
    'BEGIN;',
    '',
    '-- ----------------------------------------------------------------------------',
    '-- 1. Ensure roles exist (idempotent)',
    '-- ----------------------------------------------------------------------------',
    'INSERT INTO lms_roles (name, description)',
    'VALUES',
    "  ('admin', 'Full platform administrator'),",
    "  ('instructor', 'Can create and manage courses'),",
    "  ('student', 'Can enrol in and complete courses')",
    'ON CONFLICT (name) DO NOTHING;',
    '',
    '-- ----------------------------------------------------------------------------',
    '-- 2. Create default instructor (Phil Ashby — CARSI owner)',
    '-- ----------------------------------------------------------------------------',
    'INSERT INTO lms_users (id, email, hashed_password, full_name, is_active, is_verified)',
    'VALUES (',
    "  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',",
    "  'phil@carsi.com.au',",
    "  '$2b$12$placeholder_hash_replace_me',  -- Replace with actual bcrypt hash",
    "  'Phil Ashby',",
    '  true,',
    '  true',
    ')',
    'ON CONFLICT (email) DO NOTHING;',
    '',
    '-- Grant admin and instructor roles',
    'INSERT INTO lms_user_roles (user_id, role_id)',
    "SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, id",
    "FROM lms_roles WHERE name IN ('admin', 'instructor')",
    'ON CONFLICT DO NOTHING;',
    '',
    '-- ----------------------------------------------------------------------------',
    '-- 3. Insert courses from WordPress export',
    '-- ----------------------------------------------------------------------------',
  ];

  if (courses.length > 0) {
    lines.push('INSERT INTO lms_courses (');
    lines.push('  slug, title, description, short_description, thumbnail_url,');
    lines.push('  instructor_id, status, price_aud, is_free, duration_hours,');
    lines.push('  level, category, tags, iicrc_discipline, cec_hours, meta');
    lines.push(') VALUES');

    const courseValues = courses.map((course, i) => {
      const isLast = i === courses.length - 1;
      const tags = JSON.stringify(course.tags).replace(/'/g, "''");
      const meta = JSON.stringify(course.meta).replace(/'/g, "''");
      const description = course.description.replace(/'/g, "''").slice(0, 5000);
      const shortDesc = course.short_description.replace(/'/g, "''").slice(0, 500);

      return [
        '  (',
        `    '${course.slug}',`,
        `    '${course.title.replace(/'/g, "''")}',`,
        `    '${description}',`,
        `    '${shortDesc}',`,
        `    ${course.thumbnail_url ? `'${course.thumbnail_url}'` : 'NULL'},`,
        "    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,",
        `    '${course.status}',`,
        `    ${course.price_aud},`,
        `    ${course.is_free},`,
        `    ${course.duration_hours ?? 'NULL'},`,
        `    ${course.level ? `'${course.level}'` : 'NULL'},`,
        `    ${course.category ? `'${course.category.replace(/'/g, "''")}'` : 'NULL'},`,
        `    '${tags}'::jsonb,`,
        `    ${course.iicrc_discipline ? `'${course.iicrc_discipline}'` : 'NULL'},`,
        `    ${course.cec_hours ?? 'NULL'},`,
        `    '${meta}'::jsonb`,
        `  )${isLast ? '' : ','}`,
      ].join('\n');
    });

    lines.push(...courseValues);
    lines.push('ON CONFLICT (slug) DO UPDATE SET');
    lines.push('  title = EXCLUDED.title,');
    lines.push('  description = EXCLUDED.description,');
    lines.push('  price_aud = EXCLUDED.price_aud,');
    lines.push('  iicrc_discipline = EXCLUDED.iicrc_discipline,');
    lines.push('  cec_hours = EXCLUDED.cec_hours,');
    lines.push('  meta = EXCLUDED.meta;');
  } else {
    lines.push('-- No courses exported from WordPress');
    lines.push('-- Manually add courses here or re-run with WooCommerce API keys');
  }

  lines.push('');
  lines.push('-- ----------------------------------------------------------------------------');
  lines.push('-- 4. Create lms_categories from WordPress export');
  lines.push('-- ----------------------------------------------------------------------------');

  // Note: We'd need to check if lms_categories table exists
  lines.push('-- lms_categories table created in migration 002');
  if (categories.length > 0) {
    lines.push('INSERT INTO lms_categories (name, slug, description, parent_id)');
    lines.push('VALUES');
    const catValues = categories
      .filter((c) => c.slug !== 'uncategorized')
      .map((cat, i, arr) => {
        const isLast = i === arr.length - 1;
        return `  ('${cat.name.replace(/'/g, "''")}', '${cat.slug}', '${cat.description.replace(/'/g, "''")}', NULL)${isLast ? '' : ','}`;
      });
    lines.push(...catValues);
    lines.push('ON CONFLICT (slug) DO NOTHING;');
  }

  lines.push('');
  lines.push('COMMIT;');
  lines.push('');
  lines.push('-- ============================================================================');
  lines.push('-- Post-seed verification queries');
  lines.push('-- ============================================================================');
  lines.push('-- SELECT COUNT(*) AS course_count FROM lms_courses;');
  lines.push('-- SELECT slug, title, iicrc_discipline, cec_hours FROM lms_courses;');
  lines.push('');

  return lines.join('\n');
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const generateSQL = args.includes('--generate-sql');

  console.log('='.repeat(60));
  console.log('CARSI WordPress Migration Script');
  console.log('='.repeat(60));
  console.log(`Source: ${WP_BASE_URL}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('='.repeat(60));

  ensureDir(OUTPUT_DIR);

  // Fetch all data
  const [posts, pages, categories, tags, media, products, customers] = await Promise.all([
    fetchPosts(),
    fetchPages(),
    fetchCategories(),
    fetchTags(),
    fetchMedia(),
    fetchProducts(),
    fetchCustomers(),
  ]);

  console.log('\n--- Summary ---');
  console.log(`Posts: ${posts.length}`);
  console.log(`Pages: ${pages.length}`);
  console.log(`Categories: ${categories.length}`);
  console.log(`Tags: ${tags.length}`);
  console.log(`Media: ${media.length}`);
  console.log(`Products/Courses: ${products.length}`);
  console.log(`WooCommerce customers (users.json): ${customers.length}`);

  if (dryRun) {
    console.log('\n[DRY RUN] Would save files to:', OUTPUT_DIR);
    return;
  }

  // Save raw exports
  saveJSON('posts.json', posts);
  saveJSON('pages.json', pages);
  saveJSON('categories.json', categories);
  saveJSON('tags.json', tags);
  saveJSON('media.json', media);
  saveJSON('products.json', products);

  // Transform to LMS format
  const lmsCourses = transformToLMSCourses(products, categories);
  saveJSON('lms-courses.json', lmsCourses);
  saveJSON('courses.json', lmsCourses);
  saveJSON('users.json', customers);

  // Generate URL redirects
  const redirects = generateURLRedirects(posts, pages, products);
  saveJSON('url-redirects.json', redirects);

  console.log(`\nGenerated ${redirects.length} URL redirects`);

  // Generate SQL seed file
  if (generateSQL || true) {
    const seedSQL = generateSeedSQL(lmsCourses, categories);
    fs.writeFileSync(WORDPRESS_SEED_SQL_PATH, seedSQL);
    console.log(`\nSaved: ${WORDPRESS_SEED_SQL_PATH}`);
  }

  console.log('\n='.repeat(60));
  console.log('Migration export complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review exported JSON in data/wordpress-export/');
  console.log('2. Review generated data/wordpress-seed.sql');
  console.log('3. Apply seed SQL to PostgreSQL (psql or admin tool) as needed');
  console.log('4. Add redirects to Next.js config (next.config.ts)');
  console.log('');
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
