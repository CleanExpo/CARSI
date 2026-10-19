/**
 * The CARSI ecosystem: the restoration businesses CARSI's training connects to, and the single
 * source of every fact and string the /ecosystem page shows.
 *
 * Every product fact here was read from the product's own code (origin/main of its repo) or its
 * live site on `lastVerified`, and is cited in `evidence`. Spec with the full evidence table:
 * ~/.local/state/gs/projects/CARSI/spm/2026-10-19-ecosystem-coming-soon/spec.md (Amendment 3).
 *
 * Status must be true today. A product stays on the page only while its `lastVerified` date is
 * within MAX_VERIFIED_AGE_DAYS; products.test.ts fails after that, so a stale "Live" or
 * "In development" cannot sit here unnoticed. Re-check, then bump the date — never bump it alone.
 *
 * Copy rules (licence-critical, CLAUDE.md): no IICRC, CEC, certification or accreditation wording
 * about any product, no superlatives or comparisons, no ownership or endorsement claims, and no
 * third-party prices or trial terms. src/lib/ecosystem/copy-guard.ts enforces this on the
 * rendered page. All copy is DRAFT until Phill signs it off.
 *
 * Swapping in a logo is a one-line change to that product's `image` (file under
 * public/images/ecosystem/, at most 480 px on its longest side and 80 KB, declared at its real
 * size); update `imageSource` with where it came from.
 */

export type EcosystemStatus = 'live' | 'preview' | 'in-development';

export interface EcosystemLink {
  label: string;
  url: string;
}

export interface EcosystemImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface EcosystemProduct {
  slug: string;
  name: string;
  status: EcosystemStatus;
  summary: string;
  /** What CARSI's training actually does for, or inside, this product (from its code). */
  connection: string;
  /** Empty when there is no public site to send anyone to. */
  links: EcosystemLink[];
  /** null renders a marked placeholder tile until an owner-approved logo exists. */
  image: EcosystemImage | null;
  imageSource: string;
  /** YYYY-MM-DD, UTC. */
  lastVerified: string;
  evidence: string[];
}

export const MAX_VERIFIED_AGE_DAYS = 90;

export const STATUS_LABEL: Record<EcosystemStatus, string> = {
  live: 'Live',
  preview: 'Preview',
  'in-development': 'In development',
};

export const ECOSYSTEM_PAGE_COPY = {
  metaTitle: 'Ecosystem',
  metaDescription:
    'CARSI is the training hub of a connected Australian restoration ecosystem: RestoreAssist, NRPG, Disaster Recovery, Restoration World and CleanExpo247, and how CARSI training connects to each.',
  eyebrow: 'The CARSI ecosystem',
  heading: 'The training hub of a connected restoration ecosystem',
  lead: 'CARSI is the learning platform at the centre of five connected restoration businesses. Each card shows what the business does, how CARSI training connects to it, and where it stands today.',
  noPublicSite: 'No public site yet',
  connectionLabel: 'How CARSI connects',
  imageToCome: 'Image to come',
  newTab: '(opens in a new tab)',
  visionHeading: 'Where we’re heading',
  visionParagraphs: [
    'Restoration work runs on trust. The owner of a flooded home has to trust the technician who turns up, and the insurer has to trust the report that comes back. Most people in this trade earn that trust every week, often with little on paper to show for it.',
    'CARSI is where the training sits. CARSI courses and membership count toward NRPG membership, and Disaster Recovery asks the contractors it works with to hold a CARSI account. RestoreAssist leaves formal training to CARSI, the CleanExpo247 hall gives CARSI a theatre, and Restoration World’s technician pathway runs through CARSI.',
    'The aim is training that shows up in the work. When a technician’s learning sits next to their job records and their network membership, good work is easier to show and easier to find, for the people doing it and the people paying for it. If you work in restoration and want a say in how this develops, talk to us.',
  ],
  ctaLabel: 'Talk to us',
  ctaHref: '/contact',
  footerLinkLabel: 'See the ecosystem',
};

export const ECOSYSTEM_PRODUCTS: readonly EcosystemProduct[] = [
  {
    slug: 'restoreassist',
    name: 'RestoreAssist',
    status: 'live',
    summary:
      'RestoreAssist is restoration management software for contractors in Australia and New Zealand. You capture the job on site, then build the report, scope and invoice in the same workspace.',
    connection:
      'RestoreAssist leaves formal training to CARSI and points its users to CARSI for further learning.',
    links: [{ label: 'Visit RestoreAssist', url: 'https://restoreassist.app' }],
    image: {
      src: '/images/ecosystem/restoreassist.webp',
      width: 480,
      height: 402,
      alt: 'RestoreAssist logo',
    },
    imageSource:
      'RestoreAssist logo from https://restoreassist.app/logo.png (same file as public/logo.png in CleanExpo/RestoreAssist), resized to 480 px WebP on 2026-10-19.',
    lastVerified: '2026-10-19',
    evidence: [
      'https://restoreassist.app/ (HTTP 200, "Live today")',
      'CleanExpo/RestoreAssist@e5a5c428b spec.md:254 ("CARSI trains; RestoreAssist guides")',
      'CleanExpo/RestoreAssist@e5a5c428b app/resources/avian-influenza-site-documentation/page.tsx:53',
    ],
  },
  {
    slug: 'nrpg',
    name: 'NRPG',
    status: 'live',
    summary:
      'NRPG is a contractor network for restoration businesses across Australia and New Zealand. Contractors apply online to join. Its application page lists insurance leads and professional development among what members get.',
    connection:
      'CARSI membership and completed CARSI courses count toward NRPG membership, and NRPG onboarding includes a CARSI step.',
    links: [
      { label: 'Visit nrpg.business', url: 'https://nrpg.business' },
      {
        label: 'Apply to join the NRPG network',
        url: 'https://www.disasterrecovery.com.au/contractor/apply',
      },
    ],
    image: null,
    imageSource:
      'Placeholder: the only NRPG logo file found (https://nrpg.business/images/brand/nrpg-logo-full.png) carries an AI-generator watermark, so it is not used. Clean, owned NRPG logo requested from Phill 2026-10-19.',
    lastVerified: '2026-10-19',
    evidence: [
      'https://nrpg.business/ (HTTP 200; Vercel project dr-nrpg-platform per founder 2026-10-19)',
      'https://www.disasterrecovery.com.au/contractor/apply (HTTP 200, "Apply to Join | NRPG Contractor Network")',
      'CleanExpo/DR-NRPG@fad05dec apps/web/lib/nrpg/calculate-points.ts:8,145-167',
      'CleanExpo/DR-NRPG@fad05dec apps/web/app/api/onboarding/nrpg/phases/route.ts:305',
    ],
  },
  {
    slug: 'disaster-recovery',
    name: 'Disaster Recovery',
    status: 'live',
    summary:
      'Disaster Recovery connects property owners, tenants and businesses with restoration contractors in every state and territory. It arranges the match. The work itself is done by independent contractors in the NRPG network.',
    connection:
      'Contractors joining the Disaster Recovery network confirm an active CARSI account, and its minimum training requirements name CARSI as the training provider.',
    links: [{ label: 'Visit Disaster Recovery', url: 'https://www.disasterrecovery.com.au' }],
    image: null,
    imageSource:
      'Placeholder: the Disaster Recovery logo file carries the tagline "Property Restoration Services", which Disaster Recovery says it does not provide. Clean wordmark requested from Phill 2026-10-19.',
    lastVerified: '2026-10-19',
    evidence: [
      'https://www.disasterrecovery.com.au/about (HTTP 200)',
      'CleanExpo/Disaster-Recovery@5e5f06ad src/components/contractor/onboarding/Step0Eligibility.tsx:8,76',
      'CleanExpo/Disaster-Recovery@5e5f06ad app/certifications/minimum-training-requirements/page.tsx:41',
    ],
  },
  {
    slug: 'restoration-world',
    name: 'Restoration World',
    status: 'in-development',
    summary:
      'Restoration World is a game set in the restoration industry. It is in private testing, so there is no public site or release date yet.',
    connection:
      'In the game’s design, a new technician’s training pathway runs through CARSI, with CARSI instructors as its planned assessors.',
    links: [],
    image: {
      src: '/images/ecosystem/restoration-world.png',
      width: 480,
      height: 154,
      alt: 'Restoration World logo',
    },
    imageSource:
      'Restoration World logo, direction B "Rising District", chosen by Phill 2026-10-19: ~/Desktop/ecosystem-logo-concepts-2026-10-19/restoration-world/B-rising-district/final/rw-lockup-primary-web-480.png (sha256 c747c542…56d4a4), copied unchanged.',
    lastVerified: '2026-10-19',
    evidence: [
      'CleanExpo/Restoration-World@e73c3e9 README.md:2 ("Private staging build")',
      'CleanExpo/Restoration-World@395c73b (rw/full-history) docs/BRIEF.md:27, docs/GOVERNANCE.md:28',
    ],
  },
  {
    slug: 'cleanexpo247',
    name: 'CleanExpo247',
    status: 'preview',
    summary:
      'CleanExpo247 is a walk-through trade expo for Australian restoration professionals, built to be visited from any device at any hour. It is in preview, and supplier booking is not open yet.',
    connection:
      'The hall has a CARSI Theatre, where CARSI course introductions play on the big screen.',
    links: [],
    image: null,
    imageSource: 'Placeholder: no CleanExpo247 logo chosen yet (Phill, 2026-10-19).',
    lastVerified: '2026-10-19',
    evidence: [
      'https://www.disasterrecovery.com.au/trade-hall (HTTP 307 to a noindex preview host; "CleanExpo247 · Preview")',
      'CleanExpo/CleanExpo247-Coastal-Pavilion@53e21ac index.html:258,833-836,1218',
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function utcDay(value: string): number {
  if (!ISO_DATE.test(value)) throw new Error(`lastVerified must be YYYY-MM-DD, got "${value}"`);
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`lastVerified is not a real date: "${value}"`);
  return ms;
}

function todayUtc(now: Date): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

/** True once `lastVerified` is more than `maxDays` whole UTC days before `now`. */
export function isStale(lastVerified: string, now: Date, maxDays = MAX_VERIFIED_AGE_DAYS): boolean {
  return (todayUtc(now) - utcDay(lastVerified)) / DAY_MS > maxDays;
}

/** True when `lastVerified` is later than tomorrow (UTC): a typo that would never go stale. */
export function isFutureDated(lastVerified: string, now: Date): boolean {
  return utcDay(lastVerified) - todayUtc(now) > DAY_MS;
}

/** Adds utm_source=carsi&utm_medium=ecosystem, keeping path, query and fragment. Idempotent. */
export function ecosystemHref(url: string): string {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'carsi');
  u.searchParams.set('utm_medium', 'ecosystem');
  return u.toString();
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

/** Throws when a product's status does not match what a visitor can actually reach. */
export function validateEcosystemProducts(products: readonly EcosystemProduct[]): void {
  const seen = new Set<string>();
  for (const p of products) {
    const where = `ecosystem product "${p.slug}"`;
    if (seen.has(p.slug)) throw new Error(`${where}: duplicate slug`);
    seen.add(p.slug);
    if (!p.summary.trim() || !p.connection.trim()) throw new Error(`${where}: missing copy`);
    if (p.evidence.length === 0) throw new Error(`${where}: no evidence recorded`);
    utcDay(p.lastVerified);
    for (const l of p.links) {
      if (!isHttpsUrl(l.url)) throw new Error(`${where}: link must be https, got "${l.url}"`);
    }
    if (p.status === 'live' && p.links.length === 0) {
      throw new Error(`${where}: "live" needs a public link`);
    }
    if (p.status === 'in-development' && p.links.length > 0) {
      throw new Error(`${where}: "in development" must not link anywhere`);
    }
  }
}

/** Every public string the page and its metadata render, for the copy gates. */
export function ecosystemCopyText(): string {
  const c = ECOSYSTEM_PAGE_COPY;
  return [
    c.metaTitle,
    c.metaDescription,
    c.eyebrow,
    c.heading,
    c.lead,
    ...ECOSYSTEM_PRODUCTS.flatMap((p) => [
      p.name,
      STATUS_LABEL[p.status],
      p.summary,
      `${c.connectionLabel}: ${p.connection}`,
      ...(p.links.length ? p.links.map((l) => l.label) : [c.noPublicSite]),
    ]),
    c.imageToCome,
    c.visionHeading,
    ...c.visionParagraphs,
    c.ctaLabel,
    c.footerLinkLabel,
  ].join('\n');
}
