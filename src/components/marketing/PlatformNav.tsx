import Link from 'next/link';

import { ROLE_GUIDES_HUB_PATH } from '@/lib/marketing/role-guides-path';

export const PLATFORM_NAV = [
  { href: '/restoration-training-cost-australia', label: 'Training costs' },
  { href: '/ccw-training', label: 'Business Coaching' },
  { href: '/ccw-training/workshop', label: 'CCW Workshop' },
  { href: '/start-carpet-cleaning-business', label: 'Start Smart' },
  { href: '/authority', label: 'Authority Hub' },
  { href: ROLE_GUIDES_HUB_PATH, label: 'Role guides' },
  { href: '/testimonials', label: 'Testimonials' },
  { href: '/podcast', label: 'Podcast' },
] as const;

export function PlatformNav({ current }: { current: string }) {
  return (
    <nav
      className="mt-8 flex w-full max-w-4xl flex-wrap justify-center gap-2 lg:justify-start"
      aria-label="CARSI platform"
    >
      {PLATFORM_NAV.map((item) => {
        const active = item.href === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
              active
                ? 'border-[#146fc2] bg-[#146fc2] text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#2490ed]/40 hover:text-[#146fc2]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
