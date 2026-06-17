#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_ORIGIN = 'https://carsi.com.au';
const DEFAULT_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_URL_FILES = ['public/start-smart-urls.txt'];
const DEFAULT_PATHS = [
  '/',
  '/courses',
  '/pathways',
  '/pricing',
  '/contact',
  '/about',
  '/ccw-training',
  '/ccw-materials',
  '/calendar',
  '/events/ccw-roadshow',
  '/authority',
  '/research',
  '/professional-directory',
  '/news',
  '/jobs',
  '/podcast',
  '/youtube',
  '/ideas',
  '/submit',
  '/submit/podcast',
  '/submit/youtube_channel',
  '/submit/professional',
  '/submit/event',
  '/submit/job',
  '/submit/article',
  '/submit/case_study',
  '/submit/news_source',
  '/carsi-ai-citation-pack.md',
  '/carsi-citation-pack.json',
  '/llms.txt',
  '/start-smart-readiness.json',
];

function usage() {
  console.log(`Usage:
  npm run seo:submit-indexnow -- --send
  npm run seo:submit-indexnow -- --url /events/ccw-roadshow --url /authority
  npm run seo:submit-indexnow -- --file public/start-smart-urls.txt

Environment:
  INDEXNOW_KEY            Required when using --send.
  INDEXNOW_KEY_LOCATION   Defaults to <origin>/indexnow-key.txt.
  INDEXNOW_ENDPOINT       Defaults to ${DEFAULT_ENDPOINT}.
  NEXT_PUBLIC_FRONTEND_URL or NEXT_PUBLIC_APP_URL sets the origin.

Notes:
  Runs as a dry run unless --send is provided.
  HTTP 200 means the URLs were received by IndexNow, not guaranteed indexed.`);
}

function getArgValues(flag) {
  const values = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) {
      values.push(args[i + 1]);
      i += 1;
    }
  }
  return values;
}

function normalizeOrigin(rawOrigin) {
  return (rawOrigin || DEFAULT_ORIGIN).replace(/\/+$/, '');
}

function toAbsoluteUrl(origin, value) {
  if (!value || value.startsWith('#')) return null;
  if (/^https?:\/\//i.test(value)) {
    const parsedValue = new URL(value.trim());
    const parsedOrigin = new URL(origin);
    const normalizedValueHost = parsedValue.host.replace(/^www\./, '');
    const normalizedOriginHost = parsedOrigin.host.replace(/^www\./, '');

    if (normalizedValueHost === normalizedOriginHost && parsedValue.host !== parsedOrigin.host) {
      parsedValue.protocol = parsedOrigin.protocol;
      parsedValue.host = parsedOrigin.host;
      return parsedValue.toString();
    }

    return parsedValue.toString();
  }
  const path = value.startsWith('/') ? value : `/${value}`;
  return `${origin}${path}`.trim();
}

function readUrlFile(origin, filePath) {
  const absolutePath = resolve(process.cwd(), filePath);
  if (!existsSync(absolutePath)) return [];

  return readFileSync(absolutePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => toAbsoluteUrl(origin, line.trim()))
    .filter(Boolean);
}

function unique(values) {
  return [...new Set(values)];
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    usage();
    return;
  }

  const shouldSend = args.includes('--send');
  const origin = normalizeOrigin(
    getArgValues('--host')[0] ||
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL
  );
  const key = process.env.INDEXNOW_KEY?.trim();
  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION?.trim() || (key ? `${origin}/indexnow-key.txt` : undefined);
  const endpoint = process.env.INDEXNOW_ENDPOINT?.trim() || DEFAULT_ENDPOINT;

  if (shouldSend && !key) {
    console.error('INDEXNOW_KEY is required when using --send.');
    process.exitCode = 1;
    return;
  }

  const argUrls = getArgValues('--url').map((value) => toAbsoluteUrl(origin, value));
  const fileUrls = [...DEFAULT_URL_FILES, ...getArgValues('--file')].flatMap((file) =>
    readUrlFile(origin, file)
  );
  const defaultUrls = DEFAULT_PATHS.map((path) => toAbsoluteUrl(origin, path));
  const urlList = unique([...defaultUrls, ...fileUrls, ...argUrls].filter(Boolean));

  if (!urlList.length) {
    console.error('No URLs found to submit.');
    process.exitCode = 1;
    return;
  }

  const payload = {
    host: new URL(origin).host,
    key: key || 'DRY_RUN_INDEXNOW_KEY',
    keyLocation: keyLocation || `${origin}/indexnow-key.txt`,
    urlList,
  };

  if (!shouldSend) {
    console.log('IndexNow dry run. Add --send after INDEXNOW_KEY is configured.');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(`IndexNow submission failed: ${response.status} ${response.statusText}`);
    if (text.trim()) console.error(text.trim());
    process.exitCode = 1;
    return;
  }

  console.log(`IndexNow submission received: ${response.status}`);
  console.log(`Submitted URLs: ${urlList.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
