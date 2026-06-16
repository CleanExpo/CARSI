import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ArticleSchema, ItemListSchema } from '@/components/seo';
import { StartSmartDetail } from '@/components/marketing/StartSmartContent';
import { getPublicSiteUrl } from '@/lib/env/public-url';
import {
  getStartSmartOperatingConnections,
  getStartSmartPage,
  startSmartBasePath,
  startSmartPages,
} from '@/lib/marketing/start-smart';

const siteUrl = getPublicSiteUrl();

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return startSmartPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getStartSmartPage(slug);
  if (!page) return {};

  const canonical = `${siteUrl}${startSmartBasePath}/${page.slug}`;

  return {
    title: page.title,
    description: page.description,
    alternates: {
      canonical,
    },
    keywords: page.keywords,
    openGraph: {
      title: page.title,
      description: page.description,
      url: canonical,
      type: 'article',
      images: ['/og-image.png'],
    },
  };
}

export default async function StartSmartSubPillarPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getStartSmartPage(slug);
  if (!page) notFound();

  const canonical = `${siteUrl}${startSmartBasePath}/${page.slug}`;
  const operatingConnections = getStartSmartOperatingConnections(page.slug);

  return (
    <>
      <ArticleSchema
        headline={page.title}
        description={page.description}
        url={canonical}
        articleSection="Carpet Cleaning Business Training"
        keywords={page.keywords}
      />
      <ItemListSchema
        name={`${page.title} equipment-service-chemicals-training map`}
        description="CARSI Start Smart decision gates connecting professional equipment, service model, carpet cleaning chemicals and training."
        items={operatingConnections.map((connection) => ({
          name: connection.pillar,
          description: `${connection.impact} ${connection.decision} ${connection.evidence}`,
          url: `${canonical}#equipment-service-chemicals-training`,
        }))}
      />
      <StartSmartDetail page={page} siteUrl={siteUrl} />
    </>
  );
}
