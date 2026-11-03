#!/usr/bin/env node
// GP-671: an audio stream can contain digital silence. Measure the entire trailer.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { isEntryPoint } from './lib/is-entry-point.mjs';

const run = promisify(execFile);
const TIMEOUT_MS = 120_000;
const CONCURRENCY = 4;

export function classify({ hasAudio, maxDb, meanDb }) {
  if (!hasAudio) return 'NO_AUDIO';
  if (![maxDb, meanDb].every((v) => typeof v === 'number' && (Number.isFinite(v) || v === -Infinity))) {
    throw new Error('Missing or invalid loudness measurements');
  }
  if (maxDb <= -60) return 'SILENT';
  if (meanDb <= -40) return 'TOO_QUIET';
  return 'OK';
}

export async function measure(url) {
  const deadline = Date.now() + TIMEOUT_MS;
  const execute = (binary, args) => run(binary, args, {
    timeout: Math.max(1, deadline - Date.now()), maxBuffer: 8 * 1024 * 1024,
    killSignal: 'SIGKILL',
  });
  const { stdout } = await execute('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=index',
    '-of', 'json', url,
  ]);
  const probe = JSON.parse(stdout);
  if (!Array.isArray(probe.streams)) throw new Error('ffprobe did not return a streams array');
  if (probe.streams.length === 0) {
    return { hasAudio: false, maxDb: null, meanDb: null, verdict: 'NO_AUDIO' };
  }
  const { stderr } = await execute('ffmpeg', [
    '-hide_banner', '-nostdin', '-nostats', '-xerror', '-i', url,
    '-map', '0:a:0', '-vn', '-sn', '-dn', '-af', 'volumedetect', '-f', 'null', '-',
  ]);
  const volume = (name) => {
    const match = stderr.match(new RegExp(`${name}_volume:\\s*(-?inf|[-+]?\\d+(?:\\.\\d+)?)\\s*dB`, 'i'));
    if (!match) throw new Error(`ffmpeg returned no ${name}_volume`);
    return match[1].toLowerCase() === '-inf' ? -Infinity : Number(match[1]);
  };
  const result = { hasAudio: true, maxDb: volume('max'), meanDb: volume('mean') };
  return { ...result, verdict: classify(result) };
}

function decode(value) {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (entity.toLowerCase() in named) return named[entity.toLowerCase()];
    const hex = entity[2].toLowerCase() === 'x';
    return String.fromCodePoint(parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10));
  });
}

export function extractVideoUrls(html, page) {
  const urls = new Set();
  for (const tag of html.matchAll(/<(?:video|source)\b[^>]*>/gi)) {
    const src = tag[0].match(/\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!src) continue;
    const url = new URL(decode(src[1] ?? src[2] ?? src[3]), page);
    if (/\.(mp4|webm|mov)$/i.test(url.pathname)) urls.add(url.href);
  }
  return [...urls];
}

async function pool(items, fn) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  }));
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

export async function main(args = process.argv.slice(2)) {
  const videos = new Map();
  const counts = { OK: 0, SILENT: 0, TOO_QUIET: 0, NO_AUDIO: 0, ERROR: 0 };
  const add = (url, page) => {
    if (!videos.has(url)) videos.set(url, new Set());
    videos.get(url).add(page);
  };
  const error = (url, pages, err) => {
    counts.ERROR++;
    console.error(`ERROR max=n/a dB mean=n/a dB ${url} pages=${pages} — ${err.message}`);
  };
  try {
    if (args[0] === '--urls' && !args.slice(1).some((arg) => arg.startsWith('--'))) {
      for (const url of args.slice(1)) add(url, '(explicit URL)');
    } else if (args[0] === '--catalog' && args.length === 1) {
      const catalogue = JSON.parse(await readFile(new URL('../data/seed/courses-catalog.json', import.meta.url), 'utf8'));
      if (!Array.isArray(catalogue.courses)) throw new Error('Catalogue has no courses array');
      for (const course of catalogue.courses) {
        if (course.introVideoUrl) add(course.introVideoUrl, `/courses/${course.slug}`);
      }
    } else if (args[0] === '--live' && args.length <= 2 && !args[1]?.startsWith('--')) {
      const base = new URL(args[1] || 'https://carsi.com.au');
      const pages = new Set();
      const visited = new Set();
      const sitemap = async (url) => {
        if (visited.has(url)) return;
        visited.add(url);
        const xml = await fetchText(url);
        const locations = [...xml.matchAll(/<loc\b[^>]*>\s*([^<]+?)\s*<\/loc>/gi)]
          .map((match) => new URL(decode(match[1]), url));
        if (/<sitemapindex\b/i.test(xml)) {
          for (const location of locations) await sitemap(location.href);
        } else {
          for (const location of locations) {
            if (location.origin === base.origin && /^\/courses\/[^/]+\/?$/.test(location.pathname)) pages.add(location.href);
          }
        }
      };
      await sitemap(new URL('/sitemap.xml', base).href);
      await pool([...pages], async (page) => {
        try {
          for (const url of extractVideoUrls(await fetchText(page), page)) add(url, page);
        } catch (err) { error(page, page, err); }
      });
    } else {
      throw new Error('Usage: --live [baseUrl] | --catalog | --urls <url> ...');
    }
  } catch (err) { error('(discovery)', '(discovery)', err); }

  await pool([...videos], async ([url, pages]) => {
    try {
      const result = await measure(url);
      counts[result.verdict]++;
      console.log(`${result.verdict} max=${result.maxDb ?? 'n/a'} dB mean=${result.meanDb ?? 'n/a'} dB ${url} pages=${[...pages].join(', ')}`);
    } catch (err) { error(url, [...pages].join(', '), err); }
  });
  const measured = counts.OK + counts.SILENT + counts.TOO_QUIET + counts.NO_AUDIO;
  console.log(`Summary: ${measured} videos measured; ${Object.entries(counts).map(([key, n]) => `${key}=${n}`).join(' ')}`);
  if (measured === 0) console.error('FAIL: zero videos measured; an empty run is never a pass');
  return measured === 0 || counts.ERROR > 0 || measured !== counts.OK ? 1 : 0;
}

if (isEntryPoint(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }).catch((err) => {
    console.error(`ERROR: ${err.message}`);
    process.exitCode = 1;
  });
}
