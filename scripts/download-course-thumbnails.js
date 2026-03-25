#!/usr/bin/env node
/**
 * Downloads all course thumbnails from carsi.com.au (using Referer bypass)
 * and saves them locally to apps/web/public/images/courses/
 * Then updates Supabase thumbnail_url to point to local paths.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://ofzafxvxobjggjisrbsa.supabase.co';
const ANON_KEY = 'sb_publishable_IUTvuzyhtPj_OmP8sTdziQ_S5-8gbYB';
const OUTPUT_DIR = path.join(__dirname, '../apps/web/public/images/courses');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const client = opts.protocol === 'https:' ? https : http;
    const req = client.get(url, { headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(new Error('Invalid JSON: ' + Buffer.concat(chunks).toString().slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, {
      headers: {
        'Referer': 'https://carsi.com.au/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Download timeout')); });
  });
}

async function main() {
  console.log('Fetching course list from Supabase...');
  const courses = await fetchJson(
    `${SUPABASE_URL}/rest/v1/lms_courses?select=id,slug,thumbnail_url&limit=200&order=slug`,
    { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
  );

  console.log(`Found ${courses.length} courses`);
  const withThumb = courses.filter(c => c.thumbnail_url);
  console.log(`${withThumb.length} have thumbnail URLs\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  const updates = [];

  for (const course of withThumb) {
    const origUrl = course.thumbnail_url;
    const ext = path.extname(new URL(origUrl).pathname) || '.png';
    const localFile = `${course.slug}${ext}`;
    const localPath = path.join(OUTPUT_DIR, localFile);
    const localUrl = `/images/courses/${localFile}`;

    // Skip if already downloaded
    if (fs.existsSync(localPath)) {
      const stat = fs.statSync(localPath);
      if (stat.size > 1000) {
        skipped++;
        updates.push({ id: course.id, slug: course.slug, url: localUrl });
        continue;
      }
    }

    process.stdout.write(`Downloading ${course.slug.slice(0, 50).padEnd(50)} `);
    try {
      await downloadFile(origUrl, localPath);
      const stat = fs.statSync(localPath);
      console.log(`✓ ${(stat.size / 1024).toFixed(0)}KB`);
      downloaded++;
      updates.push({ id: course.id, slug: course.slug, url: localUrl });
    } catch (err) {
      console.log(`✗ ${err.message}`);
      failed++;
      // Keep original URL if download fails
      updates.push({ id: course.id, slug: course.slug, url: origUrl });
    }

    // Small delay to avoid hammering the server
    await new Promise(r => setTimeout(r, 150));
  }

  console.log(`\nDownload summary: ${downloaded} downloaded, ${skipped} skipped (already exist), ${failed} failed`);

  // Update Supabase thumbnail_url to local paths
  const localUpdates = updates.filter(u => u.url.startsWith('/images/'));
  if (localUpdates.length > 0) {
    console.log(`\nUpdating ${localUpdates.length} Supabase records...`);

    // Batch update via PATCH requests
    let updateCount = 0;
    for (const update of localUpdates) {
      try {
        await new Promise((resolve, reject) => {
          const body = JSON.stringify({ thumbnail_url: update.url });
          const req = https.request({
            hostname: 'ofzafxvxobjggjisrbsa.supabase.co',
            path: `/rest/v1/lms_courses?id=eq.${update.id}`,
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${ANON_KEY}`,
              'Prefer': 'return=minimal',
            }
          }, (res) => {
            res.resume();
            if (res.statusCode >= 200 && res.statusCode < 300) {
              updateCount++;
              resolve();
            } else {
              reject(new Error(`PATCH ${res.statusCode} for ${update.slug}`));
            }
          });
          req.on('error', reject);
          req.write(body);
          req.end();
        });
      } catch (err) {
        console.error(`  Failed to update ${update.slug}: ${err.message}`);
      }
    }
    console.log(`Updated ${updateCount} records in Supabase`);
  }

  console.log('\nDone!');
}

main().catch(console.error);
