#!/usr/bin/env npx tsx

import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import {
  buildFloorCareIntroScenes,
  buildFloorCareSegmentFilter,
  parseFfmpegProbeOutput,
  validateFloorCareIntroVideo,
} from '../src/lib/video/floor-care-intro-plan';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = resolve(
  repoRoot,
  process.env.CARSI_FLOOR_CARE_INTRO_OUTPUT ??
    'public/videos/course-intros/commercial-floor-care-schools-childcare.mp4'
);
const voice = process.env.CARSI_LOCAL_VIDEO_VOICE?.trim() || 'Karen';
const speechRate = process.env.CARSI_LOCAL_VIDEO_SPEECH_RATE?.trim() || '185';
const sayPath = '/usr/bin/say';
const fontPath = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';

function ffmpegPath(): string {
  const installer = require('@ffmpeg-installer/ffmpeg') as { path?: string };
  if (!installer.path) throw new Error('@ffmpeg-installer/ffmpeg did not expose a binary path.');
  return installer.path;
}

function run(command: string, args: string[], capture = false): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
    });
    let stdout = '';
    let stderr = '';
    if (capture) {
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}${stderr ? `: ${stderr.slice(-1000)}` : ''}`));
    });
  });
}

async function render(): Promise<void> {
  const ffmpeg = ffmpegPath();
  const work = await mkdtemp(join(tmpdir(), 'carsi-floor-care-intro-'));
  const scenes = buildFloorCareIntroScenes();

  try {
    await mkdir(dirname(outputPath), { recursive: true });
    const segments: string[] = [];

    for (const [index, scene] of scenes.entries()) {
      const imagePath = resolve(repoRoot, scene.image);
      await stat(imagePath);

      const audioPath = join(work, `${String(index).padStart(2, '0')}-${scene.id}.aiff`);
      const segmentPath = join(work, `${String(index).padStart(2, '0')}-${scene.id}.mp4`);
      await run(sayPath, ['-v', voice, '-r', speechRate, '-o', audioPath, scene.narration]);
      await run(ffmpeg, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-loop',
        '1',
        '-i',
        imagePath,
        '-i',
        audioPath,
        '-vf',
        buildFloorCareSegmentFilter(scene.caption, fontPath),
        '-r',
        '25',
        '-c:v',
        'libx264',
        '-preset',
        'medium',
        '-crf',
        '23',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-shortest',
        '-movflags',
        '+faststart',
        segmentPath,
      ]);
      segments.push(segmentPath);
    }

    const concatPath = join(work, 'segments.txt');
    const concatBody = segments.map((path) => `file '${path.replace(/'/g, "'\\''")}'`).join('\n');
    await writeFile(concatPath, `${concatBody}\n`, 'utf8');
    await run(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatPath,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputPath,
    ]);

    const probeRun = await run(ffmpeg, ['-hide_banner', '-i', outputPath], true).catch((error: Error) => {
      const marker = ': ';
      const detail = error.message.includes(marker) ? error.message.slice(error.message.indexOf(marker) + marker.length) : error.message;
      return { stdout: '', stderr: detail };
    });
    const probe = parseFfmpegProbeOutput(probeRun.stderr);
    if (!probe) throw new Error('Could not parse the rendered MP4 metadata.');
    const file = await stat(outputPath);
    const validation = validateFloorCareIntroVideo(probe, file.size);
    if (!validation.valid) throw new Error(`Rendered MP4 failed acceptance: ${validation.errors.join('; ')}`);

    // Decode every frame and audio packet; a container-only success is not sufficient.
    await run(ffmpeg, ['-v', 'error', '-i', outputPath, '-f', 'null', '-']);

    console.log(
      JSON.stringify(
        {
          output: outputPath,
          voice,
          speechRate: Number(speechRate),
          scenes: scenes.length,
          bytes: file.size,
          ...probe,
          decoded: true,
        },
        null,
        2
      )
    );
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

render().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
