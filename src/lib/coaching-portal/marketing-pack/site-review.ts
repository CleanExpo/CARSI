/**
 * GP-634: plain-English review of a member's public website and Google Business Profile link.
 * Deterministic: it reads the fetched HTML and reports only what it can see. It never guesses
 * at a page it could not read. Output shape follows seo-page-fix / seo-gbp-audit: an issue, why
 * it matters to a local customer, and how to fix it, ranked by impact over effort.
 */
import { isCompliantCopy } from './compliance';
import type { MarketingFix, SiteCheck, SiteFetchResult, SiteReview, TradeVoice } from './types';

/** Member- or page-supplied text is shown only when it carries no claim; otherwise a neutral stand-in. */
export function safeText(value: string | null | undefined, fallback: string): string {
  const v = (value ?? '').trim();
  return v && isCompliantCopy(v) ? v : fallback;
}

/**
 * Every member-visible line in the pack is built from these values, so a claim in a business
 * name ("Guaranteed Results Plumbing") or trade can never reach the review, checklist,
 * calendar or downloads.
 */
export function sanitizeVoice(voice: TradeVoice): TradeVoice {
  return {
    businessName: safeText(voice.businessName, 'your business'),
    trade: safeText(voice.trade, 'your trade'),
    town: safeText(voice.town, 'your area'),
    services: safeText(voice.services, ''),
  };
}

type FixSpec = Omit<MarketingFix, 'rank' | 'score'>;

export type ReviewInput = {
  websiteUrl: string | null;
  fetch: SiteFetchResult | null;
  googleBusinessUrl: string | null;
  voice: TradeVoice;
};

const GENERIC_TITLES = /^(home|homepage|welcome|index|untitled|my site|website)$/i;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m ? stripTags(m[1]).trim() : null;
}

function metaContent(html: string, name: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (new RegExp(`\\bname\\s*=\\s*["']${name}["']`, 'i').test(tag)) {
      const c = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
      return c ? c[1].trim() : '';
    }
  }
  return null;
}

/** First word of the town, e.g. "Toowoomba" from "Toowoomba QLD 4350". */
export function primaryTown(town: string): string {
  const cleaned = town.split(/[,(]/)[0].trim();
  const words = cleaned
    .split(/\s+/)
    .filter((w) => !/^(qld|nsw|vic|sa|wa|tas|nt|act|\d{4})$/i.test(w));
  return words.join(' ').trim();
}

function hasLocalBusinessSchema(html: string): boolean {
  const blocks = html.match(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  return blocks.some((b) =>
    /"@type"\s*:\s*\[?\s*"[A-Za-z]*(LocalBusiness|HomeAndConstructionBusiness|Plumber|Electrician|HousePainter|RoofingContractor|GeneralContractor|ProfessionalService|CleaningService|Locksmith|HVACBusiness|MovingCompany)"/i.test(
      b
    )
  );
}

export function isGoogleBusinessLink(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === 'g.page' || host === 'maps.app.goo.gl' || host === 'goo.gl') return true;
    if (/(^|\.)google\.[a-z.]+$/.test(host)) {
      return (
        /\/maps|\/search|[?&](cid|ludocid)=|business\.google/.test(`${u.pathname}${u.search}`) ||
        host.startsWith('business.') ||
        host.startsWith('maps.')
      );
    }
    if (host === 'business.site' || host.endsWith('.business.site')) return true;
    return false;
  } catch {
    return false;
  }
}

function rankFixes(specs: FixSpec[]): MarketingFix[] {
  return specs
    .map((s, order) => ({ s, order, score: s.impact * 3 - s.effort }))
    .sort((a, b) => b.score - a.score || b.s.impact - a.s.impact || a.order - b.order)
    .map(({ s, score }, i) => ({ ...s, rank: i + 1, score }));
}

function profileFixes(googleBusinessUrl: string | null, town: string): FixSpec[] {
  if (!googleBusinessUrl) {
    return [
      {
        id: 'gbp-missing',
        area: 'google-business-profile',
        title: 'Set up or link your Google Business Profile',
        why: `When someone in ${town || 'your area'} searches for your trade, the map listings show first. Without a Google Business Profile you are not in that list.`,
        how: 'Go to business.google.com, claim or create your listing, choose your main trade category, set your service area, then paste the profile link into your coaching profile so we can review it.',
        impact: 3,
        effort: 1,
      },
    ];
  }
  if (!isGoogleBusinessLink(googleBusinessUrl)) {
    return [
      {
        id: 'gbp-link-invalid',
        area: 'google-business-profile',
        title: 'Check your Google Business Profile link',
        why: 'The link saved as your Google Business Profile is not a Google Maps or Business Profile link, so customers and your coach may land in the wrong place.',
        how: 'Open your listing on Google Maps, press Share, copy the link and save it in your coaching profile.',
        impact: 2,
        effort: 1,
      },
    ];
  }
  return [];
}

export function reviewWebsite(rawInput: ReviewInput): SiteReview {
  const input = { ...rawInput, voice: sanitizeVoice(rawInput.voice) };
  const town = primaryTown(input.voice.town);
  const trade = input.voice.trade.trim();
  const shownUrl = safeText(input.websiteUrl, 'your website');
  const checks: SiteCheck[] = [];
  const gbpSpecs = profileFixes(input.googleBusinessUrl, town);
  // Profile fixes go first so they win ties: for a trade business the map listing comes first.
  const specs: FixSpec[] = [...gbpSpecs];
  checks.push({
    id: 'google-business-profile',
    label: 'Google Business Profile linked',
    passed: gbpSpecs.length === 0,
  });

  if (!input.websiteUrl) {
    specs.push({
      id: 'website-missing',
      area: 'website',
      title: 'Add a simple website or landing page',
      why: 'Most customers check a business online before they call. A one-page site with your services, area and phone number gives them a reason to choose you.',
      how: 'Start with one page: what you do, the suburbs you cover, a few real job photos, and a tap-to-call phone number. Then add the link to your coaching profile.',
      impact: 3,
      effort: 2,
    });
    const fixes = rankFixes(specs);
    return {
      websiteUrl: null,
      googleBusinessUrl: input.googleBusinessUrl,
      siteReadable: false,
      summary: `There is no website on your profile yet, so this review covers your Google presence only. ${fixes.length} fix${fixes.length === 1 ? '' : 'es'} to start with.`,
      checks,
      fixes,
    };
  }

  const fetched = input.fetch;
  if (!fetched || !fetched.ok || !fetched.html) {
    specs.push({
      id: 'site-unreachable',
      area: 'website',
      title: 'Make sure your website loads for visitors',
      why: `We could not read ${shownUrl}${fetched?.error && isCompliantCopy(fetched.error) ? ` (${fetched.error})` : ''}. If it is down or blocks visitors, customers and Google cannot see it either.`,
      how: 'Open the site on your phone using mobile data. If it does not load, contact whoever hosts it. If it loads for you, tell your coach so we can recheck it.',
      impact: 3,
      effort: 2,
    });
    const fixes = rankFixes(specs);
    return {
      websiteUrl: input.websiteUrl,
      googleBusinessUrl: input.googleBusinessUrl,
      siteReadable: false,
      summary: `We could not read your website this time, so the page checks are skipped. ${fixes.length} fix${fixes.length === 1 ? '' : 'es'} below.`,
      checks,
      fixes,
    };
  }

  const html = fetched.html;
  const finalUrl = fetched.finalUrl ?? input.websiteUrl;
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = metaContent(html, 'description');
  const viewport = metaContent(html, 'viewport');
  const h1 = firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const text = stripTags(html);
  const townWord = town.toLowerCase();
  const mentionsTown = townWord.length > 0 && text.toLowerCase().includes(townWord);
  const telLink = /href\s*=\s*["']tel:/i.test(html);
  const looksLikePhone = /(\+?61|\b0)[2-478](\s?\d){8}\b/.test(text);
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgsNoAlt = imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length;
  const https = /^https:/i.test(finalUrl);
  const schema = hasLocalBusinessSchema(html);

  const titleOk = Boolean(
    title && !GENERIC_TITLES.test(title) && title.length >= 15 && title.length <= 65
  );
  checks.push({ id: 'title', label: 'Page title names your trade and town', passed: titleOk });
  if (!titleOk) {
    specs.push({
      id: 'title-generic',
      area: 'website',
      title: 'Rewrite your home page title',
      why: `Your page title is ${!title ? 'missing' : isCompliantCopy(title) ? `"${title}"` : 'not about your trade and town'}. It is the blue headline people see in Google results, so it should say what you do and where.`,
      how: `Use a title like "${trade || 'Your trade'} ${town || 'your town'} | ${input.voice.businessName || 'Business name'}", kept under 60 characters.`,
      impact: 3,
      effort: 1,
    });
  }

  const descOk = Boolean(description && description.length >= 50);
  checks.push({ id: 'meta-description', label: 'Search result description', passed: descOk });
  if (!descOk) {
    specs.push({
      id: 'meta-description-missing',
      area: 'website',
      title: 'Add a search result description',
      why: 'Without one, Google picks random text from your page for the grey snippet under your link, which rarely makes someone click.',
      how: `Write one or two sentences (about 150 characters) that say what you do in ${town || 'your area'} and how to book. Your website editor usually has an "SEO description" box.`,
      impact: 2,
      effort: 1,
    });
  }

  checks.push({ id: 'h1', label: 'Main heading on the page', passed: Boolean(h1) });
  if (!h1) {
    specs.push({
      id: 'h1-missing',
      area: 'website',
      title: 'Add a clear main heading',
      why: 'Visitors decide in seconds whether you do what they need. A main heading also tells Google what the page is about.',
      how: `Put a heading at the top such as "${trade || 'Your service'} in ${town || 'your town'}" and set it as Heading 1 in your editor.`,
      impact: 2,
      effort: 1,
    });
  }

  checks.push({ id: 'town', label: 'Your town is named on the page', passed: mentionsTown });
  if (!mentionsTown) {
    specs.push({
      id: 'town-not-mentioned',
      area: 'website',
      title: `Say that you work in ${town || 'your area'}`,
      why: 'Google matches local searches to pages that name the place. If your town and suburbs are not on the page, you are less likely to show up.',
      how: `Add a short "Areas we service" line naming ${town || 'your town'} and the main suburbs you cover, in plain text, not only inside an image.`,
      impact: 3,
      effort: 1,
    });
  }

  checks.push({ id: 'tap-to-call', label: 'Tap-to-call phone number', passed: telLink });
  if (!telLink) {
    specs.push({
      id: looksLikePhone ? 'phone-not-clickable' : 'phone-missing',
      area: 'website',
      title: looksLikePhone ? 'Make your phone number tap-to-call' : 'Show your phone number',
      why: 'Most local trade enquiries come from a phone. If the number cannot be tapped, some people give up and call the next business.',
      how: 'Turn the number into a phone link (most editors have a "link to phone" option) and put it at the top of every page.',
      impact: 3,
      effort: 1,
    });
  }

  checks.push({
    id: 'local-business-schema',
    label: 'Local business details for Google',
    passed: schema,
  });
  if (!schema) {
    specs.push({
      id: 'local-business-schema-missing',
      area: 'website',
      title: 'Add local business details for Google',
      why: 'A small hidden block of business details (name, phone, area) helps Google connect your website to your Business Profile.',
      how: 'Ask your web person to add "LocalBusiness" structured data, or use your website builder\'s local business or SEO setting. Your coach can share an example.',
      impact: 2,
      effort: 2,
    });
  }

  checks.push({ id: 'mobile', label: 'Set up for phones', passed: Boolean(viewport) });
  if (!viewport) {
    specs.push({
      id: 'viewport-missing',
      area: 'website',
      title: 'Make the site display properly on phones',
      why: 'The page is missing the setting that makes it fit a phone screen, so it may look tiny or need zooming on mobile.',
      how: 'Ask your web person to add the standard mobile "viewport" setting, or move to a modern template that is built for phones.',
      impact: 2,
      effort: 2,
    });
  }

  checks.push({ id: 'https', label: 'Secure connection (https)', passed: https });
  if (!https) {
    specs.push({
      id: 'https-missing',
      area: 'website',
      title: 'Turn on a secure connection (https)',
      why: 'Browsers mark sites without https as "Not secure", which puts people off before they read anything.',
      how: 'Most hosts include a free security certificate. Ask your host to switch it on and send all visitors to the https address.',
      impact: 2,
      effort: 2,
    });
  }

  checks.push({ id: 'image-alt', label: 'Photos have descriptions', passed: imgsNoAlt === 0 });
  if (imgsNoAlt > 0) {
    specs.push({
      id: 'images-missing-alt',
      area: 'website',
      title: 'Describe your photos',
      why: `${imgsNoAlt} photo${imgsNoAlt === 1 ? ' has' : 's have'} no description. Descriptions help Google understand your work and help people using screen readers.`,
      how: `Give each photo a short description such as "${trade || 'Job'} in ${town || 'your suburb'}: before and after".`,
      impact: 1,
      effort: 1,
    });
  }

  const fixes = rankFixes(specs);
  const passed = checks.filter((c) => c.passed).length;
  const summary =
    fixes.length === 0
      ? `Your website and Google link cover the local-search basics we check (${passed} of ${checks.length}). Keep posting and collecting reviews.`
      : `We checked ${checks.length} local-search basics for ${town || 'your area'} and ${passed} are in place. Start with fix 1, "${fixes[0].title}".`;

  return {
    websiteUrl: input.websiteUrl,
    googleBusinessUrl: input.googleBusinessUrl,
    siteReadable: true,
    summary,
    checks,
    fixes,
  };
}
