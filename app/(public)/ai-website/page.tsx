import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { aiWebsiteEnabled } from '@/lib/ai-website/flags';
import Advisor from './Advisor';
import LeadMachine from './LeadMachine';
import './ai-website.css';

// Render per-request so the AI_WEBSITE_ENABLED flag is honoured at runtime (not baked at build).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'CARSI AI Website — training that enrols, advises and follows up',
  description:
    'Australia’s restoration & cleaning training authority. IICRC CEC Accredited courses that earn CARSI Southern Hemisphere Restoration Designations — with an AI advisor, CRM and enrolment automation built in.',
};

const HOOD = [
  ['Advisor', 'AI Course Advisor', 'Answers role, CEC and pathway questions 24/7 across the full CARSI catalogue, in plain Australian English.'],
  ['Capture', 'Student CRM', 'Every form, chat and callback becomes a tagged contact record — no lead lost to a forgotten inbox.'],
  ['Inbox', 'Unified inbox', 'Email, SMS, Google Business and social messages land in one dashboard, tied to the right contact.'],
  ['Automation', 'Enrolment flows', 'Trigger-based sequences — verify, welcome, remind, re-engage — the n8n-style triggers that run with zero manual work.'],
  ['Trust', 'Reputation engine', 'Asks graduates for a review at the right moment and routes it to Google — turning finished courses into new enquiries.'],
  ['Reach', 'Social planner', 'Schedules course announcements and CEC reminders across channels from the same place the leads come in.'],
];

const OLD = [
  'Lists 40-odd courses; you scroll and guess which one you need',
  'A contact form that sits in an inbox until someone gets to it',
  '“Which course counts for my CECs?” → a manual email, maybe tomorrow',
  'Visitor leaves at 9pm; nothing happens',
  'No memory of who came, what they wanted, or what to send next',
];
const NEW = [
  'An advisor maps a pathway from your role in seconds',
  'Every enquiry lands in the CRM, tagged and email-verified',
  'Explains the CARSI designation + IICRC CEC dual value instantly',
  'Visitor leaves at 9pm → welcome email within the hour, SMS next day',
  'Remembers everyone and fires the right follow-up on its own',
];

const TIERS = [
  ['Essentials', '$29', 'Short, single-topic courses up to an hour.'],
  ['Professional', '$49', 'One-to-two-hour operational and business courses.'],
  ['Build', '$99', 'Deep two-hour-plus courses and hands-on builds.'],
  ['Senior', '$149', 'High-value senior-level courses — e.g. Mould Level 3.'],
];

export default function AiWebsitePage() {
  if (!aiWebsiteEnabled()) notFound();

  return (
    <div className="aiw">
      <div className="aiw-wrap aiw-hero">
        <div className="aiw-hero-grid">
          <div>
            <span className="aiw-eyebrow">Australia’s restoration &amp; cleaning training authority</span>
            <h1 className="aiw-title">A training site that <em>enrols, advises and follows up</em> — while you sleep.</h1>
            <p className="aiw-lede">
              CARSI delivers <b>IICRC CEC Accredited</b> courses, Australian-produced, that earn <b>CARSI Southern
              Hemisphere Restoration Designations</b> — and also earn IICRC CECs toward your existing certification.
              This isn’t a brochure that lists them and waits. It <b>advises every visitor</b>, captures the enrolment,
              and starts the follow-up automatically. The site stops being a page and starts being an employee.
            </p>
            <div className="aiw-cta-row">
              <a className="aiw-btn aiw-btn-primary" href="#start">Build my learning pathway →</a>
              <a className="aiw-btn aiw-btn-ghost" href="#difference">See how it’s different</a>
            </div>
            <div className="aiw-note">● <b>Live advisor</b> — ask it anything, right here → no form, no wait.</div>
          </div>
          <Advisor />
        </div>
      </div>

      <section className="aiw-section" id="difference">
        <div className="aiw-wrap">
          <div className="aiw-sec-head">
            <span className="aiw-eyebrow">The positioning flip</span>
            <h2>An old training website displays. An AI website has the conversation.</h2>
            <p>Same courses. The difference is everything that happens after a visitor lands — and whether anyone is there to catch them.</p>
          </div>
          <div className="aiw-vs">
            <div className="aiw-vs-col old">
              <h3>Old brochure site</h3>
              {OLD.map((t) => <div className="aiw-vs-row" key={t}><span className="mk">—</span> {t}</div>)}
            </div>
            <div className="aiw-vs-col ai">
              <h3>CARSI AI website</h3>
              {NEW.map((t) => <div className="aiw-vs-row" key={t}><span className="mk">✓</span> {t}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="aiw-section" id="hood">
        <div className="aiw-wrap">
          <div className="aiw-sec-head">
            <span className="aiw-eyebrow">Under the hood</span>
            <h2>Six systems behind one clean page.</h2>
            <p>The front looks like a simple, professional training site. Underneath sits the whole enrolment engine — the part the visitor never sees, doing the work a receptionist and a marketer would.</p>
          </div>
          <div className="aiw-hood">
            {HOOD.map(([k, h, p]) => (
              <div className="aiw-card" key={h}><div className="k">{k}</div><h3>{h}</h3><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="aiw-section" id="offer">
        <div className="aiw-wrap">
          <div className="aiw-sec-head">
            <span className="aiw-eyebrow">What it sells</span>
            <h2>43 Australian-produced courses. Real designations. One flat ladder.</h2>
            <p>Water damage, mould, fire &amp; smoke, trauma, structural drying, carpet &amp; upholstery, indoor air quality — plus a new Grow-Your-Business track. Priced by course length, so there’s nothing to work out.</p>
          </div>
          <div className="aiw-price-grid">
            {TIERS.map(([lab, amt, note]) => (
              <div className="aiw-tier" key={lab}><div className="lab">{lab}</div><div className="amt">{amt}</div><p>{note}</p></div>
            ))}
          </div>
          <div className="aiw-subline">
            <b>Subscription</b> — one monthly or yearly plan unlocks <b>every course, every tier</b>, with new courses
            included the moment they publish. Each CARSI course earns a <b>CARSI designation</b> that also earns{' '}
            <b>IICRC CECs</b> toward maintaining your existing certification.
          </div>
        </div>
      </section>

      <section className="aiw-section" id="start">
        <div className="aiw-wrap">
          <div className="aiw-sec-head">
            <span className="aiw-eyebrow">Watch the employee work</span>
            <h2>Enter your details. Watch them land — and the follow-up fire.</h2>
            <p>This is the machine behind the page. Fill the form and your record drops into the CRM on the right, and the enrolment automation starts on its own.</p>
          </div>
          <LeadMachine />
        </div>
      </section>

      <footer className="aiw-footer">
        <div className="aiw-wrap">
          <div className="aiw-foot-grid">
            <div>
              <h4>CARSI</h4>
              <p>Australia’s restoration &amp; cleaning training authority. Australian-produced courses in water damage, mould, fire, trauma, drying, carpet care and indoor air quality — built for Australian standards, power and conditions.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <p><a href="#difference">The difference</a><br /><a href="#hood">Under the hood</a><br /><a href="#offer">Courses &amp; pricing</a><br /><a href="#start">Request a callback</a></p>
            </div>
            <div>
              <h4>CARSI</h4>
              <p>carsi.com.au<br />Founder — Phill McGurk<br />IICRC CEC Accredited provider</p>
            </div>
          </div>
          <div className="aiw-compliance">
            CARSI delivers <strong>IICRC CEC Accredited</strong> continuing education. CARSI is an accredited IICRC
            Continuing Education Credit (CEC) provider — it does not deliver IICRC certification. IICRC certification is
            obtained through IICRC-approved schools and examinations; CARSI courses earn CECs toward maintaining an
            existing IICRC certification, alongside CARSI’s own Southern Hemisphere Restoration Designations.
          </div>
        </div>
      </footer>
    </div>
  );
}
