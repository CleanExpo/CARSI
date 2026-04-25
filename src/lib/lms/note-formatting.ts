export type NoteFormatAction = 'heading' | 'quote' | 'bullet' | 'bold' | 'italic';

export function applyNoteFormatting(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: NoteFormatAction
): { value: string; selectionStart: number; selectionEnd: number } {
  const start = Math.max(0, Math.min(selectionStart, value.length));
  const end = Math.max(start, Math.min(selectionEnd, value.length));

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
