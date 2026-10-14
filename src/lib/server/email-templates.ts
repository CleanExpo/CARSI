/**
 * CARSI branded transactional email layout — site theme (#060a14, glass card, #ed9d24 CTAs).
 * All project emails should use buildCarsiEmailHtml / render* helpers below.
 */
import type { CcwAttendeeOffer } from '@/lib/marketing/ccw-roadshow-offers';

export const BRAND = {
  pageBg: '#060a14',
  glow: 'rgba(36, 144, 237, 0.08)',
  cardBg: 'rgba(255, 255, 255, 0.04)',
  cardBorder: 'rgba(255, 255, 255, 0.07)',
  silver: '#c8ced9',
  silverHi: '#e8ebf2',
  accentA: '#b8e62e',
  blue: '#2490ed',
  cyan: '#00F5FF',
  orange: '#ed9d24',
  text: 'rgba(255, 255, 255, 0.95)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  textDim: 'rgba(255, 255, 255, 0.35)',
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
} as const;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function brandLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color: ${BRAND.cyan}; text-decoration: underline; text-underline-offset: 3px;">${escapeHtml(label)}</a>`;
}

export function formatPlainMessageAsHtml(message: string): string {
  return escapeHtml(message.trim()).replace(/\n/g, '<br>');
}

const MARKETING_BODY_P = `margin: 0 0 14px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text};`;
const MARKETING_BODY_LIST = `margin: 0 0 14px 0; padding-left: 20px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text};`;

function linkifyEscapedText(escaped: string): string {
  return escaped.replace(
    /(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g,
    (url) =>
      `<a href="${url}" style="color: ${BRAND.cyan}; text-decoration: underline; text-underline-offset: 3px;">${url}</a>`
  );
}

function applyInlineMarketingEmphasis(escaped: string): string {
  return escaped.replace(/\*\*(.+?)\*\*/g, `<strong style="color: ${BRAND.text};">$1</strong>`);
}

function isBulletLine(line: string): boolean {
  return /^[-*•]\s+/.test(line.trim());
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(/^[-*•]\s+/, '');
}

/** Plain-text admin body → readable HTML paragraphs and lists (no raw HTML input). */
export function formatMarketingBodyAsHtml(message: string): string {
  const normalized = message.replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  const blocks = normalized.split(/\n\s*\n/);
  const parts: string[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length === 0) continue;

    if (nonEmpty.every(isBulletLine)) {
      const items = nonEmpty
        .map((line) => {
          const inner = applyInlineMarketingEmphasis(
            linkifyEscapedText(escapeHtml(stripBulletPrefix(line)))
          );
          return `<li style="margin: 0 0 8px;">${inner}</li>`;
        })
        .join('');
      parts.push(`<ul style="${MARKETING_BODY_LIST}">${items}</ul>`);
      continue;
    }

    const paragraph = nonEmpty.join(' ');
    const inner = applyInlineMarketingEmphasis(linkifyEscapedText(escapeHtml(paragraph)));
    parts.push(`<p style="${MARKETING_BODY_P}">${inner}</p>`);
  }

  return parts.join('\n');
}

export function formatMarketingBodyAsPlainText(message: string): string {
  return message.replace(/\r\n/g, '\n').trim();
}

export function buildCarsiWordmarkHtml(appOrigin: string): string {
  const home = escapeHtml(appOrigin);
  const letterBase = `font-family: ${BRAND.font}; font-weight: 800; font-size: 42px; line-height: 1; letter-spacing: 0.14em;`;
  const silver = `color: ${BRAND.silverHi}; text-shadow: 0 1px 0 ${BRAND.silver}, 0 2px 8px rgba(0,0,0,0.5);`;

  return `
    <a href="${home}" style="text-decoration: none; display: inline-block;">
      <span style="${letterBase} display: inline-block;">
        <span style="${silver}">C</span><span style="color: ${BRAND.accentA}; text-shadow: 0 0 20px rgba(184,230,46,0.55), 0 1px 0 #8fc920;">A</span><span style="${silver}">R</span><span style="${silver}">S</span><span style="${silver}">I</span>
      </span>
    </a>
    <p style="margin: 12px 0 0; font-family: ${BRAND.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.blue};">
      IICRC CEC Accredited restoration courses
    </p>`;
}

export type CarsiEmailDetail = { label: string; value: string; valueHtml?: string };

export type CarsiEmailContent = {
  appOrigin: string;
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  paragraphs?: string[];
  details?: CarsiEmailDetail[];
  messageHtml?: string;
  /** When true, render messageHtml without the "Message" label and inner box (marketing). */
  messageHtmlBare?: boolean;
  cta?: { label: string; href: string };
  noteHtml?: string;
};

export function buildCarsiEmailHtml(options: CarsiEmailContent): string {
  const preheader = escapeHtml(options.preheader);
  const title = escapeHtml(options.title);
  const eyebrow = escapeHtml(options.eyebrow);
  const wordmark = buildCarsiWordmarkHtml(options.appOrigin);

  const greetingBlock = options.greeting
    ? `
      <tr>
        <td style="padding: 0 0 18px; font-family: ${BRAND.font}; font-size: 16px; line-height: 1.5; color: ${BRAND.text};">
          ${escapeHtml(options.greeting)}
        </td>
      </tr>`
    : '';

  const bodyParagraphs = (options.paragraphs ?? [])
    .map(
      (p) => `
      <tr>
        <td style="padding: 0 0 16px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.textMuted};">
          ${escapeHtml(p)}
        </td>
      </tr>`
    )
    .join('');

  const detailsBlock =
    options.details && options.details.length > 0
      ? `
      <tr>
        <td style="padding: 0 0 20px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: rgba(255,255,255,0.03); border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
            ${options.details
              .map(
                (d) => `
            <tr>
              <td style="padding: 12px 14px; font-family: ${BRAND.font}; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: ${BRAND.blue}; vertical-align: top; width: 34%; border-bottom: 1px solid ${BRAND.cardBorder};">
                ${escapeHtml(d.label)}
              </td>
              <td style="padding: 12px 14px; font-family: ${BRAND.font}; font-size: 14px; line-height: 1.5; color: ${BRAND.text}; vertical-align: top; border-bottom: 1px solid ${BRAND.cardBorder};">
                ${d.valueHtml ?? escapeHtml(d.value)}
              </td>
            </tr>`
              )
              .join('')}
          </table>
        </td>
      </tr>`
      : '';

  const messageBlock = options.messageHtml
    ? options.messageHtmlBare
      ? `
      <tr>
        <td style="padding: 0 0 20px;">
          ${options.messageHtml}
        </td>
      </tr>`
      : `
      <tr>
        <td style="padding: 0 0 20px;">
          <p style="margin: 0 0 8px; font-family: ${BRAND.font}; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: ${BRAND.textMuted};">Message</p>
          <div style="font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text}; padding: 16px; background-color: rgba(255,255,255,0.03); border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
            ${options.messageHtml}
          </div>
        </td>
      </tr>`
    : '';

  const ctaBlock = options.cta
    ? `
      <tr>
        <td align="center" style="padding: 10px 0 28px;">
          <a href="${escapeHtml(options.cta.href)}"
             style="display: inline-block; padding: 14px 36px; font-family: ${BRAND.font}; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 2px; background-color: ${BRAND.orange};">
            ${escapeHtml(options.cta.label)}
          </a>
        </td>
      </tr>`
    : '';

  const noteBlock = options.noteHtml
    ? `
      <tr>
        <td style="padding: 20px 0 0; font-family: ${BRAND.font}; font-size: 13px; line-height: 1.55; color: ${BRAND.textDim}; border-top: 1px solid ${BRAND.cardBorder};">
          ${options.noteHtml}
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.pageBg}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BRAND.pageBg};">
    <tr>
      <td align="center" style="padding: 48px 20px 40px; background: radial-gradient(ellipse 80% 50% at 50% 0%, ${BRAND.glow} 0%, transparent 70%);">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          <tr>
            <td align="center" style="padding: 0 0 32px;">${wordmark}</td>
          </tr>
          <tr>
            <td style="background-color: ${BRAND.cardBg}; border: 1px solid ${BRAND.cardBorder}; border-radius: 2px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="height: 2px; background: linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.accentA} 50%, ${BRAND.blue} 100%); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding: 32px 28px 28px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 0 0 6px; font-family: ${BRAND.font}; font-size: 11px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.blue};">${eyebrow}</td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px; font-family: ${BRAND.font}; font-size: 24px; font-weight: 700; line-height: 1.3; color: ${BRAND.text};">${title}</td>
                      </tr>
                      ${greetingBlock}
                      ${bodyParagraphs}
                      ${detailsBlock}
                      ${messageBlock}
                      ${ctaBlock}
                      ${noteBlock}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 28px 8px 0; font-family: ${BRAND.font}; font-size: 12px; line-height: 1.6; color: ${BRAND.textDim};">
              <p style="margin: 0 0 8px; color: ${BRAND.textMuted};">CARSI Learning</p>
              <p style="margin: 0;">${brandLink(options.appOrigin, 'Visit carsi.com.au')}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type RenderedEmail = { html: string; text: string };

function render(content: CarsiEmailContent, textBody: string): RenderedEmail {
  return { html: buildCarsiEmailHtml(content), text: textBody };
}

export function renderRecertReminderEmail(params: {
  appOrigin: string;
  name: string;
  expiryDate: string;
  milestone: 't_minus_30' | 't_minus_7' | 'overdue';
  renewalsUrl: string;
}): RenderedEmail {
  const expired = params.milestone === 'overdue';
  const lead = expired
    ? `Your IICRC certification expired on ${params.expiryDate}. Renew now to restore compliance.`
    : `Your IICRC certification expires on ${params.expiryDate}.`;
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: expired
        ? 'Your IICRC certification has expired — renew now'
        : `IICRC renewal due — expires ${params.expiryDate}`,
      eyebrow: expired ? 'Certification expired' : 'Renewal reminder',
      title: expired ? 'Your IICRC certification has expired' : 'IICRC certification renewal due',
      greeting: `Hi ${params.name},`,
      paragraphs: [
        lead,
        'Complete CEC-eligible CARSI courses to accrue the hours you need, then submit your renewal. Your dashboard tracks CEC progress and outstanding requirements.',
      ],
      details: [
        { label: 'Certification', value: 'IICRC' },
        { label: expired ? 'Expired' : 'Expires', value: params.expiryDate },
        {
          label: 'Next action',
          value: expired
            ? 'Renew now to restore compliance'
            : 'Plan CEC courses and submit your renewal',
        },
      ],
      cta: { label: 'View renewal status', href: params.renewalsUrl },
      noteHtml: `Open ${brandLink(params.renewalsUrl, 'Credentials')} to track CEC progress and submit your renewal.`,
    },
    `Hi ${params.name},\n\n${lead}\n\nComplete CEC-eligible courses and submit your renewal.\n\nCredentials: ${params.renewalsUrl}`
  );
}

const PHILL_MARKETING_SIGNATURE_TEXT = `Phill McGurk
Founder | CARSI
IICRC Triple Master | Bio Forensic Master Cleaner
25+ years in carpet cleaning and restoration
+61 457 123 005
carsi.com.au | support@carsi.com.au
CARSI | Restoration training — IICRC CEC Accredited`;

function phillMarketingSignatureHtml(appOrigin: string): string {
  const home = escapeHtml(appOrigin);
  return `<p style="margin: 24px 0 0; font-family: ${BRAND.font}; font-size: 14px; line-height: 1.55; color: ${BRAND.text};">
      <strong>Phill McGurk</strong><br />
      Founder | CARSI<br />
      IICRC Triple Master | Bio Forensic Master Cleaner<br />
      25+ years in carpet cleaning and restoration<br />
      +61 457 123 005<br />
      ${brandLink(home, 'carsi.com.au')} | ${brandLink('mailto:support@carsi.com.au', 'support@carsi.com.au')}<br />
      CARSI | Restoration training — IICRC CEC Accredited
    </p>`;
}

export function renderAdminMarketingEmail(params: {
  appOrigin: string;
  name: string;
  title: string;
  body: string;
  bodyHtml?: string | null;
  imageUrl?: string | null;
  unsubscribeUrl: string;
}): RenderedEmail {
  const imageHtml = params.imageUrl
    ? `<p style="margin: 0 0 16px;"><img src="${escapeHtml(params.imageUrl)}" alt="" width="420" style="display:block;max-width:100%;height:auto;border:0;" /></p>`
    : '';
  const messageInner = params.bodyHtml?.trim()
    ? `<div style="margin: 0 0 4px; font-family: ${BRAND.font}; font-size: 15px; line-height: 1.65; color: ${BRAND.text};">${params.bodyHtml}</div>`
    : `<div style="margin: 0 0 4px;">${formatMarketingBodyAsHtml(params.body)}</div>`;
  const bodyHtml = `${imageHtml}${messageInner}${phillMarketingSignatureHtml(params.appOrigin)}`;
  const plainBody = params.body.trim() || formatMarketingBodyAsPlainText(params.body);
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: params.title,
      eyebrow: 'From CARSI',
      title: params.title,
      greeting: `Hi ${params.name},`,
      messageHtml: bodyHtml,
      messageHtmlBare: true,
      noteHtml: `This is a CARSI Learning update. ${brandLink(params.unsubscribeUrl, 'Unsubscribe')} from marketing emails. CARSI Learning · Australia · ${brandLink(params.appOrigin, 'carsi.com.au')}`,
    },
    `Hi ${params.name},\n\n${plainBody}\n\n${params.imageUrl ? `Image: ${params.imageUrl}\n\n` : ''}${PHILL_MARKETING_SIGNATURE_TEXT}\n\nUnsubscribe: ${params.unsubscribeUrl}\nCARSI Learning · ${params.appOrigin}`
  );
}

export function renderToolboxTalkEmail(params: {
  appOrigin: string;
  name: string;
  talkTitle: string;
  monthLabel: string;
  courseUrl: string;
  /** Public one-click unsubscribe URL (Spam Act). Optional so tests/callers can omit. */
  unsubscribeUrl?: string;
}): RenderedEmail {
  const unsubHtml = params.unsubscribeUrl
    ? ` No longer want these? ${brandLink(params.unsubscribeUrl, 'Unsubscribe')}.`
    : '';
  const unsubText = params.unsubscribeUrl
    ? `\n\nUnsubscribe from toolbox-talk emails: ${params.unsubscribeUrl}`
    : '';
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `${params.monthLabel} toolbox talk: ${params.talkTitle}`,
      eyebrow: 'Monthly toolbox talk',
      title: `${params.monthLabel} Toolbox Talk`,
      greeting: `Hi ${params.name},`,
      paragraphs: [
        `This month's toolbox talk is ready: "${params.talkTitle}".`,
        'A short, run-with-your-crew refresher — the hazard, the control, and the sign-off. Open it before your next job to keep the team sharp and compliant.',
      ],
      details: [
        { label: 'This month', value: params.talkTitle },
        { label: 'Format', value: 'Quick refresher — do it, don’t just read it' },
      ],
      cta: { label: 'Open this month’s talk', href: params.courseUrl },
      noteHtml: `You’re receiving this as part of your CARSI toolbox-talk subscription. Open ${brandLink(params.courseUrl, 'the course')} to view all talks.${unsubHtml}`,
    },
    `Hi ${params.name},\n\nThis month's toolbox talk is ready: "${params.talkTitle}".\n\nOpen it: ${params.courseUrl}${unsubText}`
  );
}

export function renderPasswordResetEmail(params: {
  appOrigin: string;
  name: string;
  resetLink: string;
}): RenderedEmail {
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Reset your CARSI Learning password',
      eyebrow: 'Account security',
      title: 'Reset your password',
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'We received a request to reset the password for your CARSI Learning account.',
        'Use the button below to choose a new password. This link expires in 1 hour.',
      ],
      cta: { label: 'Reset password', href: params.resetLink },
      noteHtml: `If you did not request this, ignore this email — your password will not change.<br /><br /><span style="color: ${BRAND.textMuted};">Or copy this link:</span><br />${brandLink(params.resetLink, 'Open reset page')}`,
    },
    `Hi ${params.name},\n\nReset your CARSI password:\n${params.resetLink}\n\nThis link expires in 1 hour.`
  );
}

export function renderRegistrationWelcomeEmail(params: {
  appOrigin: string;
  name: string;
  dashboardUrl: string;
}): RenderedEmail {
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your CARSI Learning account is ready',
      eyebrow: 'Welcome',
      title: "You're all set",
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'Thank you for joining CARSI Learning — professional IICRC CEC Accredited restoration courses for Australian technicians and teams.',
        'Your account is active. Sign in to browse courses, track CEC progress, and continue your learning path.',
      ],
      details: [
        { label: 'Account', value: params.name },
        { label: 'Status', value: 'Active' },
      ],
      cta: { label: 'Go to my dashboard', href: params.dashboardUrl },
      noteHtml: `Need help? ${brandLink(`${params.appOrigin}/contact`, 'Contact our team')}.`,
    },
    `Hi ${params.name},\n\nWelcome to CARSI Learning.\n\nDashboard: ${params.dashboardUrl}`
  );
}

/**
 * GP-199 lead-magnet delivery email — sent to the person who requested the
 * "How to Get on Government Restoration Panels" guide, carrying the download
 * link. Copy is IICRC-CEC compliant: CARSI is described only as an IICRC CEC
 * Accredited provider (never as an IICRC certification/training school).
 */
export function renderGovContractorGuideEmail(params: {
  appOrigin: string;
  downloadUrl: string;
}): RenderedEmail {
  const title = 'How to Get on Government Restoration Panels';
  const paragraphs = [
    'Thanks for requesting the CARSI guide to winning government restoration panel work in Australia.',
    'Your download link is below. The guide covers how government procurement panels work, the IICRC certifications procurement officers look for, a WHS compliance checklist, and a 90-day path to panel readiness.',
  ];
  const text = [
    title,
    '',
    ...paragraphs,
    '',
    `Download the guide (PDF): ${params.downloadUrl}`,
    '',
    'CARSI is an IICRC CEC Accredited provider.',
    '',
    `CARSI Learning — ${params.appOrigin}`,
  ].join('\n');
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your download link to the government restoration panels guide.',
      eyebrow: 'Your free guide',
      title,
      paragraphs,
      cta: { label: 'Download the guide (PDF)', href: params.downloadUrl },
      noteHtml: 'CARSI is an IICRC CEC Accredited provider.',
    },
    text
  );
}

export function renderEnrollmentWelcomeEmail(params: {
  appOrigin: string;
  name: string;
  courseTitle: string;
  startUrl: string;
  dashboardUrl: string;
  /**
   * True when the recipient's account has no password yet (a Stripe-only guest).
   * Every course link requires a login, so the email must lead with setting one.
   */
  needsPasswordSetup?: boolean;
  /** Where to set that password — the /forgot-password page, never a token. */
  setPasswordUrl?: string;
  /** CCW roadshow attendee offers (already gated/selected by the caller). */
  offers?: CcwAttendeeOffer[];
}): RenderedEmail {
  const offers = params.offers ?? [];
  const offersHtml = offers.length
    ? `<p style="margin: 16px 0 6px;"><strong>Your attendee offers</strong></p>` +
      `<ul style="margin: 0 0 12px; padding-left: 20px;">` +
      offers
        .map((o) => {
          const head = o.url
            ? brandLink(o.url, o.label)
            : `<strong>${escapeHtml(o.label)}</strong>`;
          return `<li style="margin: 4px 0;">${head} — ${escapeHtml(o.detail)}</li>`;
        })
        .join('') +
      `</ul>`
    : '';
  const offersText = offers.length
    ? `\n\nYour attendee offers:\n` +
      offers.map((o) => `- ${o.label}${o.url ? `: ${o.url}` : ''}`).join('\n')
    : '';

  // A buyer with no password yet cannot open any of the course links below, so
  // the whole email has to lead with setting one. Anything else sends a paying
  // customer to a sign-in screen that will tell them "Invalid credentials".
  if (params.needsPasswordSetup && params.setPasswordUrl) {
    return render(
      {
        appOrigin: params.appOrigin,
        preheader: `Set your password to start ${params.courseTitle}`,
        eyebrow: 'Enrolment confirmed',
        title: 'One step before you start',
        greeting: `Hi ${params.name},`,
        paragraphs: [
          `Your payment went through and ${params.courseTitle} is yours. You just need a password before you can open it.`,
          'Set one now and you go straight into the course. It takes about a minute, and you only do it once.',
        ],
        details: [
          { label: 'Course', value: params.courseTitle },
          { label: 'Status', value: 'Paid — waiting on your password' },
          { label: 'Next action', value: 'Set your password, then start lesson 1' },
        ],
        cta: { label: 'Set your password', href: params.setPasswordUrl },
        noteHtml:
          `${offersHtml}Enter this same email address on that page and we'll send you a link to set your password. ` +
          `Once you're in, ${brandLink(params.startUrl, 'start lesson 1')} or open ` +
          `${brandLink(params.dashboardUrl, 'My Learning')} any time. If anything goes wrong, just reply to this email.`,
      },
      `Hi ${params.name},\n\nYour payment went through and ${params.courseTitle} is yours. ` +
        `You just need a password before you can open it.\n\n` +
        `Set your password: ${params.setPasswordUrl}\n` +
        `(Enter this same email address and we'll send you a link.)\n\n` +
        `Once you're in — start lesson 1: ${params.startUrl}\n` +
        `My Learning: ${params.dashboardUrl}${offersText}\n\n` +
        `If anything goes wrong, just reply to this email.`
    );
  }

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `You're enrolled in ${params.courseTitle}`,
      eyebrow: 'Enrolment confirmed',
      title: 'Your course is ready',
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'Your enrolment is confirmed. You now have full access to course materials, lessons, and progress tracking.',
        'The fastest path is simple: start the first lesson, return until the course is complete, generate your certificate, then choose the next course while the knowledge is fresh.',
      ],
      details: [
        { label: 'Course', value: params.courseTitle },
        { label: 'Access', value: 'Immediate — start anytime' },
        { label: 'Next action', value: 'Complete lesson 1 today so your progress loop starts' },
      ],
      cta: { label: 'Start lesson 1', href: params.startUrl },
      noteHtml: `${offersHtml}Or open ${brandLink(params.dashboardUrl, 'My Learning')} to resume, track CEC progress, download certificates, and find the next recommended course.`,
    },
    `Hi ${params.name},\n\nYou're enrolled in ${params.courseTitle}.\n\nNext action: complete lesson 1 today so your progress loop starts.\n\nStart: ${params.startUrl}\n\nMy Learning: ${params.dashboardUrl}${offersText}`
  );
}

export function renderTeamMemberAddedEmail(params: {
  appOrigin: string;
  memberName: string;
  inviterName: string;
  teamName: string;
  courseTitles: string[];
  loginUrl: string;
  memberEmail: string;
  temporaryPassword?: string;
}): RenderedEmail {
  const courseList =
    params.courseTitles.length === 1
      ? params.courseTitles[0]!
      : params.courseTitles.map((t) => `• ${t}`).join('\n');
  const courseListHtml =
    params.courseTitles.length === 1
      ? escapeHtml(params.courseTitles[0]!)
      : params.courseTitles.map((t) => `• ${escapeHtml(t)}`).join('<br>');

  const details: CarsiEmailDetail[] = [
    {
      label: params.courseTitles.length === 1 ? 'Course' : 'Courses',
      value: courseList,
      valueHtml: courseListHtml,
    },
    { label: 'Team', value: params.teamName },
    { label: 'Added by', value: params.inviterName },
    { label: 'Sign-in email', value: params.memberEmail },
  ];
  if (params.temporaryPassword) {
    details.push({ label: 'Your password', value: params.temporaryPassword });
  }

  const coursePhrase =
    params.courseTitles.length === 1
      ? params.courseTitles[0]!
      : `these ${params.courseTitles.length} courses`;

  const paragraphs = [
    `${params.inviterName} gave you access to ${coursePhrase} on CARSI.`,
    'Use your sign-in details below — your password is only for you. Change it after your first login if you like.',
  ];

  const subjectCourse =
    params.courseTitles.length === 1
      ? params.courseTitles[0]!
      : `${params.courseTitles.length} courses`;

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `${params.inviterName} added you to ${subjectCourse}`,
      eyebrow: 'Course access',
      title: 'Your course access is ready',
      greeting: `Hi ${params.memberName},`,
      paragraphs,
      details,
      cta: { label: 'Sign in & start learning', href: params.loginUrl },
      noteHtml: `Sign in, then open ${brandLink(`${params.appOrigin}/dashboard/student`, 'My Learning')} — only the course(s) listed above are on your account.`,
    },
    `Hi ${params.memberName},\n\n${params.inviterName} gave you access on CARSI (${params.teamName}):\n\n${params.courseTitles.map((t) => `- ${t}`).join('\n')}\n\nSign-in email: ${params.memberEmail}\nYour password: ${params.temporaryPassword ?? '(ask your team owner)'}\n\nSign in: ${params.loginUrl}`
  );
}

export function renderYearlyMembershipEmail(params: {
  appOrigin: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  priceLabel: string;
  /** Courses the member can actually open. */
  courseCount: number;
  /**
   * Published courses on offer. When this exceeds `courseCount` the member does NOT have the
   * whole library, and the copy below says so instead of promising it. Defaults to
   * `courseCount` (full access) so callers that cannot distinguish keep the original wording.
   */
  publishedCourseCount?: number;
  durationLabel: string;
  loginUrl: string;
  dashboardUrl: string;
}): RenderedEmail {
  const publishedCourseCount = params.publishedCourseCount ?? params.courseCount;
  // Partial access is not just a smaller number: "all N published courses", "Full library
  // access" and "any published course in the catalogue" all promise the whole catalogue, so a
  // member short a revoked or failed course would be told they had it.
  const partialAccess = params.courseCount < publishedCourseCount;

  const courseAccessLine = partialAccess
    ? `${params.courseCount} of ${publishedCourseCount} published courses`
    : params.courseCount === 1
      ? '1 published course'
      : `all ${params.courseCount} published courses`;

  const title = partialAccess ? 'Your course access is ready' : 'Full library access is ready';
  const openingParagraph = partialAccess
    ? 'Your CARSI Yearly Membership is now active. You can sign in and start the courses in your account.'
    : 'Your CARSI Yearly Membership is now active. You can sign in and start any published course in the catalogue.';

  const details: CarsiEmailDetail[] = [
    { label: 'Membership', value: 'Yearly Membership' },
    { label: 'Price', value: params.priceLabel },
    { label: 'Access', value: courseAccessLine },
    { label: 'Duration', value: params.durationLabel },
    { label: 'Sign-in email', value: params.memberEmail },
    { label: 'Your password', value: params.temporaryPassword },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your CARSI Yearly Membership is active',
      eyebrow: 'Yearly Membership',
      title,
      greeting: `Hi ${params.memberName},`,
      paragraphs: [
        openingParagraph,
        'Use the sign-in details below. We recommend changing your password after your first login.',
      ],
      details,
      cta: { label: 'Sign in to CARSI', href: params.loginUrl },
      noteHtml: `Open ${brandLink(params.dashboardUrl, 'My Learning')} after sign-in to see your courses and track progress.`,
    },
    `Hi ${params.memberName},\n\nYour CARSI Yearly Membership is active.\n\nMembership: Yearly Membership\nPrice: ${params.priceLabel}\nAccess: ${courseAccessLine}\nDuration: ${params.durationLabel}\n\nSign-in email: ${params.memberEmail}\nPassword: ${params.temporaryPassword}\n\nSign in: ${params.loginUrl}\nDashboard: ${params.dashboardUrl}`
  );
}

/**
 * Pre-renewal reminder (Australian Consumer Law practice: tell the subscriber
 * before an automatic renewal charges them). Every value comes from the Stripe
 * upcoming invoice; the caller refuses to render when any is missing.
 */
export function renderRenewalReminderEmail(params: {
  appOrigin: string;
  name: string;
  planLabel: string;
  /** Team plans only: the team the plan belongs to. */
  teamName?: string;
  renewalDateLabel: string;
  /** e.g. "A$795.00 incl. GST" */
  amountLabel: string;
  manageUrl: string;
  /** How the subscriber cancels before the renewal date (plain sentence). */
  cancelInstruction: string;
}): RenderedEmail {
  const planFor = params.teamName ? `${params.planLabel} for ${params.teamName}` : params.planLabel;
  const lead = `Your ${planFor} renews automatically on ${params.renewalDateLabel}. On that date we will charge ${params.amountLabel} to the payment method on file.`;
  const noAction =
    'You do not need to do anything to keep your access. It will continue without interruption.';
  const cancel = `If you do not want to renew, cancel before ${params.renewalDateLabel}. ${params.cancelInstruction} Your access continues until the end of the current period and you will not be charged again.`;

  const details: CarsiEmailDetail[] = [
    { label: 'Plan', value: params.planLabel },
    ...(params.teamName ? [{ label: 'Team', value: params.teamName }] : []),
    { label: 'Renewal date', value: params.renewalDateLabel },
    { label: 'Amount', value: params.amountLabel },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `Your ${params.planLabel} renews on ${params.renewalDateLabel}`,
      eyebrow: 'Renewal reminder',
      title: 'Your plan renews soon',
      greeting: `Hi ${params.name},`,
      paragraphs: [lead, noAction, cancel],
      details,
      cta: { label: 'Manage your plan', href: params.manageUrl },
      noteHtml: `Manage billing, update your card or cancel from ${brandLink(params.manageUrl, 'your plan page')}.`,
    },
    [
      `Hi ${params.name},`,
      '',
      lead,
      '',
      noAction,
      '',
      cancel,
      '',
      `Plan: ${params.planLabel}`,
      ...(params.teamName ? [`Team: ${params.teamName}`] : []),
      `Renewal date: ${params.renewalDateLabel}`,
      `Amount: ${params.amountLabel}`,
      '',
      `Manage your plan: ${params.manageUrl}`,
    ].join('\n')
  );
}

export function renderAdminPasswordResetEmail(params: {
  appOrigin: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}): RenderedEmail {
  const name = params.memberName.trim() || params.memberEmail.split('@')[0] || 'there';
  const details: CarsiEmailDetail[] = [
    { label: 'Sign-in email', value: params.memberEmail },
    { label: 'Your new password', value: params.temporaryPassword },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your CARSI Learning password was updated',
      eyebrow: 'Account security',
      title: 'Your password was reset',
      greeting: `Hi ${name},`,
      paragraphs: [
        'A CARSI administrator has set a new password for your learning account.',
        'Sign in with the details below. We recommend changing your password after your first login.',
      ],
      details,
      cta: { label: 'Sign in to CARSI', href: params.loginUrl },
      noteHtml: `If you did not expect this change, contact ${brandLink(`${params.appOrigin}/contact`, 'CARSI support')} immediately.`,
    },
    `Hi ${name},\n\nA CARSI administrator has set a new password for your learning account.\n\nSign-in email: ${params.memberEmail}\nNew password: ${params.temporaryPassword}\n\nSign in: ${params.loginUrl}\n\nIf you did not expect this change, contact CARSI support.`
  );
}

export function renderCcwRoadshowBookingConfirmationEmail(params: {
  appOrigin: string;
  attendeeName: string;
  eventCity: string;
  eventDates: string;
  dateRangeLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  ticketLabel: string;
  seatCount: number;
  amountLabel: string;
  businessName?: string;
  phone?: string;
  eventPageUrl: string;
}): RenderedEmail {
  const name = params.attendeeName.trim() || 'there';
  const details: CarsiEmailDetail[] = [
    { label: 'Event', value: `${params.eventCity} — ${params.eventDates}` },
    { label: 'When', value: `${params.dateRangeLabel}. ${params.timeLabel}` },
    {
      label: 'Venue',
      value: params.venueName,
      valueHtml: `${escapeHtml(params.venueName)}<br>${escapeHtml(params.venueAddress)}`,
    },
    {
      label: 'Ticket',
      value: `${params.ticketLabel} (${params.seatCount} ${params.seatCount === 1 ? 'seat' : 'seats'})`,
    },
    { label: 'Paid', value: params.amountLabel },
  ];

  if (params.businessName) {
    details.push({ label: 'Business', value: params.businessName });
  }
  if (params.phone) {
    details.push({ label: 'Phone', value: params.phone });
  }

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `You're booked for ${params.eventCity} — ${params.eventDates}`,
      eyebrow: 'Booking confirmed',
      title: 'Your CARSI x CCW seat is reserved',
      greeting: `Hi ${name},`,
      paragraphs: [
        'Thank you — your payment was received through Stripe and your seat is confirmed.',
        'Please save this email. Arrive from 8.30am on day one. Course outline and practical chemical details are included as part of the course material on the day.',
      ],
      details,
      cta: { label: 'View event details', href: params.eventPageUrl },
      noteHtml: `Questions? Reply to this email or visit ${brandLink(params.eventPageUrl, 'the event page')}.`,
    },
    `Hi ${name},\n\nYour booking for CARSI x CCW Business Growth Days is confirmed.\n\nEvent: ${params.eventCity} — ${params.eventDates}\nWhen: ${params.dateRangeLabel}. ${params.timeLabel}\nVenue: ${params.venueName}, ${params.venueAddress}\nTicket: ${params.ticketLabel} (${params.seatCount} seats)\nPaid: ${params.amountLabel}\n\nEvent page: ${params.eventPageUrl}`
  );
}

export function renderContactNotificationEmail(params: {
  appOrigin: string;
  ticketRef: string;
  firstName: string;
  lastName: string;
  email: string;
  message: string;
  adminContactsUrl: string;
}): RenderedEmail {
  const fullName = `${params.firstName} ${params.lastName}`.trim();
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `New contact form — #${params.ticketRef}`,
      eyebrow: 'Contact form',
      title: `New message · #${params.ticketRef}`,
      paragraphs: [
        'A visitor submitted the CARSI contact form. Details are below.',
        'Reply directly to this email to respond to the sender (reply-to is set to their address).',
      ],
      details: [
        { label: 'Reference', value: params.ticketRef },
        { label: 'Name', value: fullName },
        { label: 'Email', value: params.email },
      ],
      messageHtml: formatPlainMessageAsHtml(params.message),
      cta: { label: 'Open in admin', href: params.adminContactsUrl },
      noteHtml: `Submitted via ${brandLink(`${params.appOrigin}/contact`, 'carsi.com.au/contact')}.`,
    },
    `Contact #${params.ticketRef}\nFrom: ${fullName} <${params.email}>\n\n${params.message}\n\nAdmin: ${params.adminContactsUrl}`
  );
}

/**
 * Outbound reply to a contact enquiry (Phase 2). `replyBody` is the full composed
 * text — greeting, paraphrased answer, standard citation, and the finalized
 * disclaimer footer — so the branded email renders exactly what is stored and
 * audited, with no room for the disclaimer to drift away from the sent content.
 */
export function renderContactReplyEmail(params: {
  appOrigin: string;
  replyBody: string;
  ticketRef?: string;
}): RenderedEmail {
  const base = params.appOrigin.replace(/\/$/, '');
  const ref = params.ticketRef?.trim();
  return render(
    {
      appOrigin: base,
      preheader: 'A response from the CARSI team',
      eyebrow: 'CARSI response',
      title: ref ? `Re: your enquiry · #${ref}` : 'Re: your enquiry',
      messageHtml: formatPlainMessageAsHtml(params.replyBody),
      noteHtml: `You're receiving this because you contacted ${brandLink(`${base}/contact`, 'carsi.com.au')}.`,
    },
    params.replyBody
  );
}

/** Post-event offer pack for both-days + email-opt-in CCW/CARSI attendees. */
export function renderCcwRoadshowOfferPackEmail(params: {
  appOrigin: string;
  attendeeName: string;
  eventCity: string;
  eventDates: string;
  /**
   * `null` when no distributable CCW product link is available (see
   * `resolveCcwShopifyTrainingUrl`). The Shopify CTA, its paragraph and its
   * text-body line are then omitted — the rest of the pack still sends. Never
   * fall back to a placeholder or a preview link.
   */
  shopifyTrainingUrl: string | null;
  socialLinks: ReadonlyArray<{ label: string; href: string }>;
}): RenderedEmail {
  const name = params.attendeeName.trim() || 'there';
  const shopifyUrl = params.shopifyTrainingUrl;
  const socialHtml = params.socialLinks
    .map((l) => `<li style="margin: 0 0 8px;">${brandLink(l.href, l.label)}</li>`)
    .join('');
  const socialText = params.socialLinks.map((l) => `- ${l.label}: ${l.href}`).join('\n');

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `Thanks for joining us in ${params.eventCity} — your exclusive CCW/CARSI offers`,
      eyebrow: 'Post-event offers',
      title: `Thanks for attending ${params.eventCity}`,
      greeting: `Hi ${name},`,
      paragraphs: [
        `You completed both days of the CARSI x CCW Business Growth Days (${params.eventDates}). Here are your exclusive follow-up offers.`,
        ...(shopifyUrl
          ? [
              `Shopify — CCW/CARSI 2 Day In-house Training: open the training product via the button below.`,
            ]
          : []),
      ],
      details: [{ label: 'Event', value: `${params.eventCity} — ${params.eventDates}` }],
      ...(shopifyUrl ? { cta: { label: 'View Shopify training product', href: shopifyUrl } } : {}),
      messageHtml: `
        <p style="margin: 20px 0 8px; font-family: ${BRAND.font}; font-size: 14px; font-weight: 600; color: ${BRAND.silverHi};">Stay connected with CCW</p>
        <ul style="margin: 0; padding-left: 18px; font-family: ${BRAND.font}; font-size: 14px; line-height: 1.5; color: ${BRAND.text};">
          ${socialHtml}
        </ul>
      `,
      noteHtml: `You're receiving this because you attended both days and opted in at check-in.`,
    },
    `Hi ${name},\n\nThanks for completing both days in ${params.eventCity} (${params.eventDates}).\n${
      shopifyUrl ? `\nShopify training product:\n${shopifyUrl}\n` : ''
    }\nStay connected with CCW:\n${socialText}\n`
  );
}

export function renderOwnerCircleBookingConfirmationEmail(params: {
  appOrigin: string;
  name: string;
  sessionTitle: string;
  dateLabel: string;
  timeLabel: string;
  venueName: string;
  venueAddress: string;
  packageLabel: string;
  seatCount: number;
  amountLabel: string;
  registrationStatus: 'confirmed' | 'waitlisted';
  businessName?: string;
  discussionTopic?: string;
  programUrl: string;
}): RenderedEmail {
  const name = params.name.trim() || 'there';
  const statusLine =
    params.registrationStatus === 'confirmed'
      ? 'Your seat is confirmed.'
      : 'You are on the waitlist — we will email you if a seat opens.';
  const details = [
    { label: 'Session', value: params.sessionTitle },
    { label: 'When', value: `${params.dateLabel} · ${params.timeLabel}` },
    { label: 'Venue', value: `${params.venueName}, ${params.venueAddress}` },
    {
      label: 'Package',
      value: `${params.packageLabel} (${params.seatCount} seat${params.seatCount === 1 ? '' : 's'})`,
    },
    { label: 'Paid', value: params.amountLabel },
    ...(params.businessName ? [{ label: 'Business', value: params.businessName }] : []),
  ];
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your Owner Circle booking is confirmed',
      eyebrow: 'Owner Circle',
      title: 'Booking received',
      paragraphs: [
        `Hi ${name},`,
        statusLine,
        'Bring your questions — this is a practical owner conversation with Phill McGurk.',
      ],
      details,
      ...(params.discussionTopic
        ? { messageHtml: formatPlainMessageAsHtml(`Topic you raised:\n${params.discussionTopic}`) }
        : {}),
      cta: { label: 'View Owner Circle', href: params.programUrl },
    },
    `Hi ${name},\n\n${statusLine}\n\n${params.sessionTitle}\n${params.dateLabel} · ${params.timeLabel}\n${params.venueName}, ${params.venueAddress}\n\n${params.programUrl}\n`
  );
}

export function renderCarsiCoachingMonthlyWelcomeEmail(params: {
  appOrigin: string;
  name: string;
  amountLabel: string;
  dashboardUrl: string;
  coachingPageUrl: string;
}): RenderedEmail {
  const name = params.name.trim() || 'there';
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Your CARSI Business Coaching subscription is active',
      eyebrow: 'Business Coaching',
      title: 'Welcome to CARSI Business Coaching',
      paragraphs: [
        `Hi ${name},`,
        'Thank you — your monthly Business Coaching subscription is confirmed. Phill and the CARSI team will email you within one business day with onboarding, your LMS roadmap, and the date for your first monthly planning session.',
        'Between sessions, work through the steps in your coaching portal so each month builds on the last.',
      ],
      details: [
        { label: 'Plan', value: 'CARSI Business Coaching' },
        { label: 'Billing', value: `${params.amountLabel} (monthly, via Stripe)` },
      ],
      cta: { label: 'Open your coaching portal', href: params.dashboardUrl },
      noteHtml: `Program details: ${brandLink(params.coachingPageUrl, 'carsi.com.au/ccw-training')}.`,
    },
    `Hi ${name},\n\nYour CARSI Business Coaching subscription is confirmed (${params.amountLabel}/month).\n\nWe will email you within one business day with onboarding and your first monthly session with Phill.\n\nDashboard: ${params.dashboardUrl}\nProgram: ${params.coachingPageUrl}\n`
  );
}

export function renderCarsiCoachingMonthlyFounderNotificationEmail(params: {
  appOrigin: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  carsiUserId: string;
  amountLabel: string;
  stripeCheckoutSessionId: string;
  stripeSubscriptionId?: string;
}): RenderedEmail {
  const details = [
    { label: 'Name', value: params.contactName || '—' },
    { label: 'Email', value: params.contactEmail },
    ...(params.contactPhone ? [{ label: 'Phone', value: params.contactPhone }] : []),
    { label: 'CARSI user id', value: params.carsiUserId },
    { label: 'Amount (checkout)', value: params.amountLabel },
    { label: 'Stripe Checkout session', value: params.stripeCheckoutSessionId },
    ...(params.stripeSubscriptionId
      ? [{ label: 'Stripe subscription', value: params.stripeSubscriptionId }]
      : []),
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'New CARSI Business Coaching subscription',
      eyebrow: 'Founder alert',
      title: 'New Business Coaching booking',
      paragraphs: [
        'A customer completed Stripe checkout for CARSI Business Coaching ($495/month). Full booking details are below.',
      ],
      details,
      cta: {
        label: 'View coaching page',
        href: `${params.appOrigin.replace(/\/$/, '')}/ccw-training`,
      },
    },
    [
      'New CARSI Business Coaching subscription',
      '',
      ...details.map((d) => `${d.label}: ${d.value}`),
      '',
      `Coaching page: ${params.appOrigin}/ccw-training`,
    ].join('\n')
  );
}

export function renderCoachingOnboardingSubmittedCoachEmail(params: {
  appOrigin: string;
  businessName: string;
  memberName: string;
  memberEmail: string;
  reportHtml: string;
  reportPlain: string;
  portalUrl: string;
}): RenderedEmail {
  const details = [
    { label: 'Business', value: params.businessName },
    { label: 'Member', value: params.memberName },
    { label: 'Email', value: params.memberEmail },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `Onboarding submission from ${params.businessName}`,
      eyebrow: 'Business Coaching',
      title: 'Member onboarding — full details',
      paragraphs: [
        'A coaching member completed their profile and assessment and sent the summary below. Reply directly to this email to reach them.',
      ],
      details,
      messageHtml: params.reportHtml,
      messageHtmlBare: true,
      cta: { label: 'Coaching portal', href: params.portalUrl },
    },
    params.reportPlain
  );
}

export function renderCoachingOnboardingSubmittedMemberEmail(params: {
  appOrigin: string;
  name: string;
  businessName: string;
  problemStatement: string;
  goalStatement: string;
  portalUrl: string;
}): RenderedEmail {
  const name = params.name.trim() || 'there';
  const summaryHtml = `
    <p style="margin: 0 0 12px; font-size: 14px; color: rgba(255,255,255,0.55);">What you told us</p>
    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #2490ed;">Your biggest problem</p>
    <div style="margin: 0 0 16px;">${formatPlainMessageAsHtml(params.problemStatement)}</div>
    <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #2490ed;">What success looks like to you</p>
    <div style="margin: 0;">${formatPlainMessageAsHtml(params.goalStatement)}</div>`;

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'Phill has received your business profile and assessment',
      eyebrow: 'Business Coaching',
      title: 'You’re all set — we’re on it',
      paragraphs: [
        `Hi ${name},`,
        `Thank you for completing onboarding for ${params.businessName}. Your full business profile, assessment answers, and web/social links have been sent to Phill and the CARSI coaching team.`,
        'Phill will review everything and follow up within one business day to confirm your first monthly planning session.',
      ],
      messageHtml: summaryHtml,
      cta: { label: 'Open coaching portal', href: params.portalUrl },
      noteHtml:
        'Your submission is saved in CARSI. If you need to correct something urgent, email support@carsi.com.au.',
    },
    [
      `Hi ${name},`,
      '',
      'Thank you — we received your onboarding for CARSI Business Coaching.',
      '',
      'Your problem:',
      params.problemStatement,
      '',
      'Your goal:',
      params.goalStatement,
      '',
      `Portal: ${params.portalUrl}`,
    ].join('\n')
  );
}

export function renderCoachingSessionPrepCoachEmail(params: {
  appOrigin: string;
  businessName: string;
  memberName: string;
  memberEmail: string;
  prepNotes: string;
  portalUrl: string;
}): RenderedEmail {
  const details = [
    { label: 'Business', value: params.businessName },
    { label: 'Member', value: params.memberName },
    { label: 'Email', value: params.memberEmail },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `Session prep from ${params.businessName}`,
      eyebrow: 'Business Coaching',
      title: 'Session prep notes',
      paragraphs: ['A member updated what they want to cover on the next coaching call.'],
      details,
      messageHtml: formatPlainMessageAsHtml(params.prepNotes),
      cta: { label: 'Coaching portal', href: params.portalUrl },
    },
    [
      'Session prep',
      '',
      ...details.map((d) => `${d.label}: ${d.value}`),
      '',
      params.prepNotes,
    ].join('\n')
  );
}

export function renderCoachingGrowthQuoteCoachEmail(params: {
  appOrigin: string;
  businessName: string;
  memberName: string;
  memberEmail: string;
  categoryTitle: string;
  serviceTitle: string;
  rateLabel: string;
  message: string;
  portalUrl: string;
}): RenderedEmail {
  const details = [
    { label: 'Business', value: params.businessName },
    { label: 'Member', value: params.memberName },
    { label: 'Email', value: params.memberEmail },
    { label: 'Category', value: params.categoryTitle },
    { label: 'Service', value: params.serviceTitle },
    { label: 'Indicative rate', value: params.rateLabel },
  ];

  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `Growth services quote — ${params.serviceTitle}`,
      eyebrow: 'Growth services',
      title: 'Quote request',
      paragraphs: ['A coaching member requested a written quote for implementation work.'],
      details,
      messageHtml: formatPlainMessageAsHtml(params.message),
      cta: { label: 'Growth services', href: params.portalUrl },
    },
    [
      'Growth quote request',
      '',
      ...details.map((d) => `${d.label}: ${d.value}`),
      '',
      params.message,
    ].join('\n')
  );
}

export function renderCoachingGrowthQuoteMemberEmail(params: {
  appOrigin: string;
  name: string;
  serviceTitle: string;
  rateLabel: string;
  portalUrl: string;
}): RenderedEmail {
  const name = params.name.trim() || 'there';
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: 'We received your Growth services quote request',
      eyebrow: 'Growth services',
      title: 'Quote request received',
      paragraphs: [
        `Hi ${name},`,
        `Thanks for your interest in ${params.serviceTitle} (indicative ${params.rateLabel}).`,
        'Phill or the CARSI team will reply with a written quote — final pricing is confirmed before any work starts.',
        'Your coaching membership covers strategy and accountability; implementation is quoted separately.',
      ],
      details: [{ label: 'Service', value: params.serviceTitle }],
      cta: { label: 'View Growth services', href: params.portalUrl },
    },
    [
      `Hi ${name},`,
      '',
      `Quote request: ${params.serviceTitle} (${params.rateLabel})`,
      '',
      params.portalUrl,
    ].join('\n')
  );
}
