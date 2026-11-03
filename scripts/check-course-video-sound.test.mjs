#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { classify, extractVideoUrls, measure } from './check-course-video-sound.mjs';

const run = promisify(execFile);
const cli = fileURLToPath(new URL('./check-course-video-sound.mjs', import.meta.url));
async function invoke(args) {
  try {
    const result = await run(process.execPath, [cli, ...args], { timeout: 125_000 });
    return { ...result, code: 0 };
  } catch (err) {
    if (typeof err.code !== 'number') throw err;
    return err;
  }
}

test('classification thresholds and invalid measurements', () => {
  assert.equal(classify({ hasAudio: false }), 'NO_AUDIO');
  assert.equal(classify({ hasAudio: true, maxDb: -60, meanDb: -70 }), 'SILENT');
  assert.equal(classify({ hasAudio: true, maxDb: -59, meanDb: -40 }), 'TOO_QUIET');
  assert.equal(classify({ hasAudio: true, maxDb: -4, meanDb: -20 }), 'OK');
  assert.equal(classify({ hasAudio: true, maxDb: -Infinity, meanDb: -Infinity }), 'SILENT');
  assert.throws(() => classify({ hasAudio: true, maxDb: NaN, meanDb: -20 }));
});

test('extracts video and source URLs, resolves entities, ignores posters and deduplicates', () => {
  assert.deepEqual(extractVideoUrls(`
    <video poster="/poster.mp4" src="/sound.mp4?a=1&amp;b=2"></video>
    <video><source src='/other.webm'><source src=/third.mov></video>
    <video src="/sound.mp4?a=1&amp;b=2"></video>
    <img src="/image.mp4"><script>const url = '/unused.mp4';</script>
  `, 'https://example.test/courses/test'), [
    'https://example.test/sound.mp4?a=1&b=2', 'https://example.test/other.webm', 'https://example.test/third.mov',
  ]);
});

test('keeps video URLs without a file extension (signed or streaming URLs)', () => {
  assert.deepEqual(extractVideoUrls(
    '<video src="https://cdn.test/play?token=abc"></video><video src=""></video>',
    'https://example.test/courses/test',
  ), ['https://cdn.test/play?token=abc']);
});

test('short audio coverage is its own failure', () => {
  assert.equal(classify({ hasAudio: true, maxDb: -4, meanDb: -20, coverage: 0.25 }), 'SHORT_AUDIO');
  assert.equal(classify({ hasAudio: true, maxDb: -4, meanDb: -20, coverage: 0.95 }), 'OK');
  assert.equal(classify({ hasAudio: true, maxDb: -4, meanDb: -20 }), 'OK');
});

test('empty URL list exits 1', async () => {
  const result = await invoke(['--urls']);
  assert.equal(result.code, 1);
  assert.match(result.stderr, /zero videos measured/);
});

test('real ffmpeg fixtures and CLI enforcement', async (t) => {
  try { await run('ffmpeg', ['-version']); } catch (err) {
    if (err.code === 'ENOENT' && !process.env.CI) {
      t.skip('ffmpeg is genuinely missing from PATH; install ffmpeg to run the audio fixtures');
      return;
    }
    throw err;
  }
  // A missing ffprobe or a broken ffmpeg installation is a failure, never a skip.
  await run('ffprobe', ['-version']);
  const dir = await mkdtemp(join(tmpdir(), 'carsi video sound '));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const silent = join(dir, 'silent.mp4');
  const sound = join(dir, 'sound.mp4');
  const noAudio = join(dir, 'no-audio.mp4');
  const shortAudio = join(dir, 'short-audio.mp4');
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'lavfi', '-i', 'color=black:s=16x16:r=10',
    '-f', 'lavfi', '-t', '1', '-i', 'sine=frequency=1000:sample_rate=44100', '-c:a', 'aac',
    '-t', '4', '-c:v', 'mpeg4', '-y', shortAudio,
  ], { timeout: 30_000 });
  for (const [path, audio] of [[silent, 'anullsrc=r=44100:cl=mono'], [sound, 'sine=frequency=1000:sample_rate=44100'], [noAudio, null]]) {
    await run('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-f', 'lavfi', '-i', 'color=black:s=16x16:r=10',
      ...(audio ? ['-f', 'lavfi', '-i', audio, '-c:a', 'aac'] : ['-an']),
      '-t', '1', '-c:v', 'mpeg4', '-y', path,
    ], { timeout: 30_000 });
  }
  await t.test('anullsrc is SILENT; sine is OK; absent stream is NO_AUDIO', async () => {
    assert.equal((await measure(silent)).verdict, 'SILENT');
    assert.equal((await measure(sound)).verdict, 'OK');
    assert.equal((await measure(noAudio)).verdict, 'NO_AUDIO');
  });
  await t.test('audio that stops early is SHORT_AUDIO, measured over the whole video', async () => {
    const result = await measure(shortAudio);
    assert.equal(result.verdict, 'SHORT_AUDIO');
    assert.ok(result.coverage < 0.5, `coverage ${result.coverage}`);
  });
  await t.test('catalogue reads meta.introVideoUrl and holds known-silent entries to the list', async () => {
    const catalogue = join(dir, 'catalogue.json');
    const known = join(dir, 'known.json');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(catalogue, JSON.stringify({ courses: [
      { slug: 'top', introVideoUrl: sound },
      { slug: 'meta-only', meta: { introVideoUrl: silent } },
    ] }));
    await writeFile(known, JSON.stringify({ tracker: 'GP-671', urls: [] }));
    const strict = await invoke(['--catalog', catalogue, known]);
    assert.equal(strict.code, 1, 'a silent meta-only video must fail');
    assert.match(strict.stdout, /^SILENT .*pages=\/courses\/meta-only/m);
    await writeFile(known, JSON.stringify({ tracker: 'GP-671', urls: [silent] }));
    const held = await invoke(['--catalog', catalogue, known]);
    assert.equal(held.code, 0, held.stderr);
    assert.match(held.stdout, /^SILENT .*KNOWN GP-671/m);
    await writeFile(known, JSON.stringify({ tracker: 'GP-671', urls: [sound] }));
    const stale = await invoke(['--catalog', catalogue, known]);
    assert.equal(stale.code, 1, 'a known entry that now has sound must be removed');
    assert.match(stale.stderr, /remove it from the known-silent list/);
  });
  await t.test('CLI exits 1 for silence and 0 for sound', async () => {
    const bad = await invoke(['--urls', silent]);
    assert.equal(bad.code, 1);
    assert.match(bad.stdout, /^SILENT /m);
    const good = await invoke(['--urls', sound]);
    assert.equal(good.code, 0);
    assert.match(good.stdout, /^OK /m);
  });
  await t.test('CLI reports measurement errors as failures', async () => {
    const result = await invoke(['--urls', join(dir, 'missing.mp4')]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /^ERROR /m);
    assert.match(result.stdout, /ERROR=1/);
  });
  await t.test('live discovery measures a shared URL once and fails on fetch errors or empty discovery', async () => {
    const media = await readFile(sound);
    let broken = false;
    let empty = false;
    const server = createServer((req, res) => {
      if (req.url === '/sitemap.xml') {
        res.end(`<urlset>${empty ? '' : ['/courses/one', '/courses/two'].map((path) => `<url><loc>${base}${path}</loc></url>`).join('')}</urlset>`);
      } else if (req.url === '/courses/one' || req.url === '/courses/two') {
        if (broken && req.url === '/courses/two') { res.writeHead(503); res.end('Unavailable'); }
        else res.end('<video controls><source src="/sound.mp4" type="video/mp4"></video>');
      } else if (req.url === '/sound.mp4') {
        res.setHeader('Content-Type', 'video/mp4'); res.end(media);
      } else { res.writeHead(404); res.end(); }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const good = await invoke(['--live', base]);
      assert.equal(good.code, 0, good.stderr);
      assert.match(good.stdout, /1 videos measured; OK=1/);
      assert.match(good.stdout, /pages=.*\/courses\/one, .*\/courses\/two/);
      broken = true;
      const failed = await invoke(['--live', base]);
      assert.equal(failed.code, 1);
      assert.match(failed.stderr, /HTTP 503/);
      assert.match(failed.stdout, /OK=1 .*ERROR=1/);
      empty = true;
      const none = await invoke(['--live', base]);
      assert.equal(none.code, 1);
      assert.match(none.stderr, /zero videos measured/);
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });
});
