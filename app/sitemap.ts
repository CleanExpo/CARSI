import { MetadataRoute } from 'next';
import { getBackendOrigin, getPublicSiteUrl } from '@/lib/env/public-url';
import { authorityPath } from '@/lib/marketing/authority';
import { ccwRoadshowPath } from '@/lib/marketing/ccw-roadshow';
import { startSmartBasePath, startSmartPages } from '@/lib/marketing/start-smart';
import { loadWpExportCourses } from '@/lib/wordpress-export-courses';

export const dynamic = 'force-dynamic';

const baseUrl = getPublicSiteUrl();

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: '/', priority: 1.0, changeFreq: 'weekly' as const },
  { path: '/courses', priority: 0.9, changeFreq: 'daily' as const },
  { path: '/pathways', priority: 0.8, changeFreq: 'weekly' as const },
  { path: '/industries', priority: 0.8, changeFreq: 'monthly' as const },
  { path: '/ccw-training', priority: 0.78, changeFreq: 'weekly' as const },
  { path: '/ccw-materials', priority: 0.72, changeFreq: 'monthly' as const },
  { path: '/calendar', priority: 0.7, changeFreq: 'weekly' as const },
  { path: '/professional-directory', priority: 0.72, changeFreq: 'weekly' as const },
  { path: '/research', priority: 0.72, changeFreq: 'weekly' as const },
  { path: '/news', priority: 0.68, changeFreq: 'weekly' as const },
  { path: '/jobs', priority: 0.66, changeFreq: 'weekly' as const },
  { path: '/podcast', priority: 0.64, changeFreq: 'weekly' as const },
  { path: '/youtube', priority: 0.64, changeFreq: 'weekly' as const },
  { path: '/ideas', priority: 0.62, changeFreq: 'monthly' as const },
  { path: '/submit', priority: 0.58, changeFreq: 'monthly' as const },
  { path: '/subscribe', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/about', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/contact', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/testimonials', priority: 0.5, changeFreq: 'monthly' as const },
  { path: '/pricing', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/privacy', priority: 0.25, changeFreq: 'yearly' as const },
  { path: '/terms', priority: 0.25, changeFreq: 'yearly' as const },
  { path: authorityPath, priority: 0.82, changeFreq: 'weekly' as const },
  { path: ccwRoadshowPath, priority: 0.9, changeFreq: 'daily' as const },
  { path: startSmartBasePath, priority: 0.85, changeFreq: 'weekly' as const },
  ...startSmartPages.map((page) => ({
    path: `${startSmartBasePath}/${page.slug}`,
    priority: 0.78,
    changeFreq: 'weekly' as const,
  })),
  // Industry sub-pages
  { path: '/industries/aged-care', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/childcare', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/healthcare', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/construction', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/property-management', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/government-defence', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/commercial-cleaning', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/mining', priority: 0.7, changeFreq: 'monthly' as const },
  // Tier 1 expansion industries
  { path: '/industries/plumbing-trades', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/ndis-disability', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/gyms-fitness', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/real-estate', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/emergency-management', priority: 0.7, changeFreq: 'monthly' as const },
  { path: '/industries/caravan-parks', priority: 0.7, changeFreq: 'monthly' as const },
  // Tier 2 industries
  { path: '/industries/data-centres', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/education', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/food-processing', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/hospitality', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/insurance', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/museums-cultural', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/retail', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/strata', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/industries/transport-logistics', priority: 0.6, changeFreq: 'monthly' as const },
  { path: '/submit/podcast', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/youtube_channel', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/professional', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/event', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/job', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/article', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/case_study', priority: 0.45, changeFreq: 'monthly' as const },
  { path: '/submit/news_source', priority: 0.45, changeFreq: 'monthly' as const },
];

async function getCourses(): Promise<{ slug: string; updated_at?: string }[]> {
  const backendUrl = getBackendOrigin();
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
  const backendUrl = getBackendOrigin();
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

  // Dynamic course pages — prefer local LMS seed / export over remote API
  const localCourses = loadWpExportCourses();
  const courses = localCourses?.length ? localCourses : await getCourses();
  const courseEntries: MetadataRoute.Sitemap = courses.map((course) => ({
    url: `${baseUrl}/courses/${course.slug}`,
    lastModified:
      'updated_at' in course && course.updated_at
        ? new Date(course.updated_at)
        : new Date(),
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
