import type { ReactNode } from 'react';

import { PUBLIC_SHELL_INNER_CLASS } from '@/components/landing/public-shell-width';

interface IndustryPageLayoutProps {
  children: ReactNode;
}

/** Light industry surface using the same shell and atmosphere as the homepage. */
export function IndustryPageLayout({ children }: IndustryPageLayoutProps) {
  return (
    <div className="relative isolate overflow-hidden bg-[#fafbfc] pb-24 text-slate-900">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[760px] bg-[radial-gradient(circle_at_8%_4%,rgba(36,144,237,0.14),transparent_34%),radial-gradient(circle_at_84%_10%,rgba(38,196,160,0.11),transparent_30%),linear-gradient(180deg,#f7fbff_0%,#fafbfc_72%,transparent_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[680px] [background-image:linear-gradient(rgba(15,23,42,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.08)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent)] [background-size:56px_56px] opacity-[0.22]"
        aria-hidden
      />
      <div className={`${PUBLIC_SHELL_INNER_CLASS} pt-8 sm:pt-12`}>{children}</div>
    </div>
  );
}
