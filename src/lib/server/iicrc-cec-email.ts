import { escapeHtml } from '@/lib/server/email-templates';

export type IicrcCecSubmissionEmailContent = {
  studentName: string;
  studentEmail: string;
  iicrcMemberNumber: string | null;
  courseTitle: string;
  iicrcDiscipline: string;
  cecHours: number;
  completedDate: string;
  credentialId: string;
  verificationUrl: string;
};

export function buildIicrcCecSubmissionSubject(params: IicrcCecSubmissionEmailContent): string {
  const hours =
    params.cecHours > 0 ? `${params.cecHours} CEC` : 'CEC';
  return `CARSI Certificate of Completion — ${params.studentName} — ${params.courseTitle} (${hours})`;
}

export function buildIicrcCecSubmissionText(params: IicrcCecSubmissionEmailContent): string {
  const member = params.iicrcMemberNumber?.trim() || 'Not on file';
  return [
    'IICRC Renewals,',
    '',
    'Please find attached the Certificate of Completion for the following CARSI Learning course.',
    '',
    `Technician name: ${params.studentName}`,
    `Technician email: ${params.studentEmail}`,
    `IICRC member number: ${member}`,
    `Course: ${params.courseTitle}`,
    `IICRC discipline: ${params.iicrcDiscipline}`,
    `CEC hours: ${params.cecHours > 0 ? params.cecHours : 'See attached certificate'}`,
    `Completion date: ${params.completedDate}`,
    `CARSI credential ID: ${params.credentialId}`,
    `Online verification: ${params.verificationUrl}`,
    '',
    'This message was sent automatically on behalf of the technician via CARSI Learning (carsi.com.au).',
    '',
    'Regards,',
    'CARSI Learning',
    'support@carsi.com.au',
  ].join('\n');
}

export function buildIicrcCecSubmissionHtml(params: IicrcCecSubmissionEmailContent): string {
  const member = params.iicrcMemberNumber?.trim() || 'Not on file';
  const rows = [
    ['Technician', params.studentName],
    ['Email', params.studentEmail],
    ['IICRC member #', member],
    ['Course', params.courseTitle],
    ['Discipline', params.iicrcDiscipline],
    [
      'CEC hours',
      params.cecHours > 0 ? String(params.cecHours) : 'See attached certificate',
    ],
    ['Completed', params.completedDate],
    ['Credential ID', params.credentialId],
    [
      'Verification',
      `<a href="${escapeHtml(params.verificationUrl)}">${escapeHtml(params.verificationUrl)}</a>`,
    ],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
    <tr>
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#2490ed;text-transform:uppercase;vertical-align:top;width:34%;border-bottom:1px solid rgba(255,255,255,0.08);">${escapeHtml(label)}</td>
      <td style="padding:8px 12px;font-size:14px;color:#fff;vertical-align:top;border-bottom:1px solid rgba(255,255,255,0.08);">${value.includes('<a ') ? value : escapeHtml(value)}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html><html><body style="margin:0;background:#060a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:rgba(255,255,255,0.9);">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2490ed;margin:0 0 8px;">CARSI Learning — CEC submission</p>
    <h1 style="font-size:20px;margin:0 0 16px;color:#fff;">Certificate of Completion</h1>
    <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.65);">Please find the attached Certificate of Completion for the course details below. This submission was sent on behalf of the technician.</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:4px;">${tableRows}</table>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);">CARSI Learning · carsi.com.au</p>
  </div></body></html>`;
}

export function buildTechnicianCecReceiptText(params: IicrcCecSubmissionEmailContent): string {
  return [
    `Hi ${params.studentName},`,
    '',
    `We've submitted your Certificate of Completion for "${params.courseTitle}" to IICRC Renewals (${params.iicrcDiscipline}, ${params.cecHours > 0 ? `${params.cecHours} CEC hours` : 'CEC credit'}).`,
    '',
    `Completion date: ${params.completedDate}`,
    `Verification: ${params.verificationUrl}`,
    '',
    'Keep this email as your receipt. IICRC may take time to update your renewal record.',
    '',
    'CARSI Learning',
  ].join('\n');
}

export function buildTechnicianCecReceiptHtml(params: IicrcCecSubmissionEmailContent): string {
  const hours =
    params.cecHours > 0 ? `${params.cecHours} CEC hours` : 'CEC credit';
  return `<!DOCTYPE html><html><body style="margin:0;background:#060a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:rgba(255,255,255,0.9);">
  <div style="max-width:600px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#2490ed;margin:0 0 8px;">CEC submitted to IICRC</p>
    <h1 style="font-size:20px;margin:0 0 16px;color:#fff;">Your credits were sent</h1>
    <p style="font-size:15px;line-height:1.6;color:rgba(255,255,255,0.65);">Hi ${escapeHtml(params.studentName)}, we've emailed your Certificate of Completion for <strong>${escapeHtml(params.courseTitle)}</strong> to IICRC Renewals (${escapeHtml(params.iicrcDiscipline)}, ${escapeHtml(hours)}).</p>
    <p style="font-size:14px;color:rgba(255,255,255,0.55);">Completed: ${escapeHtml(params.completedDate)}<br/>Verification: <a href="${escapeHtml(params.verificationUrl)}" style="color:#00F5FF;">${escapeHtml(params.verificationUrl)}</a></p>
    <p style="font-size:13px;color:rgba(255,255,255,0.45);">Keep this message as your receipt. IICRC may take time to update your renewal record.</p>
  </div></body></html>`;
}
