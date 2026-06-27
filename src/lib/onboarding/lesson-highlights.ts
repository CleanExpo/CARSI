/** Extract existing markdown/HTML structure from lesson body — does not modify content. */
export function extractLessonHighlights(content: string | null | undefined): {
  objectives: string[];
  checklist: string[];
} {
  if (!content?.trim()) return { objectives: [], checklist: [] };

  const objectives = extractBulletsUnderHeading(content, /objectives?|learning\s+(outcomes?|points?|goals?)/i);
  const checklist = extractBulletsUnderHeading(content, /checklist|practical\s+steps?|on[\s-]site/i);

  if (objectives.length === 0) {
    const htmlItems = extractHtmlListItems(content);
    if (htmlItems.length > 0) {
      return { objectives: htmlItems.slice(0, 5), checklist };
    }

    const leadBullets = content
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[-*•]\s+/.test(l))
      .slice(0, 4)
      .map((l) => l.replace(/^[-*•]\s+/, '').trim())
      .filter(Boolean);
    if (leadBullets.length > 0) {
      return { objectives: leadBullets, checklist };
    }
  }

  return { objectives, checklist };
}

function extractBulletsUnderHeading(text: string, headingPattern: RegExp): string[] {
  const lines = text.split('\n');
  let inSection = false;
  const bullets: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    const heading = line.replace(/^#+\s*/, '').replace(/\*+/g, '').trim();

    if (/^#{1,3}\s/.test(line) || /^\*\*[^*]+\*\*:?\s*$/.test(line)) {
      if (headingPattern.test(heading)) {
        inSection = true;
        continue;
      }
      if (inSection) break;
    }

    if (!inSection) continue;

    const bullet = line.match(/^[-*•]\s+(.+)/);
    if (bullet?.[1]) {
      bullets.push(bullet[1].trim());
      if (bullets.length >= 6) break;
    } else if (line && !/^#{1,3}\s/.test(line) && bullets.length > 0 && line.length < 120) {
      bullets.push(line);
      if (bullets.length >= 6) break;
    }
  }

  return bullets;
}

function extractHtmlListItems(html: string): string[] {
  const items: string[] = [];
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text) items.push(text);
  }
  return items;
}
