import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { brandVideoScripts, type BrandVideoScript } from '../src/lib/brand-video-assistant';

type AutomationMode = 'agent' | 'avatar';
type Command = 'plan' | 'submit' | 'poll' | 'execute';

type PlannedVideoJob = {
  id: string;
  title: string;
  mode: AutomationMode;
  aspectRatio: string;
  durationSeconds: number;
  placement: string;
  goal: string;
  ctaLabel: string;
  ctaHref: string;
  prompt: string;
  script: string;
  transcriptPath: string;
  srtPath: string;
};

type SubmittedJob = PlannedVideoJob & {
  status: 'planned' | 'submitted' | 'generating' | 'completed' | 'failed';
  sessionId?: string;
  videoId?: string;
  videoUrl?: string;
  outputPath?: string;
  failure?: string;
  submittedAt?: string;
  completedAt?: string;
};

const HEYGEN_BASE_URL = 'https://api.heygen.com';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function getCommand(): Command {
  if (hasFlag('execute')) return 'execute';
  if (hasFlag('submit')) return 'submit';
  if (hasFlag('poll')) return 'poll';
  return 'plan';
}

function getMode(): AutomationMode {
  const raw = argValue('mode') ?? process.env.BRAND_VIDEO_MODE ?? 'agent';
  return raw === 'avatar' ? 'avatar' : 'agent';
}

function selectedScripts(): BrandVideoScript[] {
  const raw = argValue('ids') ?? process.env.BRAND_VIDEO_IDS;
  if (!raw) return brandVideoScripts;
  const ids = new Set(
    raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
  return brandVideoScripts.filter((script) => ids.has(script.id));
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96);
}

function defaultAspect(script: BrandVideoScript): string {
  if (script.format === 'retention') return '9:16';
  return '16:9';
}

function buildAgentPrompt(script: BrandVideoScript): string {
  return [
    `Create a ${script.durationSeconds}-second CARSI brand assistant video.`,
    `Title: ${script.title}.`,
    `Audience: ${script.audience}.`,
    `Goal: ${script.goal}`,
    `Visual direction: ${script.visualDirection}`,
    `Voice direction: ${script.voiceDirection}`,
    'Use a calm, professional Australian training-guide tone.',
    'Do not overclaim compliance, insurance, IICRC, NRPG, or disaster recovery authority.',
    'End with exactly one next action.',
    `CTA: ${script.ctaLabel} (${script.ctaHref}).`,
    `Script: ${script.script}`,
  ].join('\n');
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function formatSrtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(milli).padStart(3, '0')}`;
}

function buildSrt(script: BrandVideoScript): string {
  const sentences = splitSentences(script.script);
  const totalChars = Math.max(
    1,
    sentences.reduce((sum, sentence) => sum + sentence.length, 0)
  );
  let cursor = 0;
  return sentences
    .map((sentence, index) => {
      const share = sentence.length / totalChars;
      const duration = Math.max(2.4, script.durationSeconds * share);
      const start = cursor;
      const end = Math.min(script.durationSeconds, cursor + duration);
      cursor = end;
      return `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${sentence}\n`;
    })
    .join('\n');
}

function buildTranscript(script: BrandVideoScript): string {
  return [
    `# ${script.title}`,
    '',
    `Script ID: \`${script.id}\``,
    `Audience: ${script.audience}`,
    `Format: ${script.format}`,
    `Duration: ${script.durationSeconds}s`,
    `Placement: ${script.placement}`,
    `CTA: [${script.ctaLabel}](${script.ctaHref})`,
    '',
    '## Voice Direction',
    '',
    script.voiceDirection,
    '',
    '## Visual Direction',
    '',
    script.visualDirection,
    '',
    '## Script',
    '',
    script.script,
    '',
  ].join('\n');
}

async function writeJson(filePath: string, data: unknown) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function planJobs(outDir: string, mode: AutomationMode): Promise<PlannedVideoJob[]> {
  const scripts = selectedScripts();
  if (scripts.length === 0) {
    throw new Error('No brand video scripts matched the requested ids.');
  }

  const transcriptDir = path.join(outDir, 'transcripts');
  const srtDir = path.join(outDir, 'captions');
  const jobsDir = path.join(outDir, 'jobs');
  await Promise.all([
    mkdir(transcriptDir, { recursive: true }),
    mkdir(srtDir, { recursive: true }),
    mkdir(jobsDir, { recursive: true }),
  ]);

  const jobs: PlannedVideoJob[] = [];

  for (const script of scripts) {
    const basename = slugify(script.id);
    const transcriptPath = path.join(transcriptDir, `${basename}.md`);
    const srtPath = path.join(srtDir, `${basename}.srt`);
    const aspectRatio = process.env.BRAND_VIDEO_ASPECT_RATIO ?? defaultAspect(script);
    const job: PlannedVideoJob = {
      id: script.id,
      title: script.title,
      mode,
      aspectRatio,
      durationSeconds: script.durationSeconds,
      placement: script.placement,
      goal: script.goal,
      ctaLabel: script.ctaLabel,
      ctaHref: script.ctaHref,
      prompt: buildAgentPrompt(script),
      script: script.script,
      transcriptPath,
      srtPath,
    };

    await writeFile(transcriptPath, buildTranscript(script));
    await writeFile(srtPath, buildSrt(script));
    await writeJson(path.join(jobsDir, `${basename}.json`), job);
    jobs.push(job);
  }

  await writeJson(path.join(outDir, 'brand-video-plan.json'), {
    generatedAt: new Date().toISOString(),
    mode,
    count: jobs.length,
    jobs,
  });

  return jobs;
}

function requireApiKey(): string {
  const key = process.env.HEYGEN_API_KEY;
  if (!key) {
    throw new Error('HEYGEN_API_KEY is required for --submit, --poll, or --execute.');
  }
  return key;
}

async function heygenRequest<T>(
  apiKey: string,
  method: string,
  route: string,
  body?: unknown
): Promise<T> {
  const response = await fetch(`${HEYGEN_BASE_URL}${route}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey,
      ...(method === 'POST' ? { 'Idempotency-Key': randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`HeyGen ${method} ${route} failed (${response.status}): ${text}`);
  }
  return payload as T;
}

function avatarPayload(job: PlannedVideoJob) {
  const avatarId = process.env.HEYGEN_AVATAR_ID;
  if (!avatarId) throw new Error('HEYGEN_AVATAR_ID is required when BRAND_VIDEO_MODE=avatar.');

  return {
    type: 'avatar',
    avatar_id: avatarId,
    title: `CARSI - ${job.title}`,
    resolution: process.env.BRAND_VIDEO_RESOLUTION ?? '1080p',
    aspect_ratio: job.aspectRatio,
    background: { type: 'color', value: process.env.BRAND_VIDEO_BACKGROUND ?? '#060a14' },
    caption: { file_format: 'srt', style: 'default' },
    output_format: 'mp4',
    script: job.script,
    voice_id: process.env.HEYGEN_VOICE_ID || undefined,
    voice_settings: {
      speed: Number(process.env.BRAND_VIDEO_VOICE_SPEED ?? '0.96'),
      pitch: Number(process.env.BRAND_VIDEO_VOICE_PITCH ?? '0'),
      volume: Number(process.env.BRAND_VIDEO_VOICE_VOLUME ?? '1'),
      locale: process.env.BRAND_VIDEO_LOCALE ?? 'en-AU',
    },
  };
}

async function submitJob(apiKey: string, job: PlannedVideoJob): Promise<SubmittedJob> {
  if (job.mode === 'avatar') {
    const response = await heygenRequest<{ data: { video_id?: string; status?: string } }>(
      apiKey,
      'POST',
      '/v3/videos',
      avatarPayload(job)
    );
    return {
      ...job,
      status: 'submitted',
      videoId: response.data.video_id,
      submittedAt: new Date().toISOString(),
    };
  }

  const response = await heygenRequest<{
    data: { session_id?: string; status?: string; video_id?: string };
  }>(apiKey, 'POST', '/v3/video-agents', {
    prompt: job.prompt,
    callback_url: process.env.HEYGEN_CALLBACK_URL || undefined,
    callback_id: `carsi:${job.id}:${createHash('sha256').update(job.prompt).digest('hex').slice(0, 12)}`,
  });

  return {
    ...job,
    status: 'submitted',
    sessionId: response.data.session_id,
    videoId: response.data.video_id,
    submittedAt: new Date().toISOString(),
  };
}

async function getVideoIdForSession(
  apiKey: string,
  job: SubmittedJob
): Promise<string | undefined> {
  if (job.videoId) return job.videoId;
  if (!job.sessionId) return undefined;
  const response = await heygenRequest<{ data: { video_id?: string; status?: string } }>(
    apiKey,
    'GET',
    `/v3/video-agents/${encodeURIComponent(job.sessionId)}`
  );
  return response.data.video_id;
}

async function pollVideo(apiKey: string, job: SubmittedJob): Promise<SubmittedJob> {
  const videoId = await getVideoIdForSession(apiKey, job);
  if (!videoId) return { ...job, status: 'generating' };

  const response = await heygenRequest<{
    data: { status?: string; video_url?: string; failure_code?: string; failure_message?: string };
  }>(apiKey, 'GET', `/v3/videos/${encodeURIComponent(videoId)}`);

  const status = response.data.status;
  if (status === 'completed' && response.data.video_url) {
    return {
      ...job,
      status: 'completed',
      videoId,
      videoUrl: response.data.video_url,
      completedAt: new Date().toISOString(),
    };
  }
  if (status === 'failed') {
    return {
      ...job,
      status: 'failed',
      videoId,
      failure: response.data.failure_message ?? response.data.failure_code ?? 'HeyGen video failed',
    };
  }
  return { ...job, status: 'generating', videoId };
}

async function downloadVideo(job: SubmittedJob, videoDir: string): Promise<SubmittedJob> {
  if (job.status !== 'completed' || !job.videoUrl) return job;
  await mkdir(videoDir, { recursive: true });
  const outputPath = path.join(videoDir, `${slugify(job.id)}.mp4`);
  const response = await fetch(job.videoUrl);
  if (!response.ok) {
    return { ...job, failure: `Download failed with HTTP ${response.status}` };
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  return { ...job, outputPath };
}

async function readSubmittedJobs(statusPath: string): Promise<SubmittedJob[]> {
  const text = await readFile(statusPath, 'utf8');
  const parsed = JSON.parse(text) as { jobs: SubmittedJob[] };
  return parsed.jobs ?? [];
}

async function writeStatus(statusPath: string, jobs: SubmittedJob[]) {
  await writeJson(statusPath, {
    updatedAt: new Date().toISOString(),
    jobs,
  });
}

async function main() {
  const command = getCommand();
  const mode = getMode();
  const outDir = path.resolve(
    argValue('out') ?? process.env.BRAND_VIDEO_OUTPUT_DIR ?? 'output/brand-video'
  );
  const statusPath = path.join(outDir, 'heygen-status.json');
  const videoDir = path.resolve(process.env.BRAND_VIDEO_VIDEO_DIR ?? path.join(outDir, 'videos'));

  if (command === 'plan') {
    const jobs = await planJobs(outDir, mode);
    console.log(`Planned ${jobs.length} CARSI brand video job(s) in ${outDir}`);
    return;
  }

  const apiKey = requireApiKey();

  if (command === 'submit' || command === 'execute') {
    const planned = await planJobs(outDir, mode);
    const submitted: SubmittedJob[] = [];
    for (const job of planned) {
      submitted.push(await submitJob(apiKey, job));
    }
    await writeStatus(statusPath, submitted);
    console.log(`Submitted ${submitted.length} CARSI brand video job(s). Status: ${statusPath}`);

    if (command === 'submit') return;
  }

  let jobs = await readSubmittedJobs(statusPath);
  const deadline = Date.now() + Number(process.env.BRAND_VIDEO_POLL_TIMEOUT_MS ?? 30 * 60 * 1000);
  const interval = Number(process.env.BRAND_VIDEO_POLL_INTERVAL_MS ?? 15_000);

  while (true) {
    jobs = await Promise.all(jobs.map((job) => pollVideo(apiKey, job)));
    jobs = await Promise.all(jobs.map((job) => downloadVideo(job, videoDir)));
    await writeStatus(statusPath, jobs);

    const done = jobs.every((job) => job.status === 'completed' || job.status === 'failed');
    const counts = jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`Video automation status: ${JSON.stringify(counts)}`);

    if (done || command === 'poll' || Date.now() > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
