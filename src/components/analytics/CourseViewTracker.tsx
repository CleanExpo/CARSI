'use client';

import { useEffect } from 'react';

import { trackFunnelEvent } from '@/lib/analytics/track-funnel-event';

interface CourseViewTrackerProps {
  slug: string;
  title?: string;
}

/**
 * Fires the `course_view` funnel event (WS3 / GP-447 / GitHub #128) once when
 * a course detail page mounts. The course detail page itself is a server
 * component (for SEO/ISR), so this small client component is the mount point
 * for the client-side analytics call.
 */
export function CourseViewTracker({ slug, title }: CourseViewTrackerProps) {
  useEffect(() => {
    trackFunnelEvent({ name: 'course_view', course_slug: slug, course_title: title });
    // The server reads the opaque HttpOnly journey cookie. No PII or campaign
    // value is exposed to this component or sent in the body.
    void fetch('/api/analytics/attribution', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseSlug: slug }),
      keepalive: true,
    }).catch(() => {});
    // Only fire once per mount (slug change = navigating to a different course).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return null;
}
