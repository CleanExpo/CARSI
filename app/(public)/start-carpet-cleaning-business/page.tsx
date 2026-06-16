import type { Metadata } from 'next';

import { ArticleSchema, ItemListSchema } from '@/components/seo';
import { StartSmartHub } from '@/components/marketing/StartSmartContent';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  startSmartBasePath,
  startSmartHubKeywords,
  startSmartPages,
  startSmartReadinessLoop,
} from '@/lib/marketing/start-smart';

const siteUrl = getPublicSiteUrl();
const canonical = `${siteUrl}${startSmartBasePath}`;

export const metadata: Metadata = {
  title: 'Start a Carpet Cleaning Business | CARSI Start Smart Pathway',
  description:
    'CARSI Start Smart helps beginners, cleaners and business buyers learn carpet cleaning science, equipment, chemistry, quoting and trust before risking money or customer work.',
  alternates: {
    canonical,
  },
  keywords: startSmartHubKeywords,
  openGraph: {
    title: 'Start a Carpet Cleaning Business | CARSI Start Smart Pathway',
    description:
      'A practical CARSI pathway for carpet cleaning startup research, existing cleaners, business buyers and equipment decisions.',
    url: canonical,
    type: 'article',
    images: ['/og-image.png'],
  },
};

export default function StartCarpetCleaningBusinessPage() {
  return (
    <>
      <ArticleSchema
        headline="Start a Carpet Cleaning Business With Knowledge Before Risk"
        description="CARSI Start Smart helps people researching carpet cleaning as a business, add-on service or acquisition understand the knowledge to build before spending money or taking customer work."
        url={canonical}
        articleSection="Carpet Cleaning Business Training"
        keywords={startSmartHubKeywords}
      />
      <ItemListSchema
        name="CARSI Start Smart carpet cleaning business pathway"
        description="Sub-pillar pages for carpet cleaning startup, add-on service, business acquisition, equipment, chemistry, pricing, certification and niche selection."
        items={startSmartPages.map((page) => ({
          name: page.title,
          description: page.description,
          url: `${siteUrl}${startSmartBasePath}/${page.slug}`,
        }))}
      />
      <ItemListSchema
        name="CARSI Start Smart Professional Readiness Loop"
        description="The four connected readiness pillars a carpet cleaning operator should align before buying gear, advertising services, selecting products or taking paid work."
        items={startSmartReadinessLoop.map((pillar) => ({
          name: pillar.label,
          description: `${pillar.summary} ${pillar.connection} ${pillar.proofQuestion}`,
          url: `${siteUrl}${pillar.href}`,
        }))}
      />
      <StartSmartHub siteUrl={siteUrl} />
    </>
  );
}
