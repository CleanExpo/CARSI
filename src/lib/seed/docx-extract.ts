import { spawnSync } from 'node:child_process';

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([\da-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/**
 * Extract plain text from Word `word/document.xml` inside a .docx (zip).
 * Preserves line breaks from soft breaks and tabs from `w:tab`.
 */
export function extractDocxParagraphs(docxAbsolutePath: string): string[] {
  const r = spawnSync('unzip', ['-p', docxAbsolutePath, 'word/document.xml'], {
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(r.stderr?.trim() || `unzip failed with status ${r.status}`);
  }
  const xml = r.stdout;

  const blocks = xml.split(/<\/w:p>/);

  const out: string[] = [];
  for (const block of blocks) {
    let s = block;
    s = s.replace(/<w:br\b[^/>]*\/?>/gi, '\n');
    s = s.replace(/<w:tab\b[^/>]*\/?>/gi, '\t');

    const texts = [...s.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)].map((m) =>
      decodeXmlEntities(m[1] ?? '')
    );
    const line = texts.join('');
    const trimmed = line.replace(/\u00a0/g, ' ').trim();
    if (trimmed.length > 0) out.push(trimmed);
  }
  return out;
}
