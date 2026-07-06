/* CARSI lesson video renderer.
 *
 * Pipeline:
 *   1. Load a brief from course-lesson-video-briefs.json
 *   2. Split the script into sentence segments
 *   3. en-AU voiceover per segment via macOS `say` (voice: Karen); measure each
 *      duration with `afinfo` -> exact text/audio sync
 *   4. Concatenate segment audio -> narration.m4a (ffmpeg)
 *   5. Deterministic frame capture in headless Chromium (Playwright) via seek(t)
 *   6. ffmpeg: frames + narration -> 1080p H.264 MP4 (open captions baked in)
 *
 * Usage:
 *   node scripts/video-pipeline/render-lesson.mjs --index 0
 *   node scripts/video-pipeline/render-lesson.mjs --lesson <lessonId> --fps 30
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, rm, writeFile, readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FFMPEG = (await import('@ffmpeg-installer/ffmpeg')).default.path;
const { chromium } = await import('playwright');

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const INDEX = parseInt(getArg('index', '0'), 10);
const LESSON = getArg('lesson', null);
const FPS = parseInt(getArg('fps', '30'), 10);
const VOICE = getArg('voice', 'Karen'); // en-AU
const RATE = getArg('rate', '178');     // words/min for `say`

const BRIEFS_PATH = path.join(ROOT, 'data/video/course-lesson-video-briefs.json');
const briefsDoc = JSON.parse(await readFile(BRIEFS_PATH, 'utf8'));
const brief = LESSON
  ? briefsDoc.briefs.find((b) => b.lessonId === LESSON)
  : briefsDoc.briefs[INDEX];
if (!brief) { console.error('Brief not found'); process.exit(1); }

const OUT_DIR = path.join(ROOT, 'output/video', brief.courseSlug);
const WORK = path.join(ROOT, '.video-work', brief.lessonId);
const FRAMES = path.join(WORK, 'frames');
const AUDIO = path.join(WORK, 'audio');
await rm(WORK, { recursive: true, force: true });
await mkdir(FRAMES, { recursive: true });
await mkdir(AUDIO, { recursive: true });
await mkdir(OUT_DIR, { recursive: true });

const log = (...m) => console.log('•', ...m);

// ---- 1. split script into segments ----------------------------------------
function splitSentences(text) {
  const raw = text.match(/[^.!?]+[.!?]+/g) || [text];
  const segs = [];
  for (let s of raw.map((x) => x.trim()).filter(Boolean)) {
    // merge very short fragments into the previous segment
    if (segs.length && s.length < 28) segs[segs.length - 1] += ' ' + s;
    else segs.push(s);
  }
  return segs;
}
const sentences = splitSentences(brief.script);
log(`${sentences.length} segments`);

// ---- 2-3. TTS per segment + measure duration ------------------------------
async function ttsDuration(aiff) {
  const { stdout } = await execFileP('afinfo', [aiff]);
  const m = stdout.match(/estimated duration:\s*([0-9.]+)\s*sec/i);
  return m ? parseFloat(m[1]) : 0;
}

const GAP = 0.28; // seconds of breathing room appended after each segment
// pre-generate a reusable silence clip (old ffmpeg lacks apad=pad_dur)
const silence = path.join(AUDIO, 'silence.wav');
await execFileP(FFMPEG, ['-y', '-f', 'lavfi', '-i',
  'anullsrc=channel_layout=stereo:sample_rate=48000', '-t', String(GAP), silence]);

const scenes = [];
const concatList = [];
let cursor = 0;
for (let i = 0; i < sentences.length; i++) {
  const aiff = path.join(AUDIO, `seg_${String(i).padStart(3, '0')}.aiff`);
  await execFileP('say', ['-v', VOICE, '-r', RATE, '-o', aiff, sentences[i]]);
  const dur = await ttsDuration(aiff);
  const segDur = dur + GAP;
  scenes.push({ text: sentences[i], start: +cursor.toFixed(3), end: +(cursor + segDur).toFixed(3) });
  cursor += segDur;
  // uniform wav (48k stereo) so the concat demuxer is happy
  const wav = path.join(AUDIO, `seg_${String(i).padStart(3, '0')}.wav`);
  await execFileP(FFMPEG, ['-y', '-i', aiff, '-ar', '48000', '-ac', '2', wav]);
  concatList.push(`file '${wav}'`);
  concatList.push(`file '${silence}'`);
}
const TOTAL = +cursor.toFixed(3);
log(`narration ~${TOTAL.toFixed(1)}s`);

// ---- 4. concat audio -------------------------------------------------------
const listFile = path.join(AUDIO, 'list.txt');
await writeFile(listFile, concatList.join('\n'));
const narration = path.join(WORK, 'narration.m4a');
await execFileP(FFMPEG, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-c:a', 'aac', '-b:a', '192k', narration]);

// ---- 5. render frames ------------------------------------------------------
const sceneJs = await readFile(path.join(__dirname, 'scene.js'), 'utf8');
const lessonData = {
  lessonTitle: brief.title || brief.lessonTitle,
  moduleTitle: brief.moduleTitle,
  scenes,
  total: TOTAL,
};
const html = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;padding:0;background:#081726}#stage{}</style></head>
<body><div id="stage"></div>
<script>window.__LESSON__=${JSON.stringify(lessonData)};</script>
<script>${sceneJs}</script></body></html>`;
const htmlPath = path.join(WORK, 'scene.html');
await writeFile(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto('file://' + htmlPath);
await page.waitForFunction('window.__READY__ === true');

const frameCount = Math.ceil(TOTAL * FPS);
log(`rendering ${frameCount} frames @ ${FPS}fps`);
for (let f = 0; f < frameCount; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => window.seek(tt), t);
  await page.screenshot({ path: path.join(FRAMES, `f${String(f).padStart(6, '0')}.png`) });
  if (f % 60 === 0) process.stdout.write(`\r  frame ${f}/${frameCount}`);
}
process.stdout.write('\n');
await browser.close();

// ---- 6. encode MP4 ---------------------------------------------------------
const outFile = path.join(OUT_DIR, `${brief.lessonId}.mp4`);
await execFileP(FFMPEG, ['-y',
  '-framerate', String(FPS), '-i', path.join(FRAMES, 'f%06d.png'),
  '-i', narration,
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
  outFile]);

const sizeMB = ((await import('node:fs')).statSync(outFile).size / 1e6).toFixed(1);
log(`DONE -> ${path.relative(ROOT, outFile)} (${sizeMB} MB, ${TOTAL.toFixed(1)}s)`);
console.log(outFile);
