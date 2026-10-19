// PHASE-1 STUB — replaced in phase 2. Exists so the new tests fail on assertions, not imports.

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
  connection: string;
  links: EcosystemLink[];
  image: EcosystemImage | null;
  imageSource: string;
  lastVerified: string;
  evidence: string[];
}

export const MAX_VERIFIED_AGE_DAYS = 90;

export const STATUS_LABEL: Record<EcosystemStatus, string> = {
  live: '',
  preview: '',
  'in-development': '',
};

export const ECOSYSTEM_PAGE_COPY = {
  metaTitle: '',
  metaDescription: '',
  eyebrow: '',
  heading: '',
  lead: '',
  noPublicSite: '',
  connectionLabel: '',
  imageToCome: '',
  newTab: '',
  visionHeading: '',
  visionParagraphs: [] as string[],
  ctaLabel: '',
  ctaHref: '',
  footerLinkLabel: '',
};

export const ECOSYSTEM_PRODUCTS: readonly EcosystemProduct[] = [];

export function ecosystemHref(url: string): string {
  return url;
}

export function isStale(_lastVerified: string, _now: Date, _maxDays = MAX_VERIFIED_AGE_DAYS): boolean {
  return false;
}

export function isFutureDated(_lastVerified: string, _now: Date): boolean {
  return false;
}

export function validateEcosystemProducts(_products: readonly EcosystemProduct[]): void {}

export function ecosystemCopyText(): string {
  return '';
}
