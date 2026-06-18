import type { Metadata } from 'next';

import { ContactForm, type ContactLeadContext } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact CARSI | Cleaning and Restoration Science Institute',
  description:
    'Get in touch with CARSI. Contact our team for course enquiries, membership support, or general questions about IICRC-aligned training for cleaning and restoration professionals.',
};

type ContactPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanParam(value: string | undefined, maxLength = 120) {
  return value?.replace(/[<>]/g, '').trim().slice(0, maxLength) || undefined;
}

function buildLeadContext(params: Awaited<ContactPageProps['searchParams']>): ContactLeadContext | undefined {
  const source = cleanParam(firstParam(params.source), 48);
  const topic = cleanParam(firstParam(params.topic), 160);
  const pathway = cleanParam(firstParam(params.pathway), 80);
  const intent = cleanParam(firstParam(params.intent), 80);

  if (!source && !topic && !pathway && !intent) {
    return undefined;
  }

  const pathwayText = pathway ? ` from the ${pathway.replaceAll('-', ' ')} Start Smart pathway` : '';
  const topicText = topic ? ` about ${topic}` : '';

  return {
    source,
    topic,
    pathway,
    intent,
    pageUrl: pathway ? `/start-carpet-cleaning-business/${pathway}` : '/start-carpet-cleaning-business',
    initialMessage: `Hi CARSI, I would like help${topicText}${pathwayText}.`,
  };
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const leadContext = buildLeadContext(await searchParams);

  return (
    <main className="min-h-screen" style={{ background: '#060a14' }}>
      {/* Mesh background */}
      <div className="mesh-bg" aria-hidden="true">
        <div className="mesh-blob mesh-blob-1" />
        <div className="mesh-blob mesh-blob-2" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 py-20">
        <p
          className="mb-2 text-xs tracking-wide uppercase"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          Get in Touch
        </p>
        <h1
          className="mb-2 text-4xl font-bold tracking-tight"
          style={{ color: 'rgba(255,255,255,0.95)' }}
        >
          Contact Us
        </h1>
        <p className="mb-12 text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Have a question about our courses, membership, or IICRC training? We&apos;d love to hear
          from you.
        </p>

        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          {/* Contact Form */}
          <ContactForm leadContext={leadContext} />

            {/* Contact Details */}
            <div className="space-y-6">
            {leadContext ? (
              <div
                className="space-y-3 rounded-lg p-5"
                style={{
                  background: 'rgba(36,144,237,0.06)',
                  border: '1px solid rgba(36,144,237,0.18)',
                }}
              >
                <p
                  className="text-[10px] font-semibold tracking-wide uppercase"
                  style={{ color: '#7ec5ff' }}
                >
                  Start Smart enquiry
                </p>
                <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Routed to the right conversation
                </h2>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>
                  This enquiry includes the Start Smart source, topic and pathway so CARSI can see
                  whether you need course guidance, CCW practical support, equipment direction,
                  service modelling or team/buyer training.
                </p>
              </div>
            ) : null}

            {/* Address card */}
            <div
              className="space-y-4 rounded-lg p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Our Details
              </h2>

              <div className="space-y-3">
                <div>
                  <p
                    className="mb-1 text-[10px] font-semibold tracking-wide uppercase"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Address
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    PO Box 4309
                    <br />
                    Forest Lake QLD 4078
                    <br />
                    Australia
                  </p>
                </div>

                <div>
                  <p
                    className="mb-1 text-[10px] font-semibold tracking-wide uppercase"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Email
                  </p>
                  <p className="text-xs" style={{ color: '#2490ed' }}>
                    Use the form and CARSI support will reply by email.
                  </p>
                </div>

                <div>
                  <p
                    className="mb-1 text-[10px] font-semibold tracking-wide uppercase"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    Phone
                  </p>
                  <a
                    href="tel:+61457123005"
                    className="text-xs transition-colors hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    0457 123 005
                  </a>
                </div>
              </div>
            </div>

            {/* Social card */}
            <div
              className="rounded-lg p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2
                className="mb-4 text-sm font-semibold"
                style={{ color: 'rgba(255,255,255,0.85)' }}
              >
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
                    className="flex items-center justify-between rounded-sm px-3 py-2 transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {s.label}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {s.desc}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Response time note */}
            <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.3)' }}>
              We aim to respond to all enquiries within 1–2 business days (AEST).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
