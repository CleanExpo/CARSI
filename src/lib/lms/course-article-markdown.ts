const MODULE_HEADING = /^Module\s+(\d+)\s*(?:[—–\-:]\s*(.+))?$/i;

/** Strip a "Module 2 — Dry" heading down to the module title we store. */
export function stripModuleHeadingLabel(heading: string): string {
  const m = heading.trim().match(MODULE_HEADING);
  if (!m) return heading.trim();
  return (m[2] ?? '').trim() || heading.trim();
}

export function formatModuleHeading(index: number, title: string): string {
  const clean = stripModuleHeadingLabel(title) || 'Untitled module';
  return `Module ${index + 1} — ${clean}`;
}

export type CourseArticleSection = { title: string; body: string };

export type CourseArticleParse = {
  title: string | null;
  description: string;
  sections: CourseArticleSection[];
};

/** Join course title, lead and every module into one Medium-style Markdown document. */
export function composeCourseArticle(input: {
  title: string;
  description: string;
  modules: { title: string; textContent: string }[];
}): string {
  const parts: string[] = [];
  const title = input.title.trim();
  if (title) parts.push(`# ${title}`);
  const lead = input.description.trim();
  if (lead) parts.push(lead);
  input.modules.forEach((mod, index) => {
    parts.push(`## ${formatModuleHeading(index, mod.title)}`);
    const body = mod.textContent.trim();
    if (body) parts.push(body);
  });
  return parts.join('\n\n').trim();
}

/**
 * Split a course article on ATX headings. `#` is the course title.
 * Each `##` starts a module. Lead copy sits between the title and the first `##`.
 */
export function parseCourseArticle(raw: string): CourseArticleParse {
  const source = raw.replace(/\r\n/g, '\n').trim();
  if (!source) return { title: null, description: '', sections: [] };

  const lines = source.split('\n');
  let title: string | null = null;
  let i = 0;
  if (/^#\s+/.test(lines[0] ?? '') && !/^##\s+/.test(lines[0] ?? '')) {
    title = lines[0].replace(/^#\s+/, '').trim() || null;
    i = 1;
    while (i < lines.length && lines[i].trim() === '') i += 1;
  }

  const rest = lines.slice(i).join('\n');
  const chunks = rest.split(/^##\s+/m);
  const lead = (chunks[0] ?? '').trim();
  const sections: CourseArticleSection[] = [];
  for (const chunk of chunks.slice(1)) {
    const nl = chunk.indexOf('\n');
    const heading = (nl === -1 ? chunk : chunk.slice(0, nl)).trim();
    const body = (nl === -1 ? '' : chunk.slice(nl + 1)).trim();
    if (!heading && !body) continue;
    sections.push({ title: stripModuleHeadingLabel(heading || 'Untitled module'), body });
  }

  return { title, description: lead, sections };
}

export function mergeModulesFromArticle<
  T extends { key: string; id?: string; title: string; textContent: string; videoUrl: string },
>(existing: T[], sections: CourseArticleSection[], newKey: () => string): T[] {
  const used = new Set<number>();
  const next: T[] = sections.map((section, index) => {
    const byTitle = existing.findIndex(
      (m, idx) => !used.has(idx) && m.title.trim() === section.title
    );
    const pick = byTitle >= 0 ? byTitle : existing.findIndex((_, idx) => !used.has(idx) && idx === index);
    if (pick >= 0) used.add(pick);
    const prior = pick >= 0 ? existing[pick] : undefined;
    return {
      ...(prior ?? ({ key: newKey(), title: '', textContent: '', videoUrl: '' } as T)),
      title: section.title,
      textContent: section.body,
    };
  });

  for (let i = 0; i < existing.length; i += 1) {
    if (used.has(i)) continue;
    const leftover = existing[i];
    if (leftover.videoUrl.trim()) next.push({ ...leftover, textContent: leftover.textContent });
  }

  return next.length > 0 ? next : existing;
}
