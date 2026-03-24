'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';

const disciplines = [
  { code: 'WRT', label: 'Water Restoration', color: '#2490ed' },
  { code: 'CRT', label: 'Carpet Restoration', color: '#26c4a0' },
  { code: 'ASD', label: 'Applied Structural Drying', color: '#6c63ff' },
  { code: 'OCT', label: 'Odour Control', color: '#9b59b6' },
  { code: 'CCT', label: 'Commercial Carpet', color: '#17b8d4' },
  { code: 'FSRT', label: 'Fire & Smoke', color: '#f05a35' },
  { code: 'AMRT', label: 'Applied Microbial', color: '#27ae60' },
];

const industries = [
  { slug: 'mining', label: 'Mining', icon: '\u26CF\uFE0F', color: '#f59e0b' },
  { slug: 'aged-care', label: 'Aged Care', icon: '\uD83C\uDFE5', color: '#10b981' },
  {
    slug: 'commercial-cleaning',
    label: 'Commercial Cleaning',
    icon: '\uD83E\uDDF9',
    color: '#17b8d4',
  },
];

function NavLink({
  href,
  activePrefix,
  children,
}: {
  href: string;
  activePrefix?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = activePrefix ? pathname.startsWith(activePrefix) : pathname === href;

  return (
    <Link
      href={href}
      className="flex items-center rounded-lg px-3 py-2 text-sm transition-all duration-200"
      style={
        isActive
          ? {
              background: 'rgba(36, 144, 237, 0.15)',
              color: '#2490ed',
              border: '1px solid rgba(36, 144, 237, 0.25)',
              boxShadow: '0 0 12px rgba(36, 144, 237, 0.1)',
            }
          : {
              color: 'rgba(255, 255, 255, 0.55)',
              border: '1px solid transparent',
            }
      }
    >
      {children}
    </Link>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold tracking-widest uppercase transition-colors duration-150"
        style={{ color: 'rgba(255, 255, 255, 0.3)' }}
      >
        <span>{title}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="mt-0.5 space-y-0.5">{children}</div>}
    </div>
  );
}

export function LMSContextPanel() {
  return (
    <aside
      className="scrollbar-glass relative z-10 flex min-h-screen w-[220px] flex-shrink-0 flex-col overflow-y-auto"
      style={{
        background: 'rgba(8, 12, 24, 0.75)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <p
          className="text-[10px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: 'rgba(255, 255, 255, 0.3)' }}
        >
          CARSI Learning
        </p>
      </div>

      {/* Main nav */}
      <div
        className="space-y-0.5 px-2 py-3"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        <NavLink href="/student">My Learning</NavLink>
        <NavLink href="/student/credentials">Certificates</NavLink>
        <NavLink href="/courses">All Courses</NavLink>
        <NavLink href="/pathways">Pathways</NavLink>
      </div>

      {/* IICRC Disciplines */}
      <div className="px-2 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <CollapsibleSection title="IICRC Disciplines">
          {disciplines.map((d) => (
            <Link
              key={d.code}
              href={`/courses?discipline=${d.code}`}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-all duration-200"
              style={{ border: '1px solid transparent', color: 'rgba(255, 255, 255, 0.5)' }}
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: d.color, boxShadow: `0 0 6px ${d.color}` }}
              />
              <span
                className="flex-shrink-0 font-mono text-[11px] font-bold"
                style={{ color: d.color }}
              >
                {d.code}
              </span>
              <span className="truncate text-xs leading-tight">{d.label}</span>
            </Link>
          ))}
        </CollapsibleSection>
      </div>

      {/* Industries */}
      <div className="px-2 py-3" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <CollapsibleSection title="Industries" defaultOpen={false}>
          {industries.map((ind) => (
            <NavLink
              key={ind.slug}
              href={`/industries/${ind.slug}`}
              activePrefix={`/industries/${ind.slug}`}
            >
              <span
                className="mr-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: ind.color, boxShadow: `0 0 6px ${ind.color}` }}
              />
              <span className="mr-2 text-sm">{ind.icon}</span>
              <span className="truncate text-xs leading-tight">{ind.label}</span>
            </NavLink>
          ))}
        </CollapsibleSection>
      </div>

      {/* My Progress */}
      <div className="px-2 py-3">
        <CollapsibleSection title="My Progress" defaultOpen={false}>
          <NavLink href="/student?filter=in_progress">In Progress</NavLink>
          <NavLink href="/student?filter=completed">Completed</NavLink>
        </CollapsibleSection>
      </div>
    </aside>
  );
}
