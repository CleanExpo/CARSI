import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_FRONTEND_URL ?? 'https://carsi.com.au';

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '/', priority: 1.0, changeFreq: 'weekly' as const },
  { path: '/courses', priority: 0.9, changeFreq: 'daily' as const },
  { path: '/pathways', priority: 0.8, changeFreq: 'weekly' as const },
  { path: '/industries', priority: 0.8, changeFreq: 'monthly' as const },
  { path: '/subscribe', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/about', priority: 0.6, changeFreq: 'monthly' as const },
  // Industry sub-pages
  { path: '/industries/aged-care', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/childcare', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/healthcare', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/construction', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/property-management', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/government-defence', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/commercial-cleaning', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/mining', priority: 0.7, changeFreq: 'monthly' as const },
];

async function getCourses(): Promise<{ slug: string; updated_at?: string }[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/courses?limit=500`, {
      next: { revalidate: 3600 }, // Revalidate hourly
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? [];
  } catch {
    return [];
  }
}

async function getPathways(): Promise<{ slug: string; updated_at?: string }[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/pathways`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? data ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFreq,
    priority: page.priority,
  }));

  // Dynamic course pages
  const courses = await getCourses();
  const courseEntries: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug}`,
    lastModified: course.updated_at ? new Date(course.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Dynamic pathway pages
  const pathways = await getPathways();
  const pathwayEntries: MetadataRoute.Sitemap = pathways.map((pathway) => ({
    url: `${baseUrl}/pathways/${pathway.slug}`,
    lastModified: pathway.updated_at ? new Date(pathway.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticEntries, ...courseEntries, ...pathwayEntries];
}
