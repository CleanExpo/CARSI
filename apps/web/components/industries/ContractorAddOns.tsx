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
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p
              className="mb-2 text-xs tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Tender Pre-Qualification
            </p>
            <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Government Panel <span style={{ color: accentColor }}>Requirements</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              IICRC certification is increasingly required for government restoration contracts.
              Position your business for Commonwealth, state, and local government work.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {governmentPanels.map((panel) => (
              <div
                key={panel.name}
                className="rounded-lg p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <FileCheck className="h-4 w-4" style={{ color: accentColor }} />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    {panel.name}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {panel.requirement}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Cleaners Section */}
      <section className="px-6 py-16" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <p
              className="mb-2 text-xs tracking-wide uppercase"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              For Cleaning Contractors
            </p>
            <h2 className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Upgrade Your <span style={{ color: '#ed9d24' }}>Service Offering</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              ISSA-aligned cleaning businesses can add IICRC certifications to differentiate from
              competitors, qualify for insurance work, and charge 30-50% higher rates for
              restoration services.
            </p>
          </div>

          <div className="space-y-3">
            {cleanerUpgrades.map((upgrade) => (
              <div
                key={upgrade.base}
                className="flex flex-col items-start gap-4 rounded-lg p-5 sm:flex-row sm:items-center"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Briefcase
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {upgrade.base}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    +
                  </span>
                  <span
                    className="rounded px-2 py-0.5 font-mono text-xs font-bold"
                    style={{
                      background: `${accentColor}20`,
                      color: accentColor,
                      border: `1px solid ${accentColor}40`,
                    }}
                  >
                    {upgrade.addon}
                  </span>
                </div>
                <ArrowRight
                  className="hidden h-4 w-4 sm:block"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                />
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" style={{ color: '#27ae60' }} />
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {upgrade.benefit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium text-white transition-opacity duration-150 hover:opacity-90"
              style={{ background: '#ed9d24' }}
            >
              Browse Certification Courses <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pathways"
              className="inline-flex items-center gap-2 rounded-md px-6 py-3 font-medium transition-colors duration-150 hover:text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              View Learning Pathways
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
