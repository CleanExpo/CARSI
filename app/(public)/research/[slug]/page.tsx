import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

import { MarketingPageShell, marketingPageInnerNarrowClass } from '@/components/marketing/MarketingPageShell';
import { FAQSchema, ArticleSchema, BreadcrumbSchema } from '@/components/seo';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import {
  marketingArticleProse,
  marketingBackLink,
  marketingBody,
  marketingDivider,
  marketingEyebrowPill,
  marketingMetaCard,
  marketingMetaLabel,
  marketingPanel,
  marketingSectionTitle,
  marketingTextMuted,
  marketingTextStrong,
  marketingTextSubtle,
  marketingTopicPill,
} from '@/lib/marketing/marketing-ui';

const BACKEND_URL = getBackendOrigin();
const SITE_URL = getPublicSiteUrl();

interface FaqItem {
  question: string;
  answer: string;
}

interface RelatedFeature {
  feature: string;
  url: string;
}

interface ArticleDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  category: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  og_image_url: string | null;
  faq_items: FaqItem[];
  author_nrpg_id: string | null;
  author_name: string | null;
  author_bio: string | null;
  related_restore_assist: RelatedFeature[];
  status: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
}

async function getArticle(slug: string): Promise<ArticleDetail | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND_URL}/api/articles/${slug}`, {
      next: { revalidate: 600 },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  _parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: 'Article Not Found' };

  const title = article.seo_title ?? `${article.title} | CARSI Research`;
  const description =
    article.seo_description ?? article.excerpt ?? `Research article by CARSI: ${article.title}`;
  const url = article.canonical_url ?? `${SITE_URL}/research/${slug}`;

  return {
    title,
    description,
    keywords: article.tags.length > 0 ? article.tags : undefined,
    authors: article.author_name ? [{ name: article.author_name }] : undefined,
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      publishedTime: article.published_at ?? undefined,
      modifiedTime: article.updated_at,
      images: article.og_image_url ? [{ url: article.og_image_url }] : undefined,
    },
    alternates: { canonical: url },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) notFound();

  const articleUrl = `${SITE_URL}/research/${slug}`;
  const breadcrumbs = [
    { name: 'Home', url: SITE_URL },
    { name: 'Research', url: `${SITE_URL}/research` },
    { name: article.title, url: articleUrl },
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <ArticleSchema
        headline={article.title}
        authorName={article.author_name ?? 'CARSI Editorial Team'}
        datePublished={article.published_at ?? article.created_at}
        dateModified={article.updated_at}
        url={articleUrl}
        image={article.og_image_url ?? undefined}
        description={article.seo_description ?? article.excerpt ?? undefined}
      />
      {article.faq_items.length > 0 && <FAQSchema questions={article.faq_items} />}

      <MarketingPageShell id="main-content" innerClassName={marketingPageInnerNarrowClass}>
        <nav className={`mb-8 flex items-center gap-2 text-sm ${marketingTextSubtle}`}>
          <Link href="/" className="transition-colors hover:text-slate-800 dark:hover:text-white/75">
            Home
          </Link>
          <span>/</span>
          <Link
            href="/research"
            className="transition-colors hover:text-slate-800 dark:hover:text-white/75"
          >
            Research
          </Link>
          <span>/</span>
          <span className={`max-w-[200px] truncate ${marketingTextMuted}`}>{article.title}</span>
        </nav>

        <header className="mb-10">
          {article.category && (
            <Link
              href={`/research?category=${encodeURIComponent(article.category)}`}
              className={`mb-4 inline-flex items-center ${marketingEyebrowPill}`}
            >
              {article.category}
            </Link>
          )}
          <h1 className={`mb-4 ${marketingSectionTitle}`}>{article.title}</h1>
          {article.excerpt && <p className={`mb-6 ${marketingBody}`}>{article.excerpt}</p>}

          <div
            className={`flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-6 text-sm ${marketingDivider} ${marketingTextSubtle}`}
          >
            {article.author_name && (
              <span className="flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#2490ed]/25 bg-[#eef7ff] text-[10px] text-[#146fc2] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]">
                  {article.author_name[0]}
                </span>
                {article.author_name}
                {article.author_nrpg_id && (
                  <span className="rounded border border-[#2490ed]/20 bg-[#eef7ff] px-1.5 py-0.5 text-[10px] text-[#146fc2] dark:border-[#2490ed]/25 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]">
                    NRPG Member
                  </span>
                )}
              </span>
            )}
            {article.published_at && (
              <time dateTime={article.published_at}>Published {formatDate(article.published_at)}</time>
            )}
            {article.view_count > 0 && (
              <span>{article.view_count.toLocaleString('en-AU')} views</span>
            )}
          </div>
        </header>

        <article
          className={marketingArticleProse}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        {article.author_name && article.author_bio && (
          <section className={`mt-12 ${marketingMetaCard}`}>
            <h2 className={`mb-3 ${marketingMetaLabel}`}>About the Author</h2>
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#2490ed]/25 bg-[#eef7ff] text-lg font-semibold text-[#146fc2] dark:border-[#2490ed]/30 dark:bg-[#2490ed]/10 dark:text-[#7ec5ff]">
                {article.author_name[0]}
              </div>
              <div>
                <p className={`font-semibold ${marketingTextStrong}`}>{article.author_name}</p>
                {article.author_nrpg_id && (
                  <p className="mb-2 text-xs text-[#146fc2] dark:text-[#7ec5ff]">
                    NRPG Member · {article.author_nrpg_id}
                  </p>
                )}
                <p className={`text-sm ${marketingTextMuted}`}>{article.author_bio}</p>
              </div>
            </div>
          </section>
        )}

        {article.faq_items.length > 0 && (
          <section className="mt-12">
            <h2 className={`mb-6 text-2xl font-semibold ${marketingTextStrong}`}>
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {article.faq_items.map((faq, i) => (
                <details
                  key={i}
                  className={`group open:border-[#2490ed]/30 ${marketingPanel}`}
                >
                  <summary
                    className={`flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-base font-medium select-none hover:text-[#146fc2] dark:hover:text-[#7ec5ff] ${marketingTextStrong}`}
                  >
                    {faq.question}
                    <span className={`shrink-0 transition-transform group-open:rotate-180 ${marketingTextSubtle}`}>
                      ▾
                    </span>
                  </summary>
                  <div className={`px-6 pb-5 text-sm leading-relaxed ${marketingTextMuted}`}>
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {article.related_restore_assist.length > 0 && (
          <section className="mt-12">
            <h2 className={`mb-4 text-lg font-semibold ${marketingTextStrong}`}>
              Related RestoreAssist Features
            </h2>
            <div className="flex flex-wrap gap-3">
              {article.related_restore_assist.map((f) => (
                <a
                  key={f.feature}
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-[#2490ed]/25 px-4 py-2 text-sm text-[#146fc2] transition-colors hover:border-[#2490ed]/40 hover:bg-[#eef7ff] dark:border-[#2490ed]/30 dark:text-[#7ec5ff] dark:hover:bg-[#2490ed]/10"
                >
                  {f.feature} →
                </a>
              ))}
            </div>
          </section>
        )}

        {article.tags.length > 0 && (
          <div className={`mt-10 flex flex-wrap gap-2 border-t pt-6 ${marketingDivider}`}>
            {article.tags.map((tag) => (
              <span key={tag} className={marketingTopicPill}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12">
          <Link href="/research" className={marketingBackLink}>
            ← Back to Research
          </Link>
        </div>
      </MarketingPageShell>
    </>
  );
}
