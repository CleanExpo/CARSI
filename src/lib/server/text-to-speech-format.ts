/**
 * Strips the light markdown Margot's replies use (only **bold**, per
 * FormattedAssistantText.tsx's own parsing) before sending text to
 * text-to-speech, so the voice doesn't read out literal asterisks.
 * Content is preserved — only the ** markers are removed.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1').trim();
}
