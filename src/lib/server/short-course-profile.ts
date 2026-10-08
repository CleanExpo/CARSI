import { createHash } from 'node:crypto';

import { Prisma, type PrismaClient } from '@/generated/prisma/client';
import { readAdminCourseCurriculum } from '@/lib/admin/admin-course-curriculum-readback';
import { isUnpublishedCourseDraft } from '@/lib/admin/admin-courses-service';
import { hasUncredentialledStoredCecIdentity } from '@/lib/server/course-cec-hours';
import { prisma } from '@/lib/prisma';
import { courseWithCurriculum, type CourseWithCurriculum } from '@/lib/server/course-catalog-sync';
import { withSerializationRetry } from '@/lib/server/db-tx';

export const SHORT_COURSE_PROFILE_ID = 'carsi-short-courses-v1' as const;
export const SHORT_COURSE_HASH_DOMAINS = {
  source: 'carsi:short-course:source:v1',
  mapping: 'carsi:short-course:mapping:v1',
  profile: 'carsi:short-course:profile:v1',
} as const;

type SourceEntry = { id: string; kind: 'carsi-original' | 'authorised-case'; sha256: string; permissionEvidence: string };
export type ShortCourseDeliveryInput = {
  contentSha256: string;
  sourceManifest: { version: 1; entries: SourceEntry[] };
  sessions?: { objective: string; plannedMinutes: number }[];
};
export type ShortCourseSession = {
  sessionId: string; objective: string; plannedMinutes: number;
  readingLessonId: string; assessmentLessonId: string;
};
export type ShortCourseDeliveryProfile = {
  version: 1; profileId: typeof SHORT_COURSE_PROFILE_ID; contentSha256: string;
  sourceManifest: ShortCourseDeliveryInput['sourceManifest']; sourceManifestSha256: string;
  sessionMappingSha256: string; profileSha256: string; totalMinutes: number; sessions: ShortCourseSession[];
};
export type PublicShortCourseDelivery = Pick<ShortCourseDeliveryProfile, 'profileId' | 'totalMinutes' | 'sessions'>;

export class ShortCourseProfileError extends Error {
  constructor(public readonly status: 400 | 404 | 409 | 503) {
    super('Delivery profile unavailable');
  }
}

const HASH = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function invalid(): never { throw new ShortCourseProfileError(400); }
function object(raw: unknown, allowed: string[]): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid();
  if (Object.keys(raw).some((key) => !allowed.includes(key))) return invalid();
  return raw as Record<string, unknown>;
}
function list(raw: unknown, minimum: number, maximum: number): unknown[] {
  if (!Array.isArray(raw) || raw.length < minimum || raw.length > maximum) return invalid();
  for (let i = 0; i < raw.length; i++) if (!Object.hasOwn(raw, i)) return invalid();
  return raw;
}
function text(raw: unknown, maximum: number): string {
  if (typeof raw !== 'string') return invalid();
  const value = raw.trim();
  if (!value || value.length > maximum) return invalid();
  return value;
}
function hash(raw: unknown): string {
  if (typeof raw !== 'string' || !HASH.test(raw)) return invalid();
  return raw;
}
function minutes(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 10 || raw > 15) return invalid();
  return raw;
}

export function parseShortCourseDeliveryInput(raw: unknown): ShortCourseDeliveryInput {
  const input = object(raw, ['contentSha256', 'sourceManifest', 'sessions']);
  const source = object(input.sourceManifest, ['version', 'entries']);
  if (source.version !== 1) return invalid();
  const ids = new Set<string>();
  const entries = list(source.entries, 1, 20).map((raw): SourceEntry => {
    const entry = object(raw, ['id', 'kind', 'sha256', 'permissionEvidence']);
    const id = text(entry.id, 100);
    if (ids.has(id) || (entry.kind !== 'carsi-original' && entry.kind !== 'authorised-case')) return invalid();
    ids.add(id);
    return { id, kind: entry.kind, sha256: hash(entry.sha256), permissionEvidence: text(entry.permissionEvidence, 1000) };
  });
  const result: ShortCourseDeliveryInput = {
    contentSha256: hash(input.contentSha256), sourceManifest: { version: 1, entries },
  };
  if (Object.hasOwn(input, 'sessions')) {
    result.sessions = list(input.sessions, 4, 12).map((raw) => {
      const session = object(raw, ['objective', 'plannedMinutes']);
      return { objective: text(session.objective, 300), plannedMinutes: minutes(session.plannedMinutes) };
    });
  }
  return result;
}

/** Fixed explicit arrays and a final newline are the versioned canonical byte contract. */
export function shortCourseCanonicalBytes(domain: string, payload: unknown[]): string {
  return `${JSON.stringify([domain, ...payload])}\n`;
}
function digest(domain: string, payload: unknown[]): string {
  return createHash('sha256').update(shortCourseCanonicalBytes(domain, payload), 'utf8').digest('hex');
}
function sourcePayload(source: ShortCourseDeliveryInput['sourceManifest']): unknown[] {
  return [source.version, source.entries.map((entry) => [entry.id, entry.kind, entry.sha256, entry.permissionEvidence])];
}
function mappingPayload(sessions: ShortCourseSession[]): unknown[] {
  return [sessions.map((session) => [session.sessionId, session.readingLessonId, session.assessmentLessonId])];
}
function profilePayload(profile: Omit<ShortCourseDeliveryProfile, 'profileSha256'>): unknown[] {
  return [profile.version, profile.profileId, profile.contentSha256, profile.sourceManifestSha256,
    profile.sessionMappingSha256, profile.totalMinutes,
    profile.sessions.map((session) => [session.sessionId, session.objective, session.plannedMinutes,
      session.readingLessonId, session.assessmentLessonId])];
}

export function buildShortCourseDelivery(course: CourseWithCurriculum, raw: unknown): ShortCourseDeliveryProfile {
  const input = parseShortCourseDeliveryInput(raw);
  let current: ReturnType<typeof readAdminCourseCurriculum>;
  try { current = readAdminCourseCurriculum(course); } catch { throw new ShortCourseProfileError(409); }
  if (current.sha256 !== input.contentSha256) throw new ShortCourseProfileError(409);
  const pairs = [...course.modules].sort((a, b) => a.orderIndex - b.orderIndex).flatMap((module) => {
    const lessons = [...module.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    return lessons.filter((_, index) => index % 2 === 0).map((reading, index) => {
      const assessment = lessons[index * 2 + 1];
      if (!UUID.test(reading.id) || !assessment || !UUID.test(assessment.id)) throw new ShortCourseProfileError(409);
      return { reading, assessment };
    });
  });
  if (!input.sessions && pairs.length !== 6) return invalid();
  if (input.sessions && input.sessions.length !== pairs.length) return invalid();
  const sessions = pairs.map(({ reading, assessment }, index): ShortCourseSession => ({
    sessionId: `carsi-session:${reading.id}`,
    objective: input.sessions?.[index].objective ?? text(reading.title, 300),
    plannedMinutes: input.sessions?.[index].plannedMinutes ?? 15,
    readingLessonId: reading.id, assessmentLessonId: assessment.id,
  }));
  const totalMinutes = sessions.reduce((total, session) => total + session.plannedMinutes, 0);
  if (totalMinutes < 60 || totalMinutes > 120) return invalid();
  const base: Omit<ShortCourseDeliveryProfile, 'profileSha256'> = {
    version: 1, profileId: SHORT_COURSE_PROFILE_ID, contentSha256: current.sha256,
    sourceManifest: input.sourceManifest,
    sourceManifestSha256: digest(SHORT_COURSE_HASH_DOMAINS.source, sourcePayload(input.sourceManifest)),
    sessionMappingSha256: digest(SHORT_COURSE_HASH_DOMAINS.mapping, mappingPayload(sessions)),
    totalMinutes, sessions,
  };
  return { ...base, profileSha256: digest(SHORT_COURSE_HASH_DOMAINS.profile, profilePayload(base)) };
}

function storedProfile(course: CourseWithCurriculum): ShortCourseDeliveryProfile | null {
  try {
    if (!course.meta || typeof course.meta !== 'object' || Array.isArray(course.meta) ||
        !Object.hasOwn(course.meta, 'shortCourseDelivery')) return null;
    const stored = object(course.meta.shortCourseDelivery, ['version', 'profileId', 'contentSha256', 'sourceManifest',
      'sourceManifestSha256', 'sessionMappingSha256', 'profileSha256', 'totalMinutes', 'sessions']);
    const sessions = list(stored.sessions, 4, 12).map((raw) => object(raw,
      ['sessionId', 'objective', 'plannedMinutes', 'readingLessonId', 'assessmentLessonId']));
    const expected = buildShortCourseDelivery(course, { contentSha256: stored.contentSha256,
      sourceManifest: stored.sourceManifest,
      sessions: sessions.map((session) => ({ objective: session.objective, plannedMinutes: session.plannedMinutes })),
    });
    for (const key of ['version', 'profileId', 'contentSha256', 'sourceManifestSha256', 'sessionMappingSha256',
      'profileSha256', 'totalMinutes'] as const) if (stored[key] !== expected[key]) return null;
    const source = object(stored.sourceManifest, ['version', 'entries']);
    const entries = list(source.entries, 1, 20).map((raw) => object(raw, ['id', 'kind', 'sha256', 'permissionEvidence']));
    for (let i = 0; i < entries.length; i++) {
      for (const key of ['id', 'kind', 'sha256', 'permissionEvidence'] as const) {
        if (entries[i][key] !== expected.sourceManifest.entries[i][key]) return null;
      }
    }
    for (let i = 0; i < sessions.length; i++) {
      for (const key of ['sessionId', 'objective', 'plannedMinutes', 'readingLessonId', 'assessmentLessonId'] as const) {
        if (sessions[i][key] !== expected.sessions[i][key]) return null;
      }
    }
    if (course.durationHours !== expected.totalMinutes / 60) return null;
    return expected;
  } catch { return null; }
}

export function projectShortCourseDelivery(course: CourseWithCurriculum): PublicShortCourseDelivery | null {
  const profile = storedProfile(course);
  return profile ? { profileId: profile.profileId, totalMinutes: profile.totalMinutes, sessions: profile.sessions } : null;
}

export async function configureShortCourseDelivery(courseId: string, raw: unknown,
  client: PrismaClient = prisma): Promise<ShortCourseDeliveryProfile> {
  const input = parseShortCourseDeliveryInput(raw);
  if (!UUID.test(courseId)) throw new ShortCourseProfileError(404);
  return withSerializationRetry(() => client.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM lms_courses WHERE id = ${courseId}::uuid FOR UPDATE`;
    if (locked.length !== 1) throw new ShortCourseProfileError(404);
    const course = await tx.lmsCourse.findUnique({ where: { id: courseId }, include: courseWithCurriculum });
    if (!course) throw new ShortCourseProfileError(404);
    if (!isUnpublishedCourseDraft(course) || !hasUncredentialledStoredCecIdentity(course)) {
      throw new ShortCourseProfileError(409);
    }
    const profile = buildShortCourseDelivery(course, input);
    const meta = course.meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) throw new ShortCourseProfileError(409);
    if (Object.hasOwn(meta, 'shortCourseDelivery')) {
      const existing = storedProfile(course);
      if (!existing || existing.profileSha256 !== profile.profileSha256) throw new ShortCourseProfileError(409);
      return existing;
    }
    await tx.lmsCourse.update({ where: { id: courseId }, data: {
      meta: { ...meta, shortCourseDelivery: profile } as unknown as Prisma.InputJsonObject,
      durationHours: profile.totalMinutes / 60,
    } });
    return profile;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }));
}
