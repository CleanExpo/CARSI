/**
 * GP-634: plain-English review of a member's public website and Google Business Profile link.
 * Deterministic: it reads the fetched HTML and reports only what it can see. It never guesses
 * at a page it could not read. Output shape follows seo-page-fix / seo-gbp-audit: an issue, why
 * it matters to a local customer, and how to fix it, ranked by impact over effort.
 */
import { isCompliantCopy } from './compliance';
import type { MarketingFix, SiteCheck, SiteFetchResult, SiteReview, TradeVoice } from './types';

/** Known trades, most specific first. Generated copy only ever names a trade by these labels. */
const TRADE_LABELS: Array<[RegExp, string]> = [
  [/carpet|rug|upholster/i, 'carpet and upholstery cleaning'],
  [/mou?ld/i, 'mould remediation'],
  [/fire|smoke|soot/i, 'fire and smoke restoration'],
  [/water damage|flood|restor|drying/i, 'water damage restoration'],
  [/pressure|soft wash|exterior wash/i, 'pressure washing'],
  [/window/i, 'window cleaning'],
  [/clean/i, 'cleaning'],
  [/plumb|drain|gas fit/i, 'plumbing'],
  [/electric/i, 'electrical'],
  [/paint/i, 'painting'],
  [/roof|gutter/i, 'roofing'],
  [/pest|termite/i, 'pest control'],
  [/floor|tiling|tiler|\btile/i, 'flooring'],
  [/air ?con|hvac|refrigerat/i, 'air conditioning'],
  [/lawn|garden|landscap/i, 'landscaping'],
  [/build|carpent|joiner|renovat/i, 'building'],
  [/locksmith|\blocks?\b/i, 'locksmith'],
];

export function tradeLabel(trade: string, services = ''): string {
  const text = `${trade} ${services}`;
  return TRADE_LABELS.find(([pattern]) => pattern.test(text))?.[1] ?? '';
}

/**
 * Every member-visible line in the pack is built from these values. A member's profile is free
 * text and can carry a claim no word or shape check recognises ("We will fix your mould issue",
 * a town of "MouldFree": Codex P1 heads 5dfe661f, 32d27443). So no member-typed text is ever
 * displayed: no business name, no town, no services, and the trade only as a label from the fixed
 * list. The raw profile is still used to check the member's website, never to write copy.
 */
export function sanitizeVoice(voice: TradeVoice): TradeVoice {
  return {
    businessName: '',
    trade: tradeLabel(voice.trade ?? '', voice.services ?? ''),
    town: '',
    services: '',
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

/** Google's own country domains members are likely to paste (AU and NZ first). */
const GOOGLE_DOMAINS = ['google.com', 'google.com.au', 'google.co.nz', 'google.co.uk', 'google.ca'];
const GOOGLE_HOSTS = new Set(
  GOOGLE_DOMAINS.flatMap((d) => [d, `www.${d}`, `maps.${d}`, `business.${d}`])
);

export function isGoogleBusinessLink(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // A link must name one listing: generic roots, dashboards and plain searches do not
    // (Codex P1, head 4119a2a2). Short links need an ID segment after the host or prefix.
    // Web links only, and each short-link shape is matched whole so a bare prefix such as
    // g.page/r/ never counts as a listing ID (Codex P1, heads 4119a2a2 and 6735fbf0).
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const path = u.pathname.replace(/\/+$/, '');
    const ID = '[A-Za-z0-9_-]+';
    if (host === 'g.page') {
      if (path.startsWith('/r/') || path === '/r') return new RegExp(`^/r/${ID}(/.*)?$`).test(path);
      return new RegExp(`^/${ID}(/.*)?$`).test(path);
    }
    if (host === 'maps.app.goo.gl') return new RegExp(`^/${ID}$`).test(path);
    if (host === 'goo.gl') return new RegExp(`^/maps/${ID}$`).test(path);
    // Exact Google hosts only: a suffix match accepted google.com.evil.example (Codex P1, bc601506).
    if (GOOGLE_HOSTS.has(host)) {
      if (/[?&](cid|ludocid)=\d+/.test(u.search)) return true;
      if (/^\/maps\/place\/[^/]+/.test(u.pathname)) return true;
      // business.google.com pages are the owner's sign-in dashboard, not a public listing
      // (Codex P1, head 22a64240), so they never count.
      return false;
    }
    if (/^[a-z0-9-]+\.business\.site$/.test(host)) return true;
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

const TRADE_STOPWORDS = new Set(['your', 'and', 'the', 'services', 'service', 'trade', 'repairs']);

/** Five-letter stems of the trade and service words, so "Plumbing" also matches "Plumber". */
function tradeStems(trade: string, services: string): string[] {
  return `${trade} ${services}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 4 && !TRADE_STOPWORDS.has(w))
    .map((w) => w.slice(0, 5));
}

export function reviewWebsite(rawInput: ReviewInput): SiteReview {
  const input = { ...rawInput, voice: sanitizeVoice(rawInput.voice) };
  // Display wording never names the town; the raw town is used only to check the page.
  const town = '';
  const checkTown = primaryTown(rawInput.voice.town ?? '');
  const trade = input.voice.trade.trim();
  const shownUrl = 'your website';
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
  const townWord = checkTown.toLowerCase();
  const mentionsTown = townWord.length > 0 && text.toLowerCase().includes(townWord);
  const telLink = /href\s*=\s*["']tel:/i.test(html);
  const looksLikePhone = /(\+?61|\b0)[2-478](\s?\d){8}\b/.test(text);
  const imgs = html.match(/<img\b[^>]*>/gi) ?? [];
  const imgsNoAlt = imgs.filter((t) => !/\balt\s*=\s*["'][^"']+["']/i.test(t)).length;
  const https = /^https:/i.test(finalUrl);
  const schema = hasLocalBusinessSchema(html);

  // The check says the title names the trade and the town, so it tests for both (Codex P1,
  // head 0b717beb). An unknown town or trade is not required. Matching uses the member's own
  // words; nothing from them is displayed.
  const titleText = (title ?? '').toLowerCase();
  const titleNamesTown = !checkTown || titleText.includes(checkTown.toLowerCase());
  const stems = tradeStems(`${rawInput.voice.trade ?? ''} ${trade}`, rawInput.voice.services ?? '');
  const titleNamesTrade = stems.length === 0 || stems.some((stem) => titleText.includes(stem));
  const titleOk = Boolean(
    title &&
    !GENERIC_TITLES.test(title) &&
    title.length >= 15 &&
    title.length <= 65 &&
    titleNamesTown &&
    titleNamesTrade
  );
  checks.push({ id: 'title', label: 'Page title names your trade and town', passed: titleOk });
  if (!titleOk) {
    specs.push({
      id: 'title-generic',
      area: 'website',
      title: 'Rewrite your home page title',
      why: `Your page title ${!title ? 'is missing' : 'does not say your trade and town'}. It is the blue headline people see in Google results, so it should say what you do and where.`,
      how: `Use a title like "${trade || 'Your trade'} ${town || 'your town'} | Your business name", kept under 60 characters.`,
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
