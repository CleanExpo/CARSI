import type React from 'react';
import { CheckCircle2, ArrowRight, FileCheck, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface PanelItem {
  name: string;
  requirement: string;
}

interface ContractorAddOnsProps {
  accentColor?: string;
}

const governmentPanels: PanelItem[] = [
  { name: 'AusTender (Commonwealth)', requirement: 'IICRC credentials for pre-qualification' },
  { name: 'Defence Maintenance', requirement: 'Base maintenance and heritage buildings' },
  { name: 'NSW Construct NSW', requirement: 'Building remediation work' },
  { name: 'VIC Category C Panel', requirement: 'Required for restoration contracts' },
  { name: 'QLD QBuild', requirement: 'Government facility maintenance' },
  { name: 'Local Council Panels', requirement: '537 councils across Australia' },
];

const cleanerUpgrades = [
  {
    base: 'General Cleaning',
    addon: 'WRT',
    benefit: 'Offer emergency flood response services',
  },
  {
    base: 'Carpet Cleaning',
    addon: 'CRT',
    benefit: 'Insurance restoration work (higher margins)',
  },
  {
    base: 'Commercial Cleaning',
    addon: 'AMRT',
    benefit: 'Mould inspection and remediation',
  },
  {
    base: 'Facility Maintenance',
    addon: 'ASD',
    benefit: 'Structural drying for building managers',
  },
  {
    base: 'Specialised Cleaning',
    addon: 'OCT + FSRT',
    benefit: 'Odour and fire damage restoration',
  },
];

export function ContractorAddOns({ accentColor = '#2490ed' }: ContractorAddOnsProps) {
  return (
    <>
      {/* Government Panels Section */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground/60">
              Tender Pre-Qualification
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              Government Panel <span style={{ color: accentColor }}>Requirements</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              IICRC certification is increasingly required for government restoration contracts.
              Position your business for Commonwealth, state, and local government work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {governmentPanels.map((panel) => (
              <div
                key={panel.name}
                className="rounded-sm border border-border bg-secondary p-5"
              >
                <div className="mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" style={{ color: accentColor } as React.CSSProperties} />
                  <span className="text-sm font-semibold text-foreground">
                    {panel.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                  {panel.requirement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Cleaners Section */}
      <section className="border-t border-border px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground/60">
              For Cleaning Contractors
            </p>
            <h2 className="text-2xl font-bold text-foreground">
              Upgrade Your <span className="text-carsi-orange">Service Offering</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              ISSA-aligned cleaning businesses can add IICRC certifications to differentiate from
              competitors, qualify for insurance work, and charge 30-50% higher rates for
              restoration services.
            </p>
          </div>

          <div className="space-y-3">
            {cleanerUpgrades.map((upgrade) => (
              <div
                key={upgrade.base}
                className="flex flex-col items-start gap-4 rounded-sm border border-border bg-secondary p-5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {upgrade.base}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground/60">
                    +
                  </span>
                  <span
                    className="rounded px-2 py-0.5 font-mono text-xs font-bold ring-1"
                    style={{ color: accentColor, background: `${accentColor}20`, '--tw-ring-color': `${accentColor}40` } as React.CSSProperties}
                  >
                    {upgrade.addon}
                  </span>
                </div>
                <ArrowRight className="hidden h-4 w-4 text-muted-foreground/60 sm:block" />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                  <span className="text-sm text-muted-foreground">
                    {upgrade.benefit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-sm bg-carsi-orange px-6 py-3 font-medium text-white transition-opacity duration-150 hover:opacity-90"
            >
              Browse Certification Courses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex items-center gap-2 rounded-sm border border-border bg-secondary px-6 py-3 font-medium text-muted-foreground transition-colors duration-150 hover:text-white"
            >
              View Learning Pathways
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
