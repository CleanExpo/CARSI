// Course diagram check (Course Standard v1, diagrams). Every hand-written SVG under
// public/courses/<slug>/diagrams must fit its viewBox, keep text clear of other text and shapes,
// have arrows that reach a shape, and carry the CARSI wordmark as an embedded image.
// Usage: node scripts/check-course-diagrams.mjs [dir-with-svgs ...] [--chromium <executable>]
// With no dir, checks every public/courses/*/diagrams folder. Exit 1 on any finding.
// Checks:
//  OOB      element bbox (incl. half stroke) outside the viewBox
//  TXT-TXT  two text boxes intersect
//  TXT-LINE a line / path / polyline passes through a text box
//  TXT-EDGE a text box crosses the outline of a rect/circle/ellipse/image (straddles a border)
//  TIGHT    text closer than 4px to a shape beside it; TIGHT-IN closer than 3px to the edge of a shape containing it
//  IMG-OVERLAP an embedded image (logo) is within 4px of any other element
//  ARROW    an arrow neither ends within 5px of a shape outline nor passes through a shape wall (dangling)
//  NO-LOGO  no embedded CARSI wordmark (<image href="data:image/png;base64,...">)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const ci = args.indexOf('--chromium');
const exe = ci >= 0 ? args.splice(ci, 2)[1] : undefined;
const COURSES = path.join('public', 'courses');
const dirs = args.length
  ? args
  : fs
      .readdirSync(COURSES)
      .map((c) => path.join(COURSES, c, 'diagrams'))
      .filter((d) => fs.existsSync(d));

async function audit(page, svgText) {
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff">${svgText}</body></html>`
  );
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const svg = document.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    const sRect = svg.getBoundingClientRect();
    const sx = vb.width / sRect.width;
    const sy = vb.height / sRect.height;
    const toUser = (r) => ({
      x0: (r.left - sRect.left) * sx + vb.x,
      y0: (r.top - sRect.top) * sy + vb.y,
      x1: (r.right - sRect.left) * sx + vb.x,
      y1: (r.bottom - sRect.top) * sy + vb.y,
    });
    const drawn = [
      ...svg.querySelectorAll('text,rect,circle,ellipse,line,path,polyline,polygon,image'),
    ].filter((el) => !el.closest('defs,marker,title,desc'));
    const items = [];
    drawn.forEach((el, i) => {
      const tag = el.tagName;
      const sw =
        parseFloat(el.getAttribute('stroke-width') || (el.getAttribute('stroke') ? '1' : '0')) || 0;
      const hasStroke = el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none';
      const half = hasStroke ? sw / 2 : 0;
      const b = toUser(el.getBoundingClientRect());
      const label =
        tag === 'text'
          ? `text"${el.textContent.trim().slice(0, 40)}"`
          : `${tag}#${i}${el.getAttribute('x') ? `(x=${el.getAttribute('x')},y=${el.getAttribute('y')})` : ''}${
              el.getAttribute('d') ? `(d=${el.getAttribute('d').slice(0, 30)})` : ''
            }${tag === 'line' ? `(${el.getAttribute('x1')},${el.getAttribute('y1')}->${el.getAttribute('x2')},${el.getAttribute('y2')})` : ''}`;
      const it = { i, tag, label, b, half, el };
      // background rect = full-canvas rect
      it.isBg =
        tag === 'rect' &&
        b.x0 <= vb.x + 0.5 &&
        b.y0 <= vb.y + 0.5 &&
        b.x1 >= vb.x + vb.width - 0.5 &&
        b.y1 >= vb.y + vb.height - 0.5;
      // sample points along strokes (lines/paths/polylines)
      if (['line', 'path', 'polyline'].includes(tag) && hasStroke) {
        const len = el.getTotalLength();
        const pts = [];
        const m = el.getCTM();
        for (let d = 0; d <= len; d += 1) {
          const p = el.getPointAtLength(d);
          pts.push({ x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f });
        }
        it.pts = pts;
        it.sw = sw;
        it.marker = !!el.getAttribute('marker-end');
        it.markerStart = !!el.getAttribute('marker-start');
      }
      items.push(it);
    });
    const findings = [];
    const W = vb.width,
      H = vb.height;
    // OOB
    for (const it of items) {
      if (it.isBg) continue;
      const b = it.b;
      if (
        b.x0 - it.half < vb.x - 0.5 ||
        b.y0 - it.half < vb.y - 0.5 ||
        b.x1 + it.half > vb.x + W + 0.5 ||
        b.y1 + it.half > vb.y + H + 0.5
      )
        findings.push(
          `OOB ${it.label} bbox=[${b.x0.toFixed(1)},${b.y0.toFixed(1)},${b.x1.toFixed(1)},${b.y1.toFixed(1)}] viewBox=0 0 ${W} ${H}`
        );
    }
    const texts = items.filter((it) => it.tag === 'text');
    // text boxes: shrink vertically to the glyph band (font bbox over-reports ascent/descent)
    const tbox = (t) => {
      const fs = parseFloat(t.el.getAttribute('font-size') || '16');
      const y = parseFloat(t.el.getAttribute('y'));
      // cap-height ~0.72em above baseline, descender ~0.21em below
      return { x0: t.b.x0, x1: t.b.x1, y0: y - 0.74 * fs, y1: y + 0.22 * fs };
    };
    const inter = (a, b, pad = 0) =>
      a.x0 < b.x1 - pad && b.x0 < a.x1 - pad && a.y0 < b.y1 - pad && b.y0 < a.y1 - pad;
    for (let a = 0; a < texts.length; a++)
      for (let c = a + 1; c < texts.length; c++) {
        const A = tbox(texts[a]),
          B = tbox(texts[c]);
        if (inter(A, B, 0.5)) findings.push(`TXT-TXT ${texts[a].label} x ${texts[c].label}`);
      }
    // text vs strokes
    for (const t of texts) {
      const T = tbox(t);
      for (const s of items) {
        if (!s.pts) continue;
        const pad = s.sw / 2 + 1;
        const hit = s.pts.some(
          (p) => p.x > T.x0 - pad && p.x < T.x1 + pad && p.y > T.y0 - pad && p.y < T.y1 + pad
        );
        if (hit) findings.push(`TXT-LINE ${t.label} crossed by ${s.label}`);
      }
    }
    // text straddling a shape outline
    const outlines = items.filter(
      (it) => ['rect', 'circle', 'ellipse', 'image', 'polygon'].includes(it.tag) && !it.isBg
    );
    for (const t of texts) {
      const T = tbox(t);
      for (const s of outlines) {
        const S = s.b;
        const overlaps = inter(T, S, 0);
        const inside = T.x0 >= S.x0 + 1 && T.x1 <= S.x1 - 1 && T.y0 >= S.y0 + 1 && T.y1 <= S.y1 - 1;
        if (overlaps && !inside) {
          // tiny decoration dots (r<=4) covered by text are also flagged
          findings.push(
            `TXT-EDGE ${t.label} crosses edge of ${s.label} [${S.x0.toFixed(0)},${S.y0.toFixed(0)},${S.x1.toFixed(0)},${S.y1.toFixed(0)}]`
          );
        }
      }
    }
    // clearance: text keeps >=4px from shapes beside it, and >=3px inside shapes that contain it
    for (const t of texts) {
      const T = tbox(t);
      for (const s of outlines) {
        const S = s.b;
        const inside = T.x0 >= S.x0 + 1 && T.x1 <= S.x1 - 1 && T.y0 >= S.y0 + 1 && T.y1 <= S.y1 - 1;
        if (inter(T, S, 0) && !inside) continue; // already reported as TXT-EDGE
        if (inside) {
          const m = Math.min(T.x0 - S.x0, S.x1 - T.x1, T.y0 - S.y0, S.y1 - T.y1);
          if (m < 3)
            findings.push(`TIGHT-IN ${t.label} only ${m.toFixed(1)}px from edge of ${s.label}`);
        } else {
          const gx = Math.max(S.x0 - T.x1, T.x0 - S.x1, 0);
          const gy = Math.max(S.y0 - T.y1, T.y0 - S.y1, 0);
          const gap = Math.max(gx, gy);
          if (gap < 4)
            findings.push(
              `TIGHT ${t.label} only ${gap.toFixed(1)}px from ${s.label} [${S.x0.toFixed(0)},${S.y0.toFixed(0)},${S.x1.toFixed(0)},${S.y1.toFixed(0)}]`
            );
        }
      }
    }
    // embedded images (the logo) must keep 4px clear of every other drawn element
    for (const im of items.filter((it) => it.tag === 'image')) {
      const I = im.b;
      const padded = { x0: I.x0 - 4, y0: I.y0 - 4, x1: I.x1 + 4, y1: I.y1 + 4 };
      for (const o of items) {
        if (o === im || o.isBg) continue;
        const O =
          o.tag === 'text'
            ? tbox(o)
            : {
                x0: o.b.x0 - o.half,
                y0: o.b.y0 - o.half,
                x1: o.b.x1 + o.half,
                y1: o.b.y1 + o.half,
              };
        if (inter(padded, O, 0)) findings.push(`IMG-OVERLAP ${im.label} within 4px of ${o.label}`);
      }
    }
    // dangling arrows: the tip must land within 6px of some shape outline (or another stroke)
    const nearOutline = (p, S, tol) => {
      const insideX = p.x >= S.x0 - tol && p.x <= S.x1 + tol;
      const insideY = p.y >= S.y0 - tol && p.y <= S.y1 + tol;
      if (!insideX || !insideY) return false;
      const dx = Math.min(Math.abs(p.x - S.x0), Math.abs(p.x - S.x1));
      const dy = Math.min(Math.abs(p.y - S.y0), Math.abs(p.y - S.y1));
      return dx <= tol || dy <= tol;
    };
    for (const s of items) {
      if (!s.pts || (!s.marker && !s.markerStart)) continue;
      const ends = [];
      if (s.marker) ends.push(['end', s.pts[s.pts.length - 1]]);
      if (s.markerStart) ends.push(['start', s.pts[0]]);
      for (const [which, p] of ends) {
        const near = outlines.some((o) => o !== s && nearOutline(p, o.b, 5));
        // or the stroke passes through a wall: some samples inside a shape and some outside it
        const crosses = outlines.some((o) => {
          const B = o.b;
          const ins = (q) => q.x > B.x0 + 2 && q.x < B.x1 - 2 && q.y > B.y0 + 2 && q.y < B.y1 - 2;
          const outs = (q) => q.x < B.x0 - 2 || q.x > B.x1 + 2 || q.y < B.y0 - 2 || q.y > B.y1 + 2;
          return s.pts.some(ins) && s.pts.some(outs) && B.x1 - B.x0 > 30 && B.y1 - B.y0 > 30;
        });
        const ok = near || crosses;
        if (!ok)
          findings.push(
            `ARROW ${which} of ${s.label} at (${p.x.toFixed(0)},${p.y.toFixed(0)}) does not touch or cross a shape outline (dangling)`
          );
      }
    }
    return { W, H, n: items.length, findings };
  });
}

(async () => {
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  const files = dirs.flatMap((d) =>
    fs
      .readdirSync(d)
      .filter((f) => f.endsWith('.svg'))
      .sort()
      .map((f) => path.join(d, f))
  );
  let total = 0;
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    const r = await audit(page, svg);
    if (!/<image\b[^>]*href="data:image\/png;base64,/.test(svg))
      r.findings.push('NO-LOGO no embedded CARSI wordmark (public/logo/logo1.png as a data URI)');
    total += r.findings.length;
    console.log(`## ${f}  viewBox 800x${r.H}  elements=${r.n}  findings=${r.findings.length}`);
    for (const x of r.findings) console.log('  - ' + x);
  }
  console.log(`SUMMARY files=${files.length} findings=${total}`);
  await browser.close();
  process.exit(total ? 1 : 0);
})();
