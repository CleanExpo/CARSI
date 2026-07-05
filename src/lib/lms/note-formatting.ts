export type NoteFormatAction = 'heading' | 'quote' | 'bullet' | 'bold' | 'italic' | 'link' | 'code' | 'strikethrough';

/**
 * Renders a Markdown string as a plain-text preview, truncating and stripping formatting.
 * Used in UI to show a snippet of note content without HTML or Markdown markup.
 * 
 * @param markdown - the Markdown text to preview
 * @returns plain-text preview (up to ~120 chars with ellipsis)
 */
export function renderNotePreview(markdown: string): string {
  if (!markdown || markdown.trim() === '') return '';
  
  // Step 1: Strip Markdown formatting
  let plain = markdown
    .replace(/\s*```[^`]*```\s*/g, ' ')    // remove code blocks
    .replace(/\s*`[^`]+`\s*/g, ' ')        // inline code
    .replace(/\*\*[^
]+?\*\*/g, '$1')    // bold
    .replace(/\*[^\n]+?\*/g, '$1')         // italic
    .replace(/\[([^[]+)\]\([^)]+\)/g, '$1') // [text](url)
    .replace(/^>\s+/gm, '')                 // blockquote prefix
    .replace(/^#{1,6}\s+/gm, '')            // headings
    .replace(/^-\s+/gm, '')                 // bullets
    .replace(/~{2}[^~]+~{2}/g, '$1')        // strikethrough
    .replace(/\n{3,}/g, '\n\n');           // normalize excessive newlines
  
  // Step 2: Normalize whitespace and trim
  plain = plain.replace(/\s+/g, ' ').trim();
  
  // Step 3: Truncate to ~120 chars, preserving word boundaries
  if (plain.length > 120) {
    const lastSpace = plain.lastIndexOf(' ', 120);
    if (lastSpace > 0) {
      plain = plain.slice(0, lastSpace).trim();
    } else {
      plain = plain.slice(0, 120).trim();
    }
    plain += '…';
  }
  
  return plain;
}

export function applyNoteFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: NoteFormatAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));

  // Handle bold and italic separately as they are symmetric
  if (action === 'bold' || action === 'italic') {
    const marker = action === 'bold' ? '**' : '*';
    const selected = value.slice(start, end) || (action === 'bold' ? 'bold text' : 'italic text');
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    return {
      value: next,
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length + selected.length,
    };
  }

  // Handle line-based actions: heading, quote, bullet
  if (action === 'heading' || action === 'quote' || action === 'bullet') {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const afterEnd = value.indexOf('\n', end);
    const lineEnd = afterEnd === -1 ? value.length : afterEnd;
    const segment = value.slice(lineStart, lineEnd);
    const prefix = action === 'heading' ? '## ' : action === 'quote' ? '> ' : '- ';
    const updatedSegment = segment
      .split('\n')
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (line.trimStart().startsWith(prefix.trim())) return line;
        return `${prefix}${line}`;
      })
      .join('\n');
    const next = `${value.slice(0, lineStart)}${updatedSegment}${value.slice(lineEnd)}`;
    return {
      value: next,
      selectionStart: lineStart,
      selectionEnd: lineStart + updatedSegment.length,
    };
  }

  // Handle new formatting actions: link, code, strikethrough
  const selected = value.slice(start, end);
  
  if (action === 'link') {
    const placeholder = selected || 'link text';
    const next = `${value.slice(0, start)}[${placeholder}](http://)${value.slice(end)}`;
    return {
      value: next,
      selectionStart: start + placeholder.length + 2, // after [text]
      selectionEnd: start + placeholder.length + 3,   // cursor inside url
    };
  }
  
  if (action === 'code') {
    const marker = '`';
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    return {
      value: next,
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length + selected.length,
    };
  }
  
  if (action === 'strikethrough') {
    const marker = '~~';
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    return {
      value: next,
      selectionStart: start + marker.length,
      selectionEnd: start + marker.length + selected.length,
    };
  }
  
  // Fallback: should not reach here if type is correct
  return { value, selectionStart: start, selectionEnd: end };
}