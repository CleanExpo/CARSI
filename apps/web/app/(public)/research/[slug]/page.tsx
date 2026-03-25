import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FAQSchema, ArticleSchema, BreadcrumbSchema } from '@/components/seo';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://carsi.com.au';

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
  if (!article) return { title: 'Article Not Found | CARSI' };

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
      {/* Structured data */}
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

      <main className="min-h-screen bg-[#050505] px-4 py-16">
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumb nav */}
          <nav className="mb-8 flex items-center gap-2 text-sm text-white/30">
            <Link href="/" className="transition-colors hover:text-white/60">
              Home
            </Link>
            <span>/</span>
            <Link href="/research" className="transition-colors hover:text-white/60">
              Research
            </Link>
            <span>/</span>
            <span className="max-w-[200px] truncate text-white/50">{article.title}</span>
          </nav>

          {/* Article header */}
          <header className="mb-10">
            {article.category && (
              <Link
                href={`/research?category=${encodeURIComponent(article.category)}`}
                className="mb-4 inline-flex items-center rounded-full bg-[rgba(36,144,237,0.12)] px-3 py-1 text-xs font-medium text-[#2490ed] transition-colors hover:bg-[rgba(36,144,237,0.2)]"
              >
                {article.category}
              </Link>
            )}
            <h1 className="mb-4 text-3xl leading-tight font-bold text-white md:text-4xl">
              {article.title}
            </h1>
            {article.excerpt && (
              <p className="mb-6 text-lg leading-relaxed text-white/50">{article.excerpt}</p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-white/[0.06] pb-6 text-sm text-white/40">
              {article.author_name && (
                <span className="flex items-center gap-1.5">
                  <span className="h-5 w-5 rounded-full bg-[rgba(36,144,237,0.2)] text-center text-[10px] leading-5 text-[#2490ed]">
                    {article.author_name[0]}
                  </span>
                  {article.author_name}
                  {article.author_nrpg_id && (
                    <span className="rounded bg-[rgba(36,144,237,0.1)] px-1.5 py-0.5 text-[10px] text-[#2490ed]">
                      NRPG Member
                    </span>
                  )}
                </span>
              )}
              {article.published_at && (
                <time dateTime={article.published_at}>
                  Published {formatDate(article.published_at)}
                </time>
              )}
              {article.view_count > 0 && (
                <span>{article.view_count.toLocaleString('en-AU')} views</span>
              )}
            </div>
          </header>

          {/* Article content */}
          <article
            className="prose prose-invert prose-lg prose-headings:font-semibold prose-headings:text-white prose-p:text-white/70 prose-p:leading-relaxed prose-a:text-[#2490ed] prose-a:no-underline hover:prose-a:underline prose-strong:text-white/90 prose-code:rounded prose-code:bg-white/[0.06] prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-blockquote:border-l-[#2490ed] prose-blockquote:text-white/50 prose-hr:border-white/[0.06] max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {/* Author bio */}
          {article.author_name && article.author_bio && (
            <section className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              <h2 className="mb-3 text-sm font-semibold tracking-wider text-white/40 uppercase">
                About the Author
              </h2>
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(36,144,237,0.2)] text-lg font-semibold text-[#2490ed]">
                  {article.author_name[0]}
                </div>
                <div>
                  <p className="font-semibold text-white">{article.author_name}</p>
                  {article.author_nrpg_id && (
                    <p className="mb-2 text-xs text-[#2490ed]">
                      NRPG Member · {article.author_nrpg_id}
                    </p>
                  )}
                  <p className="text-sm text-white/50">{article.author_bio}</p>
                </div>
              </div>
            </section>
          )}

          {/* FAQ section */}
          {article.faq_items.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-6 text-2xl font-semibold text-white">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {article.faq_items.map((faq, i) => (
                  <details
                    key={i}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02] open:border-[rgba(36,144,237,0.2)]"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-base font-medium text-white/80 select-none hover:text-white">
                      {faq.question}
                      <span className="shrink-0 text-white/30 transition-transform group-open:rotate-180">
                        ▾
                      </span>
                    </summary>
                    <div className="px-6 pb-5 text-sm leading-relaxed text-white/50">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Related RestoreAssist features */}
          {article.related_restore_assist.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-lg font-semibold text-white">
                Related RestoreAssist Features
              </h2>
              <div className="flex flex-wrap gap-3">
                {article.related_restore_assist.map((f) => (
                  <a
                    key={f.feature}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-[rgba(36,144,237,0.2)] px-4 py-2 text-sm text-[#2490ed] transition-colors hover:bg-[rgba(36,144,237,0.1)]"
                  >
                    {f.feature} →
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-white/[0.06] pt-6">
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.04] px-3 py-1 text-xs text-white/40"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Back link */}
          <div className="mt-12">
            <Link
              href="/research"
              className="inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
            >
              ← Back to Research
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
