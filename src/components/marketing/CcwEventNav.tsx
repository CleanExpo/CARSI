import Link from 'next/link';

export const CCW_EVENT_NAV = [
  { href: '/events/ccw-roadshow', label: 'CCW Roadshow' },
  { href: '/ccw-melbourne', label: 'Melbourne' },
  { href: '/ccw-sydney', label: 'Sydney' },
  { href: '/ccw-materials', label: 'Materials' },
] as const;

export function CcwEventNav({ current }: { current: string }) {
  return (
    <nav className="mt-8 flex flex-wrap gap-2" aria-label="CCW events">
      {CCW_EVENT_NAV.map((item) => {
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
