#!/usr/bin/env npx ts-node
/**
 * Seed production database with WordPress-exported courses.
 *
 * Usage:
 *   npx ts-node scripts/seed-production.ts
 *
 * Requires:
 *   - CARSI_ADMIN_TOKEN environment variable (JWT token from admin login)
 *   - CARSI_API_URL environment variable (default: https://carsi-backend.fly.dev)
 */

import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.CARSI_API_URL || 'https://carsi-backend.fly.dev';
const ADMIN_TOKEN = process.env.CARSI_ADMIN_TOKEN;

interface WordPressExport {
  slug: string;
  title: string;
  description?: string;
  status?: string;
  price_aud?: number;
  tier?: string;
  iicrc_discipline?: string;
  cec_hours?: number;
  meta?: Record<string, unknown>;
}

interface BulkCourseIn {
  slug: string;
  title: string;
  description: string | null;
  status: string;
  price_aud: number;
  tier: string;
  iicrc_discipline: string | null;
  cec_hours: number | null;
  meta: Record<string, unknown> | null;
}

function cleanHtml(text: string | undefined): string | null {
  if (!text) return null;
  // Basic HTML cleanup - remove tags for cleaner storage
  return text.replace(/<[^>]*>/g, '').trim() || null;
}

function mapCourse(wp: WordPressExport): BulkCourseIn {
  let status = wp.status || 'draft';
  if (status === 'publish') status = 'published';
  if (!['draft', 'published', 'archived'].includes(status)) status = 'draft';

  return {
    slug: wp.slug,
    title: wp.title,
    description: cleanHtml(wp.description),
    status,
    price_aud: wp.price_aud || 0,
    tier: wp.tier || 'foundation',
    iicrc_discipline: wp.iicrc_discipline || null,
    cec_hours: wp.cec_hours || null,
    meta: wp.meta || null,
  };
}

async function main() {
  if (!ADMIN_TOKEN) {
    console.error('Error: CARSI_ADMIN_TOKEN environment variable is required.');
    console.error('Login as admin and copy the JWT token from cookies/response.');
    process.exit(1);
  }

  // Read export file
  const exportPath = path.join(__dirname, '..', 'data', 'wordpress-export', 'lms-courses.json');
  if (!fs.existsSync(exportPath)) {
    console.error(`Error: Export file not found at ${exportPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(exportPath, 'utf-8');
  const courses: WordPressExport[] = JSON.parse(rawData);
  console.log(`Loaded ${courses.length} courses from export file.`);

  // Map to API format
  const mappedCourses = courses.map(mapCourse);

  // Send to API in batches of 50
  const BATCH_SIZE = 50;
  let totalInserted = 0;
  let totalSkipped = 0;
  const allErrors: string[] = [];

  for (let i = 0; i < mappedCourses.length; i += BATCH_SIZE) {
    const batch = mappedCourses.slice(i, i + BATCH_SIZE);
    console.log(
      `Sending batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mappedCourses.length / BATCH_SIZE)} (${batch.length} courses)...`
    );

    try {
      const response = await fetch(`${API_URL}/api/lms/admin/seed-courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ courses: batch }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Batch failed: ${response.status} - ${error}`);
        allErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error}`);
        continue;
      }

      const result = await response.json();
      totalInserted += result.inserted;
      totalSkipped += result.skipped;
      if (result.errors?.length) {
        allErrors.push(...result.errors);
      }

      console.log(`  Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
    } catch (err) {
      console.error(`Batch error: ${err}`);
      allErrors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${String(err)}`);
    }
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Total inserted: ${totalInserted}`);
  console.log(`Total skipped: ${totalSkipped}`);
  if (allErrors.length) {
    console.log(`Errors (${allErrors.length}):`);
    allErrors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (allErrors.length > 10) {
      console.log(`  ... and ${allErrors.length - 10} more`);
    }
  }
}

main().catch(console.error);
