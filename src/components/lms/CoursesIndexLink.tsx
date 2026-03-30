'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { useCourseBrowseBase } from '@/components/lms/CourseBrowseContext';

type LinkProps = Omit<ComponentProps<typeof Link>, 'href'>;

/**
 * "Courses" index link — `/courses` or `/dashboard/courses` when under {@link CourseBrowseProvider}.
 */
export function CoursesIndexLink(props: LinkProps) {
  const { courseLinkBase } = useCourseBrowseBase();
  return <Link href={courseLinkBase} {...props} />;
}
