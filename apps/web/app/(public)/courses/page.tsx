import type { Metadata } from 'next';

import { BundlePricingCard } from '@/components/lms/BundlePricingCard';
import { CourseGrid } from '@/components/lms/CourseGrid';
import { CECCalculator } from '@/components/tools/CECCalculator';

export const metadata: Metadata = {
  title: 'IICRC-Approved Restoration Training Courses | CARSI',
  description:
    'What courses does CARSI offer? Browse 91+ IICRC CEC-approved restoration and cleaning courses across WRT, CRT, ASD, AMRT, FSRT, OCT and CCT disciplines. Earn continuing education credits online.',
};

interface SearchParams {
  category?: string;
  level?: string;
  discipline?: string;
}

async function getBundles() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/bundles`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items ?? data ?? [];
  } catch {
    return [];
  }
}

async function getCourses() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${backendUrl}/api/lms/courses`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { items: [], total: 0 };
    return res.json();
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { discipline } = await searchParams;
  const [bundles, { items: courses, total }] = await Promise.all([getBundles(), getCourses()]);

  return (
    <main id="main-content" className="relative min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1
            className="font-display text-2xl font-bold"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Restoration Training Courses
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {total} course{total !== 1 ? 's' : ''} across 7 IICRC disciplines
          </p>
        </div>

        {/* GEO-optimised question sections */}
        <div className="mb-8 space-y-6">
          <section
            className="rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="font-display mb-3 text-lg font-semibold"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              What courses does CARSI offer?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              CARSI provides IICRC-aligned continuing education across seven core disciplines: Water
              Restoration Technology (WRT), Carpet Repair and Reinstallation Technology (CRT),
              Applied Structural Drying (ASD), Applied Microbial Remediation Technology (AMRT), Fire
              and Smoke Restoration Technology (FSRT), Odour Control Technology (OCT), and
              Commercial Carpet Cleaning Technology (CCT). Each course awards IICRC Continuing
              Education Credits (CECs) upon completion, with automatic tracking and verifiable
              digital credentials. Our 91+ courses range from introductory modules for new
              technicians through to advanced certification preparation for experienced
              professionals. All courses are delivered online, allowing Australian restoration
              technicians to study at their own pace from any location. Course content is reviewed
              and approved by the IICRC board in the United States before CECs are assigned,
              ensuring every credit meets international standards.
            </p>
          </section>

          <section
            className="rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="font-display mb-3 text-lg font-semibold"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              How do I choose the right IICRC discipline?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Your discipline choice depends on your current role and career goals. Water
              Restoration Technology (WRT) is the most common starting point, providing foundational
              knowledge applicable across all restoration work including flood damage, burst pipes,
              and storm recovery. Carpet Repair and Reinstallation Technology (CRT) suits
              technicians working in flooring and soft furnishing restoration. Applied Structural
              Drying (ASD) builds on WRT with advanced moisture control techniques for structural
              elements. Applied Microbial Remediation Technology (AMRT) covers mould assessment and
              remediation, an increasingly regulated area across Australian states. Fire and Smoke
              Restoration Technology (FSRT) addresses post-fire cleanup and deodorisation. Odour
              Control Technology (OCT) focuses on identifying and neutralising odour sources in
              residential and commercial settings. Commercial Carpet Cleaning Technology (CCT)
              targets contract cleaners working in commercial environments.
            </p>
          </section>

          <section
            className="rounded-xl p-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <h2
              className="font-display mb-3 text-lg font-semibold"
              style={{ color: 'rgba(255,255,255,0.88)' }}
            >
              What are IICRC Continuing Education Credits (CECs)?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              IICRC Continuing Education Credits (CECs) are the industry standard for tracking
              professional development in the cleaning and restoration sector. Certified technicians
              must earn a minimum number of CECs within each certification cycle to maintain their
              credentials with the Institute of Inspection, Cleaning and Restoration Certification.
              CARSI courses are individually submitted to the IICRC board for approval, and each
              approved course is assigned a specific CEC value based on its content depth and
              duration. Upon completing a course, your CECs are automatically recorded in your CARSI
              student dashboard and can be exported for submission to the IICRC. CARSI also provides
              verifiable digital credentials with a public URL that employers and clients can use to
              confirm your qualifications. This system ensures your professional development is
              documented, portable, and recognised internationally across the restoration industry.
            </p>
          </section>
        </div>

        {/* CEC Calculator — interactive tool */}
        <div className="mb-8">
          <CECCalculator />
        </div>

        {/* Industry Bundles */}
        {bundles.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Industry Bundles
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {bundles.map((b: any) => (
                <BundlePricingCard key={b.id} bundle={b} />
              ))}
            </div>
          </section>
        )}

        <div
          className="rounded-xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <CourseGrid courses={courses} initialTab={discipline ?? 'All'} />
        </div>
      </div>
    </main>
  );
}
