/**
 * GP-634: plain-English review of a member's public website and Google Business Profile link.
 * Deterministic: it reads the fetched HTML and reports only what it can see. It never guesses
 * at a page it could not read. Output shape follows seo-page-fix / seo-gbp-audit: an issue, why
 * it matters to a local customer, and how to fix it, ranked by impact over effort.
 */
import { isCompliantCopy } from './compliance';
import type { MarketingFix, SiteCheck, SiteFetchResult, SiteReview, TradeVoice } from './types';

/**
 * Known trades. Generated copy only ever names a trade by these labels. Each rule matches one
 * WHOLE word of the member's trade (lower case, letters only), never a fragment of one, so
 * "fireplace" is not "fire" and "moulding" is not "mould" (Codex P1, head 593a73d4).
 */
const TRADE_WORDS: Array<[RegExp, string]> = [
  [/^waterproof\w*$/, 'waterproofing'],
  [/^(?:biohazards?|trauma|crime|scene)$/, 'biohazard cleaning'],
  [/^asbestos$/, 'asbestos removal'],
  [/^odou?rs?$/, 'odour removal'],
  [/^graffiti$/, 'graffiti removal'],
  [/^ducts?$/, 'duct cleaning'],
  [/^detail(?:ing|er|ers)$/, 'car detailing'],
  [/^(?:carpets?|rugs?|upholster\w*)$/, 'carpet and upholstery cleaning'],
  [/^mou?lds?$/, 'mould remediation'],
  [/^(?:fire|smoke|soot)$/, 'fire and smoke restoration'],
  [/^(?:water|flood\w*|drying)$/, 'water damage restoration'],
  [/^restor\w*$/, 'restoration'],
  [/^pressure$/, 'pressure washing'],
  [/^windows?$/, 'window cleaning'],
  [/^clean(?:er|ers|ing)?$/, 'cleaning'],
  [/^(?:plumb\w*|gas|gasfit\w*)$/, 'plumbing'],
  [/^(?:electric\w*|sparky|sparkies)$/, 'electrical'],
  [/^paint(?:er|ers|ing)?$/, 'painting'],
  [/^(?:roof\w*|gutters?|guttering)$/, 'roofing'],
  [/^(?:pests?|termites?)$/, 'pest control'],
  [/^(?:floor\w*|til(?:e|es|er|ers|ing))$/, 'flooring'],
  [/^(?:air|con|aircon|condition\w*|hvac|refrigerat\w*)$/, 'air conditioning'],
  [/^(?:lawns?|mowing|gardens?|gardener|gardening|landscap\w*)$/, 'landscaping'],
  [/^(?:build\w*|carpent\w*|joiner\w*|renovat\w*)$/, 'building'],
  [/^(?:locksmiths?|locks?)$/, 'locksmith'],
  [/^(?:mechanics?|mechanical|vehicles?|automotive|auto|panel|beater|beating)$/, 'mechanical'],
  [/^(?:handym[ae]n|odd|jobs)$/, 'handyman'],
  [/^concret\w*$/, 'concreting'],
  [/^fenc(?:e|es|er|ers|ing)$/, 'fencing'],
  [/^(?:glaz\w*|glass)$/, 'glazing'],
  [/^plaster\w*$/, 'plastering'],
  [/^brick\w*$/, 'bricklaying'],
  [/^solar$/, 'solar installation'],
  [/^(?:arborists?|trees?)$/, 'tree care'],
  [/^pools?$/, 'pool care'],
  [/^appliances?$/, 'appliance service'],
  [/^(?:removalists?|removals)$/, 'removals'],
];

/** Words that describe how or where a trade works, never which trade it is. */
const NEUTRAL_WORDS = new Set(
  (
    'and the of a an for mobile residential commercial domestic industrial strata local general ' +
    'specialist specialists contractor contractors contracting professional professionals services ' +
    'service servicing solutions maintenance installation installations installer installers ' +
    'install removal control remediation care fitter fitters fitting technician technicians tech ' +
    'operator owner business co company pty ltd car cars wash washing soft exterior interior home ' +
    'house damage'
  ).split(' ')
);

/** Every label generated copy can use; each must map back to itself (tested). */
export const KNOWN_TRADE_LABELS: readonly string[] = [...new Set(TRADE_WORDS.map(([, l]) => l))];

/**
 * Broad activity labels. One gives way to a specific label only when that label is a KIND of the
 * activity: "Carpet cleaning" is carpet cleaning, but "Roof cleaning" is a cleaner, not a roofer,
 * so it gets no label (GP-634 pre-review probe, head 0e87b2de).
 */
const GENERIC_KINDS: Record<string, ReadonlySet<string>> = {
  cleaning: new Set([
    'carpet and upholstery cleaning',
    'window cleaning',
    'duct cleaning',
    'biohazard cleaning',
    'car detailing',
    'pressure washing',
    'odour removal',
    'graffiti removal',
    'mould remediation',
    'pool care',
    'fire and smoke restoration',
    'water damage restoration',
  ]),
  restoration: new Set([
    'fire and smoke restoration',
    'water damage restoration',
    'mould remediation',
  ]),
};

/**
 * Labels whose word names only the object, not the activity: "Carpet fitter" and "Windows" do not
 * clean anything, so these need a cleaning word in the same text.
 */
const NEEDS_CLEANING_WORD = new Set(['carpet and upholstery cleaning', 'window cleaning', 'duct cleaning']);
const CLEANING_WORD = /^(?:clean(?:er|ers|ing)?|wash(?:er|ers|es|ing)?)$/;

/**
 * null: the text names no trade at all. '': it is not positively identified, because a word is
 * not understood ("Window tinting"), it names two trades ("Window glazing"), a broad activity is
 * paired with a trade that is not a kind of it ("Roof cleaning"), or an object word has no
 * activity ("Carpet fitter").
 */
function labelFor(text: string, activityElsewhere = false): string | null {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  const found = new Set<string>();
  for (const w of words) {
    if (NEUTRAL_WORDS.has(w)) continue;
    const hit = TRADE_WORDS.find(([re]) => re.test(w));
    if (!hit) return '';
    found.add(hit[1]);
  }
  if (found.size === 0) return null;
  const generic = [...found].filter((l) => l in GENERIC_KINDS);
  const specific = [...found].filter((l) => !(l in GENERIC_KINDS));
  if (specific.length === 0) return generic.length === 1 ? generic[0] : '';
  if (specific.length > 1) return '';
  const [label] = specific;
  if (generic.some((g) => !GENERIC_KINDS[g].has(label))) return '';
  if (NEEDS_CLEANING_WORD.has(label) && !activityElsewhere && !words.some((w) => CLEANING_WORD.test(w)))
    return '';
  return label;
}

/**
 * The member's trade as a fixed label, or '' when it is not positively identified. List order
 * never decides, and an unknown word or a second trade gives no label, so the member sees general
 * wording and the notice rather than another trade's wording (Codex P1, heads 02eba1cb,
 * 593a73d4). The trade field decides; services are read only when it names no trade at all.
 */
export function tradeLabel(trade: string, services = ''): string {
  const fromTrade = labelFor(trade);
  if (fromTrade === null) return labelFor(services) ?? '';
  if (fromTrade !== '') return fromTrade;
  // "Carpet & upholstery" names only the object; the activity may be in services, but only
  // when services on their own identify the very same label ("Carpet cleaning, rug cleaning").
  const objectOnly = labelFor(trade, true);
  return objectOnly && NEEDS_CLEANING_WORD.has(objectOnly) && labelFor(services) === objectOnly
    ? objectOnly
    : '';
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
  // business.* is the owner's sign-in dashboard, never a public listing (Codex P1, ce8eb97f).
  GOOGLE_DOMAINS.flatMap((d) => [d, `www.${d}`, `maps.${d}`])
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
      // Only whole listing shapes count: a marker is read only on the path that carries a
      // listing, never anywhere on the host ("/robots.txt?cid=123": Codex P1, head 7c3a51b7).
      // business.google.com pages are the owner's sign-in dashboard, not a public listing
      // (Codex P1, head 22a64240), so they never count.
      const numeric = (name: string) => /^\d+$/.test(u.searchParams.get(name) ?? '');
      const mapsPath = path === '/maps' || (path === '' && host.startsWith('maps.'));
      if (mapsPath && numeric('cid')) return true;
      if (path === '/search' && numeric('ludocid')) return true;
      if (/^\/maps\/place\/[^/]+(\/.*)?$/.test(path)) return true;
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
  const auditNote =
    ' This is an automated first pass on your home page, not a full SEO audit. Your coach can go deeper in session.';
  const summary =
    fixes.length === 0
      ? `Your website and Google link cover the local-search basics we check (${passed} of ${checks.length}). Keep posting and collecting reviews.${auditNote}`
      : `We checked ${checks.length} local-search basics for ${town || 'your area'} and ${passed} are in place. Start with fix 1, "${fixes[0].title}".${auditNote}`;

  return {
    websiteUrl: input.websiteUrl,
    googleBusinessUrl: input.googleBusinessUrl,
    siteReadable: true,
    summary,
    checks,
    fixes,
  };
}
