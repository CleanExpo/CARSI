#!/usr/bin/env node

const baseUrl = (process.env.SEO_AUDIT_BASE_URL || process.argv[2] || 'https://carsi.com.au').replace(/\/$/, '');
const crawlSeeds = [
  '/',
  '/courses',
  '/authority',
  '/start-carpet-cleaning-business',
  '/events/ccw-roadshow',
].map((path) => `${baseUrl}${path}`);

async function fetchText(url) {
  const signal = AbortSignal.timeout(10_000);
  const res = await fetch(url, {
    headers: {
      'user-agent': 'CARSI SEO surface audit/1.0',
    },
    redirect: 'follow',
    signal,
  });
  const text = await res.text();
  return { url, finalUrl: res.url, status: res.status, text };
}

function extractSitemapUrls(xml) {
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => toAuditBase(match[1]));
}

function toAuditBase(url) {
  const parsed = new URL(url);
  const base = new URL(baseUrl);
  parsed.protocol = base.protocol;
  parsed.host = base.host;
  return parsed.toString();
}

function extractInternalLinks(html, pageUrl) {
  return [...html.matchAll(/href=["']([^"'#]+)["']/g)]
    .map((match) => match[1])
    .filter((href) => !/^(mailto:|tel:|javascript:)/i.test(href))
    .map((href) => new URL(href, pageUrl))
    .filter((url) => url.hostname === new URL(baseUrl).hostname || url.hostname === 'localhost')
    .map((url) => {
      url.hash = '';
      return url.toString();
    });
}

function validateJsonLd(html, pageUrl, failures) {
  const scripts = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis),
  ];
  for (const [index, script] of scripts.entries()) {
    try {
      const schema = JSON.parse(script[1]);
      validateCourseStructuredData(schema, pageUrl, `JSON-LD script #${index + 1}`, failures);
    } catch (error) {
      failures.push(`${pageUrl} has invalid JSON-LD script #${index + 1}: ${error.message}`);
    }
  }
}

function schemaTypes(node) {
  const type = node?.['@type'];
  return Array.isArray(type) ? type : type ? [type] : [];
}

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function hasCourseInstanceWorkload(courseInstance) {
  const instances = Array.isArray(courseInstance) ? courseInstance : [courseInstance];
  return instances.some((instance) => {
    if (!instance || typeof instance !== 'object') return false;
    return !isBlank(instance.courseWorkload) || Boolean(instance.courseSchedule);
  });
}

function validateCourseStructuredData(schema, pageUrl, source, failures) {
  const stack = [schema];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;

    if (schemaTypes(node).includes('Course')) {
      const label = typeof node.name === 'string' ? node.name : 'unnamed Course';
      if (isBlank(node.description)) {
        failures.push(`${pageUrl} ${source} Course "${label}" is missing description`);
      }
      if (!node.offers) {
        failures.push(`${pageUrl} ${source} Course "${label}" is missing offers`);
      }
      if (!node.hasCourseInstance) {
        failures.push(`${pageUrl} ${source} Course "${label}" is missing hasCourseInstance`);
      } else if (!hasCourseInstanceWorkload(node.hasCourseInstance)) {
        failures.push(
          `${pageUrl} ${source} Course "${label}" has CourseInstance without courseWorkload or courseSchedule`,
        );
      }
    }

    if (Object.prototype.hasOwnProperty.call(node, 'serviceType')) {
      const label = typeof node.name === 'string' ? ` "${node.name}"` : '';
      failures.push(`${pageUrl} ${source}${label} uses invalid JSON-LD property serviceType`);
    }

    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
    } else {
      for (const value of Object.values(node)) stack.push(value);
    }
  }
}

function validateHtml(html, pageUrl, failures) {
  validateJsonLd(html, pageUrl, failures);
  if (html.includes('/cdn-cgi/l/email-protection')) {
    failures.push(`${pageUrl} exposes Cloudflare email-protection link`);
  }
  if (/href=["'][^"']*\s+\/\s+[^"']*["']/.test(html) || html.includes('/courses?discipline=WRT / ASD')) {
    failures.push(`${pageUrl} exposes malformed discipline URL`);
  }
}

async function checkUrl(url, failures) {
  try {
    const result = await fetchText(url);
    if (result.status !== 200) {
      failures.push(`${url} returned HTTP ${result.status}`);
    }
    validateHtml(result.text, url, failures);
    return result;
  } catch (error) {
    failures.push(`${url} failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const failures = [];
  const sitemap = await checkUrl(`${baseUrl}/sitemap.xml`, failures);
  const sitemapUrls = sitemap ? extractSitemapUrls(sitemap.text) : [];

  for (const url of sitemapUrls) {
    await checkUrl(url, failures);
  }

  const sampleLinks = new Set();
  for (const seed of crawlSeeds) {
    const page = await checkUrl(seed, failures);
    if (!page) continue;
    for (const link of extractInternalLinks(page.text, seed)) {
      sampleLinks.add(link);
    }
  }

  for (const link of sampleLinks) {
    await checkUrl(link, failures);
  }

  console.log(`SEO audit base: ${baseUrl}`);
  console.log(`Sitemap URLs checked: ${sitemapUrls.length}`);
  console.log(`Sample internal links checked: ${sampleLinks.size}`);

  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log('SEO surface audit passed.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
