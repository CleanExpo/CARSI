/**
 * The text of a source file as a visitor reads it (GP-771). The approach follows DR-NRPG's IICRC
 * check (apps/web/scripts/check-iicrc-standard-refs.cjs, ba742066); only the reading view is
 * borrowed, none of its rules.
 *
 * A browser shows `Approved <strong>CEC</strong> Provider`, `Approved{' '}CEC` and a phrase wrapped
 * over several source lines as one phrase. A wording guard that reads the raw source sees markup
 * between the words and misses it. So:
 *   - a markup tag, an HTML comment, a JSX space (`{' '}`) and an escaped line break become a space;
 *   - a JSX expression that holds only a string, number or plain template literal shows that
 *     literal (`{'IICRC'}`, `{`CEC`}`); a variable, call or template with `${...}` is left as source;
 *   - character entities (`&amp;`, `&nbsp;`, `&#65;`, `&#x41;`) read as the character they show;
 *   - in markdown, `**` and `__` emphasis markers show nothing;
 *   - every run of whitespace collapses to one space.
 *
 * Two views are produced. In the spaced view every tag is a space, so `Approved</span> <b>CEC`
 * reads as a phrase. In the joined view an inline tag is nothing, because an inline tag inside a
 * word shows no gap: `Appro<span>ved</span>` shows "Approved".
 *
 * `map[i]` is the source offset of view character `i`, so a match is reported on its source line.
 * Nothing is executed.
 */

export interface ReadingView {
  text: string;
  map: number[];
}

const MARKUP =
  /<!--[\s\S]*?-->|<\/?[A-Za-z][^<>]*>|\{\s*(['"`]) \1\s*\}|\\[nrt]|&(?:#[0-9]{1,7}|#[xX][0-9A-Fa-f]{1,6}|[A-Za-z][A-Za-z0-9]{1,31});/y;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  ensp: ' ',
  emsp: ' ',
  thinsp: ' ',
  hairsp: ' ',
  NewLine: ' ',
  Tab: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hyphen: '-',
  dash: '-',
  lpar: '(',
  rpar: ')',
  shy: '',
};

const SPACE_CHAR = /[ \n\r\t\f\v  -   　]/;

function decodeEntity(e: string): string | null {
  if (e[1] === '#') {
    const hex = e[2] === 'x' || e[2] === 'X';
    const code = hex ? parseInt(e.slice(3, -1), 16) : parseInt(e.slice(2, -1), 10);
    if (!(code >= 0 && code <= 0x10ffff)) return null;
    return String.fromCodePoint(code);
  }
  const name = e.slice(1, -1);
  return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, name) ? NAMED_ENTITIES[name] : null;
}

/** Tags that sit inside a line of text without a gap. Block tags and components stay a space. */
const INLINE_TAG =
  /^<\/?(?:span|strong|b|i|em|a|small|sup|sub|mark|u|abbr|code|s|ins|del|bdi|bdo|data|time|var|q|cite|dfn|kbd|samp|wbr)(?=[\s/>])/i;

function isInlineTag(tok: string): boolean {
  return tok.startsWith('<!--') || INLINE_TAG.test(tok);
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: '\n',
  r: '\r',
  t: '\t',
  b: '',
  f: '',
  v: '',
  0: '',
};

/**
 * A JSX expression holding only a literal shows that literal as text. Returns the shown characters
 * with their source offsets, or null when `{` does not open a lone literal.
 */
function parseJsxLiteral(
  src: string,
  start: number
): { chars: [string, number][]; end: number } | null {
  let i = start + 1;
  const skipSpace = () => {
    while (i < src.length && /\s/.test(src[i])) i++;
  };
  skipSpace();
  const chars: [string, number][] = [];
  const q = src[i];
  if (q === "'" || q === '"' || q === '`') {
    i++;
    for (;;) {
      if (i >= src.length) return null;
      const c = src[i];
      if (c === q) {
        i++;
        break;
      }
      if (c === '\n' && q !== '`') return null;
      if (q === '`' && c === '$' && src[i + 1] === '{') return null;
      if (c === '\\') {
        const e = src[i + 1];
        if (e === undefined) return null;
        let ch: string;
        let len = 2;
        if (e === 'x' && /^[0-9a-fA-F]{2}$/.test(src.slice(i + 2, i + 4))) {
          ch = String.fromCharCode(parseInt(src.slice(i + 2, i + 4), 16));
          len = 4;
        } else if (e === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
          ch = String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16));
          len = 6;
        } else if (e === '\n' || e === '\r') {
          ch = '';
          len = e === '\r' && src[i + 2] === '\n' ? 3 : 2;
        } else {
          ch = Object.prototype.hasOwnProperty.call(SIMPLE_ESCAPES, e) ? SIMPLE_ESCAPES[e] : e;
        }
        for (const x of ch) chars.push([x, i]);
        i += len;
        continue;
      }
      chars.push([c, i]);
      i++;
    }
  } else {
    const num = /[0-9](?:_?[0-9])*(?![0-9A-Za-z_$.])/y;
    num.lastIndex = i;
    const m = num.exec(src);
    if (!m) return null;
    for (let k = 0; k < m[0].length; k++) if (m[0][k] !== '_') chars.push([m[0][k], i + k]);
    i += m[0].length;
  }
  skipSpace();
  if (src[i] !== '}') return null;
  return { chars, end: i + 1 };
}

export interface ReadingViewOptions {
  /** Markdown source: `**` and `__` emphasis markers show nothing (`**IICRC**` reads "IICRC"). */
  markdown?: boolean;
}

/** One reading view of `src`. `joinTags`: an inline tag shows nothing rather than a space. */
export function readingView(
  src: string,
  joinTags: boolean,
  options: ReadingViewOptions = {}
): ReadingView {
  const out: string[] = [];
  const map: number[] = [];
  let space = false;
  const pushSpace = (at: number) => {
    if (!space) {
      out.push(' ');
      map.push(at);
      space = true;
    }
  };
  const pushChar = (ch: string, at: number) => {
    if (SPACE_CHAR.test(ch)) return pushSpace(at);
    out.push(ch);
    map.push(at);
    space = false;
  };
  for (let i = 0; i < src.length;) {
    const c = src[i];
    if (options.markdown && (c === '*' || c === '_') && src[i + 1] === c) {
      i += 2;
      continue;
    }
    if (c === '{') {
      const lit = parseJsxLiteral(src, i);
      if (lit) {
        for (const [ch, at] of lit.chars) pushChar(ch, at);
        if (lit.chars.length === 0 && !joinTags) pushSpace(i);
        i = lit.end;
        continue;
      }
    }
    if (c === '<' || c === '{' || c === '&' || c === '\\') {
      MARKUP.lastIndex = i;
      const m = MARKUP.exec(src);
      if (m) {
        const tok = m[0];
        if (tok[0] === '&') {
          const ch = decodeEntity(tok);
          if (ch !== null) {
            for (const x of ch) pushChar(x, i);
            i += tok.length;
            continue;
          }
        } else {
          if (!(joinTags && tok[0] === '<' && isInlineTag(tok))) pushSpace(i);
          i += tok.length;
          continue;
        }
      }
    }
    pushChar(c, i);
    i++;
  }
  return { text: out.join(''), map };
}

/** Both reading views of `src`: spaced, then joined. */
export function readingViews(src: string, options: ReadingViewOptions = {}): ReadingView[] {
  return [readingView(src, false, options), readingView(src, true, options)];
}

/** 1-based source line of a reading-view offset. */
export function sourceLine(src: string, view: ReadingView, at: number): number {
  const offset = view.map[at] ?? 0;
  let line = 1;
  for (let i = 0; i < offset; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}
