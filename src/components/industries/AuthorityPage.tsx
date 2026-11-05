import { AuthorityPageView } from '@/components/industries/AuthorityPageView';
import { loadAuthorityPageCourses } from '@/lib/server/authority-page-data';

/**
 * Server component for a /for/<industry> page. Reads the published bundle courses once; the view
 * derives the course grid, the live-course count and the publication gate from that one list.
 */
export async function AuthorityPage({ slug }: { slug: string }) {
  const { entry, courses } = await loadAuthorityPageCourses(slug);
  return <AuthorityPageView entry={entry} courses={courses} />;
}
