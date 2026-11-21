import { CommunityHubShell } from '@/components/marketing/hub/CommunityHubShell';

// GP-734: this page used to fetch an ideas API that has no backing route in this app, so it
// sat on a loading message while the API client retried a failing request. Until course-idea voting is
// built and has real data, say so plainly instead of waiting on an endpoint that does not exist.
export default function CourseIdeasPage() {
  return (
    <CommunityHubShell
      eyebrow="Community & resources"
      title="Community Ideas"
      description="Course idea voting is not open yet. Until it is, tell us which courses you would like CARSI to build."
      stats={[
        { value: 'Soon', label: 'Idea voting' },
        { value: 'AU', label: 'For the field' },
      ]}
    >
      <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center">
        <p className="text-sm text-slate-500">
          Voting on course ideas is not available yet. To suggest a course, email{' '}
          <a href="mailto:support@carsi.com.au" className="font-semibold text-[#146fc2]">
            support@carsi.com.au
          </a>
          .
        </p>
      </div>
    </CommunityHubShell>
  );
}
