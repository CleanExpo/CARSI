const SPEECH_MAX_CHARS = 3_500;

function parseTableCells(line: string): string[] {
  return line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function isTableSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1');
}

function truncateForSpeech(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  const slice = text.slice(0, maxChars);
  const lastSentence = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? ')
  );
  if (lastSentence > maxChars * 0.5) {
    return `${slice.slice(0, lastSentence + 1).trim()} …`;
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.7) {
    return `${slice.slice(0, lastSpace).trim()} …`;
  }

  return `${slice.trim()} …`;
}

/**
 * Converts Margot's markdown replies into natural spoken text before TTS.
 * Strips headings, links, tables, and list markers so ElevenLabs does not
 * read pipe characters, hashes, or URL syntax aloud.
 */
export function stripMarkdownForSpeech(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const spoken: string[] = [];
  let tableHeaders: string[] | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (spoken.length > 0 && spoken[spoken.length - 1] !== '') {
        spoken.push('');
      }
      continue;
    }

    if (line.startsWith('|')) {
      const cells = parseTableCells(line).map(stripInlineMarkdown);
      if (cells.length === 0) continue;
      if (isTableSeparatorRow(cells)) continue;

      if (!tableHeaders) {
        tableHeaders = cells;
        continue;
      }

      const pairs = tableHeaders.map((header, i) => {
        const value = cells[i] ?? '';
        return value ? `${header}: ${value}` : '';
      }).filter(Boolean);

      if (pairs.length > 0) {
        spoken.push(pairs.join('. ') + '.');
      }
      continue;
    }

    tableHeaders = null;

    const heading = line.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      spoken.push(stripInlineMarkdown(heading[1]) + '.');
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      spoken.push(stripInlineMarkdown(line.replace(/^[-*]\s+/, '')));
      continue;
    }

    spoken.push(stripInlineMarkdown(line));
  }

  const normalized = spoken
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  return truncateForSpeech(normalized, SPEECH_MAX_CHARS);
}
