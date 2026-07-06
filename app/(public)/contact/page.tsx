import type { Metadata } from 'next';

import { ContactForm, type ContactLeadContext } from '@/components/contact/ContactForm';

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

  if (source === 'professional-directory' && intent === 'directory-notify') {
    return {
      source,
      topic,
      intent,
      pageUrl: '/professional-directory',
      initialMessage:
        'Hi CARSI — please add me to the notification list for when the NRPG-verified professional directory goes live on carsi.com.au.',
      variant: 'directory-notify',
    };
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

export async function generateMetadata({
  searchParams,
}: ContactPageProps): Promise<Metadata> {
  const params = await searchParams;
  const intent = cleanParam(firstParam(params.intent), 80);
  const source = cleanParam(firstParam(params.source), 48);

  if (source === 'professional-directory' && intent === 'directory-notify') {
    return {
      title: 'Notify Me — Professional Directory | CARSI',
      description:
        'Join the CARSI professional directory launch list. We will email you when verified NRPG listings go live.',
    };
  }

  return {
    title: 'Contact — Cleaning and Restoration Science Institute',
    description:
      'Get in touch with CARSI for course enquiries, membership support, or questions about IICRC CEC Accredited courses.',
  };
}

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const leadContext = buildLeadContext(await searchParams);
  const isDirectoryNotify = leadContext?.variant === 'directory-notify';

  return (
    <main id="main-content" className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-14">
        <p className="mb-2 text-xs font-semibold tracking-wide text-[#146fc2] uppercase">
          {isDirectoryNotify ? 'Professional directory' : 'Get in touch'}
        </p>
        <h1 className="mb-3 text-4xl font-bold tracking-tight text-slate-950">
          {isDirectoryNotify ? 'Join the launch list' : 'Contact CARSI'}
        </h1>
        <p className="mb-10 max-w-2xl text-sm leading-relaxed text-slate-600">
          {isDirectoryNotify
            ? 'Leave your details and we will notify you when verified NRPG professional listings go live on CARSI.'
            : 'Have a question about courses, membership, IICRC CECs, or team training? Send the details and CARSI support will route it to the right conversation.'}
        </p>

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <ContactForm leadContext={leadContext} />
          </section>

          <aside className="space-y-5">
            {leadContext ? (
              <div className="rounded-xl border border-[#b8dbfb] bg-[#eef7ff] p-5">
                <p className="text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase">
                  {leadContext.source === 'professional-directory'
                    ? 'Directory enquiry'
                    : 'Start Smart enquiry'}
                </p>
                <h2 className="mt-2 text-sm font-semibold text-slate-950">
                  Routed to the right conversation
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {leadContext.source === 'professional-directory'
                    ? 'This enquiry is tagged for the professional directory launch list.'
                    : 'This enquiry includes the source, topic and pathway so CARSI can quickly see what guidance you need.'}
                </p>
              </div>
            ) : null}

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Our details</h2>
              <div className="mt-4 space-y-4 text-xs leading-relaxed text-slate-600">
                <div>
                  <p className="mb-1 font-semibold tracking-wide text-slate-700 uppercase">Address</p>
                  <p>
                    PO Box 4309
                    <br />
                    Forest Lake QLD 4078
                    <br />
                    Australia
                  </p>
                </div>
                <div>
                  <p className="mb-1 font-semibold tracking-wide text-slate-700 uppercase">Email</p>
                  <p>Use the form and CARSI support will reply by email.</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[#b8dbfb] bg-[#eef7ff] p-5">
              <p className="text-[10px] font-semibold tracking-wide text-[#146fc2] uppercase">
                Fastest answer
              </p>
              <h2 className="mt-2 text-sm font-semibold text-slate-950">Ask Margot</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Have a question? Ask Margot, our online assistant — she answers instantly on the
                bottom-right of every page. Look for the{' '}
                <span className="font-semibold text-[#146fc2]">Ask Margot</span> button in the corner
                to start a chat. Prefer to write? The form is here as your fallback and CARSI support
                will reply by email.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-950">Connect with us</h2>
              <div className="mt-4 grid gap-2">
                {[
                  { label: 'Facebook', href: 'https://www.facebook.com/CARSIaus' },
                  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC3HpNvGJXivLGoPo4m7Qleg/featured' },
                  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/carsiaus' },
                  { label: 'Podcast', href: 'https://open.spotify.com/show/4FVBn8Cfyx2jOx0m4MksuG' },
                ].map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-[#2490ed]/35 hover:text-[#146fc2]"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
