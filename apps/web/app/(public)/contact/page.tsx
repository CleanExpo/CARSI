import type { Metadata } from 'next';

import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact CARSI | Cleaning and Restoration Science Institute',
  description:
    'Get in touch with CARSI. Contact our team for course enquiries, membership support, or general questions about IICRC-aligned training for cleaning and restoration professionals.',
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <p className="mb-2 text-xs tracking-wide uppercase text-muted-foreground">
          Get in Touch
        </p>
        <h1 className="mb-2 text-4xl font-bold tracking-tight text-foreground">
          Contact Us
        </h1>
        <p className="mb-12 text-sm leading-relaxed text-muted-foreground">
          Have a question about our courses, membership, or IICRC training? We&apos;d love to hear
          from you.
        </p>

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Contact Form */}
          <ContactForm />

          {/* Contact Details */}
          <div className="space-y-6">
            {/* Address card */}
            <div className="space-y-4 rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Our Details
              </h2>

              <div className="space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                    Address
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    PO Box 4309
                    <br />
                    Forest Lake QLD 4078
                    <br />
                    Australia
                  </p>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                    Email
                  </p>
                  <a
                    href="mailto:support@carsi.com.au"
                    className="text-xs text-primary transition-colors"
                  >
                    support@carsi.com.au
                  </a>
                </div>

                <div>
                  <p className="mb-1 text-[10px] font-semibold tracking-wide uppercase text-muted-foreground">
                    Phone
                  </p>
                  <a
                    href="tel:+61457123005"
                    className="text-xs text-muted-foreground transition-colors hover:text-white"
                  >
                    0457 123 005
                  </a>
                </div>
              </div>
            </div>

            {/* Social card */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold text-foreground">
                Connect With Us
              </h2>
              <div className="space-y-3">
                {[
                  {
                    label: 'Facebook',
                    href: 'https://www.facebook.com/CARSIaus',
                    desc: '@CARSIaus',
                  },
                  {
                    label: 'YouTube',
                    href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured',
                    desc: 'CARSI Channel',
                  },
                  {
                    label: 'LinkedIn',
                    href: 'https://www.linkedin.com/company/carsiaus',
                    desc: 'CARSI Australia',
                  },
                  {
                    label: 'Podcast',
                    href: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG',
                    desc: 'The Science of Property Restoration',
                  },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 transition-colors"
                  >
                    <span className="text-xs font-medium text-foreground">
                      {s.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {s.desc}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Response time note */}
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              We aim to respond to all enquiries within 1–2 business days (AEST).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
