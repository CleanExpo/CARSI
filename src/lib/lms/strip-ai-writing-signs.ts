/**
 * Strip Wikipedia “Signs of AI writing” tells from learner-facing course copy.
 * Source list: https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing
 *
 * Conservative: remove citation artefacts, chatbot voice, canned significance
 * phrasing, and placeholder/template junk. Do not rewrite technical terms
 * (enhance, key, highlight) when they stand alone.
 */

const VENDOR_CITE_MARKUP = [
  /【[^】]*】/g,
  /\bcontentReference\b/gi,
  /\boaicite\b/gi,
  /\boai_citation\b/gi,
  /\bturn\d+(?:search|news|image|file|cite)\d+\b/gi,
  /\[cite:\s*\d+\]/gi,
  /\[span_\d+\](?:\(start_span\))?/gi,
  /\bgrok_card\b/gi,
  /\bgrok_render_citation_card_json\b/gi,
  /\battached_file\b/gi,
  /\bppl-ai-file-upload\b/gi,
  /:::writing\b/gi,
  /\butm_source=[^&\s"'<>]+/gi,
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

const CANNED_SENTENCES = [
  /\bI(?:'m| am) (?:an AI|a language model)[^.?!\n]*[.?!]?\s*/gi,
  /\bAs an AI(?: language model)?[^.?!\n]*[.?!]?\s*/gi,
  /\bAs of my (?:last |knowledge )?cutoff[^.?!\n]*[.?!]?\s*/gi,
  /\bI (?:do not|don't) have (?:real-time |access to )?(?:information|data) after[^.?!\n]*[.?!]?\s*/gi,
  /\bI hope this (?:helps|is helpful)[^.?!\n]*[.?!]?\s*/gi,
  /\bLet me know if you (?:need|have|would like)[^.?!\n]*[.?!]?\s*/gi,
  /\bIn this (?:article|section|lesson|guide), we will (?:explore|discuss|examine|delve into|shed light on)[^.?!\n]*[.?!]?\s*/gi,
  /\bThis (?:article|section|lesson) (?:aims to|will) (?:provide|explore|discuss)[^.?!\n]*[.?!]?\s*/gi,
  /\bAs we (?:conclude|wrap up)[^.?!\n]*[.?!]?\s*/gi,
];

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/(^|[.!?]\s+)Certainly[!.,]\s*/gim, '$1'],
  [/(^|[.!?]\s+)Of course[!.,]\s*/gim, '$1'],
  [/(^|[.!?]\s+)Absolutely[!.,]\s*/gim, '$1'],
  [/(^|[.!?]\s+)(?:Additionally|Moreover|Furthermore),\s+/gim, '$1'],
  [/\bIn conclusion,\s+/gi, ''],
  [/\bLooking ahead,\s+/gi, ''],
  [/\bit'?s (?:important|critical|crucial) to (?:note|remember|consider) that\s+/gi, ''],
  [/\bit is worth noting that\s+/gi, ''],
  [/\bworth noting(?: that)?,\s+/gi, ''],
  [/\bin today'?s (?:ever-)?evolving landscape,?\s*/gi, ''],
  [/\bin the ever-evolving landscape of\s+/gi, 'in '],
  [/\ba rich tapestry of\s+/gi, ''],
  [/\bthe rich tapestry of\s+/gi, ''],
  [/\bplays? a (?:crucial|pivotal|vital|key) role in\s+/gi, 'is part of '],
  [/\bserves? as a testament to\s+/gi, 'shows '],
  [/\bstands? as a (?:testament|reminder) to\s+/gi, 'shows '],
  [/\bunderscores? (?:the importance of|its importance)\s+/gi, 'shows '],
  [/\bdelve(?:s|d)? into\s+/gi, 'cover '],
  [/\bdeep dive into\s+/gi, 'look at '],
  [/\bshed(?:s|ding)? light on\s+/gi, 'cover '],
  [/\bnestled (?:within|in)\s+/gi, 'in '],
  [/\bsetting the stage for\s+/gi, 'leading to '],
  [/\bmarking a pivotal moment in\s+/gi, 'in '],
  [/\bin the realm of\s+/gi, 'in '],
  [/\bnot only\s+([^,]+),\s+but also\s+/gi, '$1 and '],
  [/\bChallenges and Future (?:Prospects|Directions)\b/gi, 'Next steps'],
  [/\[(?:TODO|INSERT|PLACEHOLDER)[^\]]*\]/gi, ''],
  [/\{\{[a-z0-9._-]+\}\}/gi, ''],
  [/\blorem ipsum\b[^<\n]*/gi, ''],
];

function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.;:])/g, '$1')
    .trim();
}

export function stripAiWritingSigns(text: string): string {
  let out = text.replace(/\r\n/g, '\n');

  for (const re of VENDOR_CITE_MARKUP) {
    out = out.replace(re, '');
  }
  out = out.replace(EMOJI, '');
  out = out.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

  for (const re of CANNED_SENTENCES) {
    out = out.replace(re, '');
  }
  for (const [re, replacement] of PHRASE_REPLACEMENTS) {
    out = out.replace(re, replacement);
  }

  return tidyWhitespace(out);
}

export function stripAiWritingFromUnknown(value: unknown): unknown {
  if (typeof value === 'string') return stripAiWritingSigns(value);
  if (Array.isArray(value)) return value.map(stripAiWritingFromUnknown);
  if (value && typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      next[key] = stripAiWritingFromUnknown(child);
    }
    return next;
  }
  return value;
}

export function textHasAiWritingSigns(text: string): boolean {
  return stripAiWritingSigns(text) !== tidyWhitespace(text.replace(/\r\n/g, '\n'));
}
