import { AuthorityPageView } from '@/components/industries/AuthorityPageView';
import { getAuthorityPage } from '@/lib/marketing/authority-pages';
import { getIndustryCoursesBySlugs } from '@/lib/server/industry-courses';

/**
 * Server component for a /for/<industry> page. Reads the published bundle courses once; the view
 * derives the course grid, the live-course count and the publication gate from that one list.
 */
export async function AuthorityPage({ slug }: { slug: string }) {
  const entry = getAuthorityPage(slug);
  const courses = await getIndustryCoursesBySlugs(entry.bundle.publishedSlugs);
  return <AuthorityPageView entry={entry} courses={courses} />;
}
