'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { slug: 'commercial-cleaning', label: 'Commercial Cleaning', icon: '\uD83E\uDDF9', color: '#17b8d4' },
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
      className={cn(
        'flex items-center rounded-sm border px-3 py-2 text-sm transition-colors',
        isActive
          ? 'border-primary/25 bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
      )}
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
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/50 transition-colors hover:text-muted-foreground"
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
    <aside className="scrollbar-thin relative z-10 flex min-h-screen w-[220px] flex-shrink-0 flex-col overflow-y-auto border-r border-border bg-sidebar">
      {/* Header */}
      <div className="border-b border-border px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
          CARSI Learning
        </p>
      </div>

      {/* Main nav */}
      <div className="space-y-0.5 border-b border-border px-2 py-3">
        <NavLink href="/student">My Learning</NavLink>
        <NavLink href="/student/credentials">Certificates</NavLink>
        <NavLink href="/courses">All Courses</NavLink>
        <NavLink href="/pathways">Pathways</NavLink>
      </div>

      {/* IICRC Disciplines */}
      <div className="border-b border-border px-2 py-3">
        <CollapsibleSection title="IICRC Disciplines">
          {disciplines.map((d) => (
            <Link
              key={d.code}
              href={`/courses?discipline=${d.code}`}
              className="flex items-center gap-2.5 rounded-sm border border-transparent px-3 py-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              <span
                className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
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
      <div className="border-b border-border px-2 py-3">
        <CollapsibleSection title="Industries" defaultOpen={false}>
          {industries.map((ind) => (
            <NavLink
              key={ind.slug}
              href={`/industries/${ind.slug}`}
              activePrefix={`/industries/${ind.slug}`}
            >
              <span
                className="mr-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: ind.color }}
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
