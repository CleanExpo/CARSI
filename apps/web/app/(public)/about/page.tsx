import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About CARSI | Cleaning and Restoration Science Institute',
  description:
    'CARSI supports the cleaning and restoration industry with flexible online learning tools, IICRC CEC-approved courses, and over 50 years of combined industry experience across Australia.',
};

export default function AboutPage() {
  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          About Us
        </p>
        <h1
          className="mb-8 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          About CARSI
        </h1>

        {/* Mission */}
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Growth. Support. Development.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            At CARSI, we support the cleaning and restoration industry. That&apos;s why we offer
            flexible learning tools you can use anytime. Our membership includes over $6,000 in
            resources, helping you save time and reduce admin tasks.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            We believe in cleaning for health — not just appearance. We aim to teach both
            individuals and businesses why proper cleaning matters. With the right knowledge, you
            can protect your clients, your team, and yourself.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            In short, CARSI helps you learn more, work smarter, and stay ahead.
          </p>
        </section>

        {/* Credentials */}
        <section className="mb-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                title: "Australia's Only CFO and CBFRS",
                desc: 'Certified Flooring Organisation and Certified Building Flood Recovery Specialist credentials.',
              },
              {
                title: 'Over 50 Years Industry Experience',
                desc: 'Our team brings decades of hands-on experience across cleaning and restoration.',
              },
              {
                title: 'Raise the Bar',
                desc: 'We are committed to lifting industry standards through education and professional development.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-lg p-5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h3
                  className="mb-2 text-sm font-semibold"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                >
                  {item.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* IICRC Disciplines */}
        <section className="mb-10 space-y-4">
          <h2 className="text-xl font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            IICRC Discipline Coverage
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            CARSI delivers courses aligned to the following IICRC disciplines:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { code: 'WRT', label: 'Water Restoration Technician' },
              { code: 'CRT', label: 'Carpet Repair and Reinstallation Technician' },
              { code: 'ASD', label: 'Applied Structural Drying' },
              { code: 'AMRT', label: 'Applied Microbial Remediation Technician' },
              { code: 'FSRT', label: 'Fire and Smoke Restoration Technician' },
              { code: 'OCT', label: 'Odour Control Technician' },
              { code: 'CCT', label: 'Commercial Carpet Cleaning Technician' },
            ].map((d) => (
              <div
                key={d.code}
                className="flex items-center gap-3 rounded-md px-3 py-2"
                style={{
                  background: 'rgba(36,144,237,0.06)',
                  border: '1px solid rgba(36,144,237,0.15)',
                }}
              >
                <span
                  className="font-mono text-xs font-bold"
                  style={{ color: '#2490ed', minWidth: '3rem' }}
                >
                  {d.code}
                </span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* IICRC Disclaimer */}
        <section
          className="rounded-lg p-5"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-xs leading-relaxed italic" style={{ color: 'rgba(255,255,255,0.35)' }}>
            The IICRC does not endorse any educational provider, product, offering, or service. The
            Institute expressly disclaims responsibility, endorsement or warranty for third-party
            publications, products, certifications, or instruction. The approved status does not
            award IICRC Certification, only qualified continuing education hours.
          </p>
          <p className="mt-3 text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
            All our courses now provide CEC Credits!
          </p>
        </section>
      </div>
    </main>
  );
}
