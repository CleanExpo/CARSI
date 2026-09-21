'use client';

import { createContext, useContext, type ReactNode } from 'react';

const CourseBrowseContext = createContext<{
  courseLinkBase: string;
  enrolledSlugs: ReadonlySet<string>;
}>({
  courseLinkBase: '/courses',
  enrolledSlugs: new Set(),
});

export function CourseBrowseProvider({
  courseLinkBase,
  enrolledSlugs,
  children,
}: {
  courseLinkBase: string;
  enrolledSlugs?: readonly string[];
  children: ReactNode;
}) {
  const base = courseLinkBase.replace(/\/$/, '') || '/courses';
  return (
    <CourseBrowseContext.Provider
      value={{ courseLinkBase: base, enrolledSlugs: new Set(enrolledSlugs ?? []) }}
    >
      {children}
    </CourseBrowseContext.Provider>
  );
}

export function useCourseBrowseBase() {
  return useContext(CourseBrowseContext);
}
