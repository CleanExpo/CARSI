/** IICRC CEC renewal workflow + communication audit trail types. */

export const RENEWAL_STATUSES = [
  'pending',
  'sent',
  'awaiting_response',
  'approved',
  'rejected',
  'completed',
  'skipped',
  'failed',
] as const;

export type RenewalStatus = (typeof RENEWAL_STATUSES)[number];

export const DELIVERY_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
  'skipped',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const COMMUNICATION_DIRECTIONS = ['outbound', 'inbound'] as const;
export type CommunicationDirection = (typeof COMMUNICATION_DIRECTIONS)[number];

export const COMMUNICATION_KINDS = [
  'iicrc_submission',
  'technician_receipt',
  'inbound_reply',
  'admin_manual',
] as const;

export type CommunicationKind = (typeof COMMUNICATION_KINDS)[number];

export type RenewalCommunicationAttachment = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number | null;
  direction: CommunicationDirection;
};

export type RenewalCommunication = {
  id: string;
  direction: CommunicationDirection;
  kind: CommunicationKind;
  initiated_by_admin_email: string | null;
  from_email: string;
  to_emails: string[];
  cc_emails: string[];
  subject: string;
  text_body: string | null;
  html_body: string | null;
  delivery_status: DeliveryStatus;
  provider_message_id: string | null;
  failure_reason: string | null;
  sent_at: string | null;
  received_at: string | null;
  created_at: string;
  attachments: RenewalCommunicationAttachment[];
};

export type RenewalSubmissionNote = {
  id: string;
  author_admin_email: string;
  body: string;
  follow_up_action: string | null;
  follow_up_due_at: string | null;
  created_at: string;
};

export type RenewalSubmissionDetail = {
  id: string;
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_title: string;
  course_slug: string;
  recipient_email: string;
  technician_email: string;
  status: string;
  renewal_status: RenewalStatus;
  initiated_by_admin_email: string | null;
  cec_hours: number | null;
  iicrc_discipline: string | null;
  iicrc_member_number: string | null;
  email_subject: string | null;
  email_text_body: string | null;
  email_html_body: string | null;
  cc_emails: string[];
  sent_at: string | null;
  failure_reason: string | null;
  provider_message_id: string | null;
  created_at: string;
  updated_at: string;
  communications: RenewalCommunication[];
  notes: RenewalSubmissionNote[];
};

export function renewalStatusLabel(status: RenewalStatus): string {
  const labels: Record<RenewalStatus, string> = {
    pending: 'Pending',
    sent: 'Sent',
    awaiting_response: 'Awaiting response',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    skipped: 'Skipped',
    failed: 'Failed',
  };
  return labels[status] ?? status;
}

export function isRenewalStatus(value: string): value is RenewalStatus {
  return (RENEWAL_STATUSES as readonly string[]).includes(value);
}
