/**
 * CARSI branded transactional email layout — site theme (#060a14, glass card, #ed9d24 CTAs).
 * All project emails should use buildCarsiEmailHtml / render* helpers below.
 */

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
      IICRC CEC-approved restoration training
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
    ? `
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
        'Thank you for joining CARSI Learning — professional IICRC-aligned restoration training for Australian technicians and teams.',
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

export function renderEnrollmentWelcomeEmail(params: {
  appOrigin: string;
  name: string;
  courseTitle: string;
  startUrl: string;
  dashboardUrl: string;
}): RenderedEmail {
  return render(
    {
      appOrigin: params.appOrigin,
      preheader: `You're enrolled in ${params.courseTitle}`,
      eyebrow: 'Enrolment confirmed',
      title: 'Your course is ready',
      greeting: `Hi ${params.name},`,
      paragraphs: [
        'Your enrolment is confirmed. You now have full access to course materials, lessons, and progress tracking.',
      ],
      details: [
        { label: 'Course', value: params.courseTitle },
        { label: 'Access', value: 'Immediate — start anytime' },
      ],
      cta: { label: 'Start lesson 1', href: params.startUrl },
      noteHtml: `Or open ${brandLink(params.dashboardUrl, 'My Learning')} to see all your courses.`,
    },
    `Hi ${params.name},\n\nYou're enrolled in ${params.courseTitle}.\n\nStart: ${params.startUrl}\n\nMy Learning: ${params.dashboardUrl}`
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
    `Hi ${params.memberName},\n\n${params.inviterName} gave you access on CARSI (${params.teamName}):\n\n${params.courseTitles.map((t) => `- ${t}`).join('\n')}\n\nSign-in email: ${params.memberEmail}\nYour password: ${params.temporaryPassword ?? '(ask your team owner)'}\n\nSign in: ${params.loginUrl}`,
  );
}

export function renderYearlyMembershipEmail(params: {
  appOrigin: string;
  memberName: string;
  memberEmail: string;
  temporaryPassword: string;
  priceLabel: string;
  courseCount: number;
  durationLabel: string;
  loginUrl: string;
  dashboardUrl: string;
}): RenderedEmail {
  const courseAccessLine =
    params.courseCount === 1
      ? '1 published course'
      : `all ${params.courseCount} published courses`;

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
      title: 'Full library access is ready',
      greeting: `Hi ${params.memberName},`,
      paragraphs: [
        'Your CARSI Yearly Membership is now active. You can sign in and start any published course in the catalogue.',
        'Use the sign-in details below. We recommend changing your password after your first login.',
      ],
      details,
      cta: { label: 'Sign in to CARSI', href: params.loginUrl },
      noteHtml: `Open ${brandLink(params.dashboardUrl, 'My Learning')} after sign-in to see your courses and track progress.`,
    },
    `Hi ${params.memberName},\n\nYour CARSI Yearly Membership is active.\n\nMembership: Yearly Membership\nPrice: ${params.priceLabel}\nAccess: ${courseAccessLine}\nDuration: ${params.durationLabel}\n\nSign-in email: ${params.memberEmail}\nPassword: ${params.temporaryPassword}\n\nSign in: ${params.loginUrl}\nDashboard: ${params.dashboardUrl}`,
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
    { label: 'Ticket', value: `${params.ticketLabel} (${params.seatCount} ${params.seatCount === 1 ? 'seat' : 'seats'})` },
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
    `Hi ${name},\n\nYour booking for CARSI x CCW Business Growth Days is confirmed.\n\nEvent: ${params.eventCity} — ${params.eventDates}\nWhen: ${params.dateRangeLabel}. ${params.timeLabel}\nVenue: ${params.venueName}, ${params.venueAddress}\nTicket: ${params.ticketLabel} (${params.seatCount} seats)\nPaid: ${params.amountLabel}\n\nEvent page: ${params.eventPageUrl}`,
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
