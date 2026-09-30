import { sanitizeMarketingComposeHtml } from '@/lib/admin/marketing-compose-html';

export const MAX_MARKETING_BODY_HTML = 48_000;

export function sanitizeMarketingEmailBodyHtml(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';
  const cleaned = sanitizeMarketingComposeHtml(trimmed);
  if (cleaned.length > MAX_MARKETING_BODY_HTML) {
    throw new Error('INVALID_BODY_HTML');
  }
  if (!cleaned.replace(/<[^>]+>/g, '').trim()) {
    throw new Error('INVALID_BODY_HTML');
  }
  return cleaned;
}

export function marketingHtmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
