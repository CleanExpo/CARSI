'use client';

import { DollarSign, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { MarkdownEditor } from '@/components/admin/MarkdownEditor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';
import { IICRC_DISCIPLINE_SHORT } from '@/lib/iicrc-discipline-display';
import {
  composeCourseArticle,
  mergeModulesFromArticle,
  parseCourseArticle,
} from '@/lib/lms/course-article-markdown';

type Mod = {
  key: string;
  id?: string;
  title: string;
  textContent: string;
  videoUrl: string;
};

type CourseDto = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  introVideoUrl?: string;
  introThumbnailUrl?: string;
  isFree: boolean;
  priceAud: number;
  published: boolean;
  workflow_status?: 'draft' | 'in_review' | 'published';
  cecHours?: string | null;
  durationHours?: string | null;
  iicrcDiscipline?: string | null;
  level?: string | null;
  category?: string | null;
  resolvedCecHours?: string | null;
  cecMissing?: boolean;
  cecExcluded?: boolean;
  resolvedDurationHours?: string | null;
  modules: {
    id: string;
    title: string;
    textContent: string;
    videoUrl: string;
    orderIndex: number;
  }[];
};

const panelClass = cn(
  'rounded-2xl border border-white/10 bg-white/[0.035]',
  'shadow-[0_1px_0_rgba(255,255,255,0.05)_inset]',
  'transition-[border-color,box-shadow] duration-300 hover:border-white/[0.12]'
);

const fieldClass =
  'border-white/12 bg-black/35 text-white placeholder:text-white/35 focus-visible:ring-[#2490ed]/40';

function newModuleKey(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyModule(): Mod {
  return { key: newModuleKey(), title: '', textContent: '', videoUrl: '' };
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">
      {children}
    </h2>
  );
}

export function CourseEditorForm({ courseId }: { courseId?: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const introThumbFileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [introThumbnailUrl, setIntroThumbnailUrl] = useState('');
  const [slugReadOnly, setSlugReadOnly] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [priceAud, setPriceAud] = useState('0');
  const [published, setPublished] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'in_review' | 'published'>(
    'draft'
  );
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [cecHours, setCecHours] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [iicrcDiscipline, setIicrcDiscipline] = useState('');
  const [level, setLevel] = useState('');
  const [category, setCategory] = useState('');
  const [cecMissing, setCecMissing] = useState(false);
  const [cecExcluded, setCecExcluded] = useState(false);
  const [resolvedCecHours, setResolvedCecHours] = useState<string | null>(null);
  const [resolvedDurationHours, setResolvedDurationHours] = useState<string | null>(null);
  const [modules, setModules] = useState<Mod[]>([emptyModule()]);
  const [article, setArticle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [savedFingerprint, setSavedFingerprint] = useState('');

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load course');
      const data = (await res.json()) as { course: CourseDto };
      const c = data.course;
      setSlugReadOnly(c.slug);
      setTitle(c.title);
      setDescription(c.description);
      setThumbnailUrl(c.thumbnailUrl);
      setIntroVideoUrl(c.introVideoUrl ?? '');
      setIntroThumbnailUrl(c.introThumbnailUrl ?? '');
      setIsFree(c.isFree);
      setPriceAud(String(Number(c.priceAud)));
      setPublished(c.published);
      setWorkflowStatus(c.workflow_status ?? (c.published ? 'published' : 'draft'));
      setCecHours(c.cecHours ?? '');
      setDurationHours(c.durationHours ?? '');
      setIicrcDiscipline(c.iicrcDiscipline ?? '');
      setLevel(c.level ?? '');
      setCategory(c.category ?? '');
      setCecMissing(Boolean(c.cecMissing));
      setCecExcluded(Boolean(c.cecExcluded));
      setResolvedCecHours(c.resolvedCecHours ?? null);
      setResolvedDurationHours(c.resolvedDurationHours ?? null);
      const loadedMods =
        c.modules.length > 0
          ? c.modules.map((m) => ({
              key: m.id,
              id: m.id,
              title: m.title,
              textContent: m.textContent,
              videoUrl: m.videoUrl,
            }))
          : [emptyModule()];
      setModules(loadedMods);
      const loadedArticle = composeCourseArticle({
        title: c.title,
        description: c.description,
        modules: loadedMods,
      });
      setArticle(loadedArticle);
      setSavedFingerprint(loadedArticle);
    } catch {
      toast({ title: 'Could not load course', variant: 'destructive' });
      router.push('/admin/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId, router, toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pre-existing RA-4192 rule promotion; behaviour-preserving suppression, real fix tracked separately
    void load();
  }, [load]);

  useEffect(() => {
    if (courseId) return;
    setArticle(
      composeCourseArticle({
        title,
        description,
        modules,
      })
    );
    // Seed the blank article once for a new course.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const isDirty = courseId
    ? Boolean(savedFingerprint) && article !== savedFingerprint
    : Boolean(article.trim() || modules.some((m) => m.videoUrl));

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty || saving) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, saving]);

  async function runWorkflow(action: 'save_draft' | 'submit_review' | 'publish') {
    if (!courseId) return;
    setWorkflowBusy(true);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/workflow`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error('Workflow failed');
      const data = (await res.json()) as { course: CourseDto };
      setWorkflowStatus(data.course.workflow_status ?? 'draft');
      setPublished(data.course.published);
      toast({
        title:
          action === 'publish'
            ? 'Course published'
            : action === 'submit_review'
              ? 'Submitted for review'
              : 'Saved as draft',
      });
    } catch {
      toast({ title: 'Workflow update failed', variant: 'destructive' });
    } finally {
      setWorkflowBusy(false);
    }
  }

  function writeArticleFromModules(nextMods: Mod[], nextTitle = title, nextLead = description) {
    setArticle(
      composeCourseArticle({
        title: nextTitle,
        description: nextLead,
        modules: nextMods,
      })
    );
  }

  function applyArticle(next: string) {
    setArticle(next);
    const parsed = parseCourseArticle(next);
    if (parsed.title) setTitle(parsed.title);
    setDescription(parsed.description);
    setModules((prev) => mergeModulesFromArticle(prev, parsed.sections, newModuleKey));
  }

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');
      }
      if (typeof data.url === 'string') {
        setThumbnailUrl(data.url);
        toast({ title: 'Thumbnail uploaded' });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Upload failed',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  async function onUploadIntroThumbnailFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Upload failed');
      }
      if (typeof data.url === 'string') {
        setIntroThumbnailUrl(data.url);
        toast({ title: 'Intro thumbnail uploaded' });
      }
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Upload failed',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const price = Number.parseFloat(priceAud);
      const resolvedPrice = isFree ? 0 : Number.isFinite(price) ? price : 0;
      const parsedCec = cecHours.trim() ? Number.parseFloat(cecHours) : null;
      const parsedDuration = durationHours.trim() ? Number.parseFloat(durationHours) : null;
      const parsedArticle = parseCourseArticle(article);
      const mergedModules = mergeModulesFromArticle(modules, parsedArticle.sections, newModuleKey);
      const payload = {
        title: (parsedArticle.title || title).trim(),
        description: parsedArticle.description.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        introVideoUrl: introVideoUrl.trim() || undefined,
        introThumbnailUrl: introThumbnailUrl.trim() || undefined,
        isFree,
        priceAud: resolvedPrice,
        published,
        cecHours:
          parsedCec != null && Number.isFinite(parsedCec) && parsedCec >= 0 ? parsedCec : null,
        durationHours:
          parsedDuration != null && Number.isFinite(parsedDuration) && parsedDuration >= 0
            ? parsedDuration
            : null,
        iicrcDiscipline: iicrcDiscipline.trim() || null,
        level: level.trim() || null,
        category: category.trim() || null,
        modules: mergedModules.map((m) => ({
          id: m.id,
          title: m.title.trim(),
          textContent: m.textContent.trim() || undefined,
          videoUrl: m.videoUrl.trim() || undefined,
        })),
      };

      if (!payload.title) {
        toast({ title: 'Title is required', variant: 'destructive' });
        setSaving(false);
        return;
      }
      if (!payload.modules.some((m) => m.title)) {
        payload.modules = [
          {
            id: modules[0]?.id,
            title: payload.title,
            textContent: article.trim() || payload.description || undefined,
            videoUrl: modules[0]?.videoUrl.trim() || undefined,
          },
        ];
      }
      if (!isFree && resolvedPrice <= 0) {
        toast({
          title: 'Set a price greater than zero, or mark the course as free',
          variant: 'destructive',
        });
        setSaving(false);
        return;
      }

      const url = courseId ? `/api/admin/courses/${courseId}` : '/api/admin/courses';
      const method = courseId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : 'Save failed');
      }
      toast({ title: courseId ? 'Course updated' : 'Course created' });
      router.push('/admin/courses');
      router.refresh();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Save failed',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center gap-3 text-white/50">
        <Loader2 className="h-7 w-7 animate-spin text-[#2490ed]" />
        <span className="text-sm font-medium">Loading course…</span>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <form onSubmit={onSubmit} className="w-full max-w-none space-y-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-2">
            <Link
              href="/admin/courses"
              className="inline-flex text-xs font-medium text-white/45 transition-colors hover:text-[#7ec5ff]"
            >
              ← Back to courses
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {courseId ? 'Edit course' : 'Create course'}
              </h1>
              {courseId ? (
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                    workflowStatus === 'published'
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
                      : workflowStatus === 'in_review'
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                        : 'border-white/10 bg-white/5 text-white/55'
                  )}
                >
                  {workflowStatus === 'in_review' ? 'In review' : workflowStatus}
                </span>
              ) : null}
              {isDirty ? (
                <span className="rounded-full border border-[#ed9d24]/35 bg-[#ed9d24]/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#ed9d24] uppercase">
                  Unsaved
                </span>
              ) : null}
              {cecMissing && !cecExcluded ? (
                <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-100 uppercase">
                  CEC missing
                </span>
              ) : null}
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-white/50">
              Full-width editor — set catalogue copy, pricing in AUD, thumbnail, and ordered
              modules. Paid courses require a price; free courses ignore the price field on save.
            </p>
            {slugReadOnly ? (
              <p className="font-mono text-xs text-white/40">
                Slug: <span className="text-white/60">{slugReadOnly}</span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-xl bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(237,157,36,0.55)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_12px_32px_-8px_rgba(237,157,36,0.65)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save course'}
            </button>
            <Link
              href="/admin/courses"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/75 transition-colors hover:border-white/25 hover:bg-white/5"
            >
              Cancel
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-10">
          <div className="space-y-8 xl:col-span-7">
            <section className={cn(panelClass, 'space-y-5 p-5 sm:p-6')}>
              <SectionTitle>Course details</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="course-title" className="text-white/65">
                  Title
                </Label>
                <Input
                  id="course-title"
                  value={title}
                  onChange={(e) => {
                    const nextTitle = e.target.value;
                    setTitle(nextTitle);
                    writeArticleFromModules(modules, nextTitle, description);
                  }}
                  required
                  className={cn('h-11', fieldClass)}
                  placeholder="e.g. Water Damage Restoration Essentials"
                />
              </div>
            </section>

            <section className={cn(panelClass, 'space-y-5 p-5 sm:p-6')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <SectionTitle>Pricing</SectionTitle>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-white/45">
                    Price is always stored in Australian dollars. When &quot;Free course&quot; is
                    on, the saved price is set to zero; you can still enter a draft price before
                    switching to paid.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5">
                  <Switch id="free" checked={isFree} onCheckedChange={setIsFree} />
                  <Label htmlFor="free" className="cursor-pointer text-sm text-white/75">
                    Free course
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price-aud" className="flex items-center gap-2 text-white/65">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400/90" aria-hidden />
                  Price (AUD)
                </Label>
                <div className="relative max-w-md">
                  <span
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold text-white/35"
                    aria-hidden
                  >
                    $
                  </span>
                  <Input
                    id="price-aud"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={priceAud}
                    onChange={(e) => setPriceAud(e.target.value)}
                    disabled={isFree}
                    className={cn(
                      'h-12 pl-8 text-base tabular-nums',
                      fieldClass,
                      isFree && 'cursor-not-allowed opacity-50'
                    )}
                    aria-describedby="price-hint"
                  />
                </div>
                <p id="price-hint" className="text-xs text-white/40">
                  {isFree
                    ? 'Disabled while the course is free. Turn off “Free course” to set a list price.'
                    : 'Shown to learners at checkout. Use two decimals for cents (e.g. 295.00).'}
                </p>
              </div>

              <div className="space-y-4 border-t border-white/10 pt-5">
                {courseId ? (
                  <>
                    <p className="text-xs text-white/45">
                      Content workflow — status:{' '}
                      <span className="font-semibold text-white/80">{workflowStatus}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => void runWorkflow('save_draft')}
                        className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/75 hover:bg-white/5 disabled:opacity-50"
                      >
                        Save draft
                      </button>
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => void runWorkflow('submit_review')}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-500/15 disabled:opacity-50"
                      >
                        Submit for review
                      </button>
                      <button
                        type="button"
                        disabled={workflowBusy}
                        onClick={() => void runWorkflow('publish')}
                        className="rounded-lg bg-[#2490ed] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1f82d4] disabled:opacity-50"
                      >
                        Publish
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Switch id="pub" checked={published} onCheckedChange={setPublished} />
                    <Label htmlFor="pub" className="cursor-pointer text-sm text-white/75">
                      Published on create
                    </Label>
                  </div>
                )}
              </div>
            </section>

            <section className={cn(panelClass, 'space-y-5 p-5 sm:p-6')}>
              <SectionTitle>IICRC &amp; programme record</SectionTitle>
              <p className="text-xs leading-relaxed text-white/45">
                Public CEC hours on listings, certificates and credentials come from the IICRC
                approvals registry, not this field. This records the stored catalogue value for
                reference only — editing it does not change what learners see. To publish or change
                CEC hours, add a founder-confirmed approval to the registry.
              </p>
              {cecMissing && !cecExcluded ? (
                <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                  This course has no registry-approved CEC hours, so it shows no CEC to learners.
                  Add a founder-confirmed approval to the registry to publish CEC hours — editing
                  the field below will not change the published value.
                </p>
              ) : null}
              {cecExcluded ? (
                <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
                  Catalogue product — CEC not applicable.
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cec-hours" className="text-white/65">
                    CEC hours
                  </Label>
                  <Input
                    id="cec-hours"
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={cecHours}
                    onChange={(e) => setCecHours(e.target.value)}
                    className={cn('h-11 tabular-nums', fieldClass)}
                    placeholder="e.g. 2"
                  />
                  {!cecExcluded && resolvedCecHours ? (
                    <p className="text-xs text-white/45">
                      Effective on site: {resolvedCecHours} CEC — resolved from the IICRC approvals
                      registry. This field is the stored catalogue value and does not override it.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration-hours" className="text-white/65">
                    Duration (hours)
                  </Label>
                  <Input
                    id="duration-hours"
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    className={cn('h-11 tabular-nums', fieldClass)}
                    placeholder="e.g. 1.5"
                  />
                  {!durationHours.trim() && resolvedDurationHours ? (
                    <p className="text-xs text-white/45">
                      Effective on site: {resolvedDurationHours} h (resolved from the course
                      catalogue). Set a value here to override.
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iicrc-discipline" className="text-white/65">
                    IICRC discipline
                  </Label>
                  <select
                    id="iicrc-discipline"
                    value={iicrcDiscipline}
                    onChange={(e) => setIicrcDiscipline(e.target.value)}
                    className={cn('h-11 w-full rounded-md border px-3 text-sm', fieldClass)}
                  >
                    <option value="">General / not discipline-specific</option>
                    {Object.entries(IICRC_DISCIPLINE_SHORT).map(([code, label]) => (
                      <option key={code} value={code}>
                        {code} — {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="programme-level" className="text-white/65">
                    Programme level
                  </Label>
                  <Input
                    id="programme-level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className={cn('h-11', fieldClass)}
                    placeholder="e.g. Professional development"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="course-category" className="text-white/65">
                    Category
                  </Label>
                  <Input
                    id="course-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={cn('h-11', fieldClass)}
                    placeholder="e.g. Restoration, Truckmount, Facilities"
                  />
                  <p className="text-xs text-white/40">
                    Used to group courses on the admin catalogue filters.
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8 xl:col-span-5">
            <section className={cn(panelClass, 'space-y-4 p-5 sm:p-6')}>
              <SectionTitle>Thumbnail</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="thumb-url" className="text-white/65">
                  Image URL
                </Label>
                <Input
                  id="thumb-url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  className={cn('h-11 font-mono text-sm', fieldClass)}
                  placeholder="https://… or /uploads/…"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onUploadFile}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/4 px-4 py-2.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload image
                </button>
              </div>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <div className="aspect-video">
                  <CourseTextThumbnail
                    variant="admin"
                    title={title.trim() || 'Untitled course'}
                    priceLabel={
                      isFree ? 'Free' : `AUD ${Number.parseFloat(priceAud || '0').toFixed(0)}`
                    }
                    isFree={isFree}
                    moduleCount={modules.length}
                    draft={!published}
                    shortDescription={
                      description.trim()
                        ? description.trim().replace(/\s+/g, ' ').slice(0, 240)
                        : null
                    }
                    backdropImageSrc={thumbnailUrl.trim() || undefined}
                    backdropImageLoading="eager"
                  />
                </div>
              </div>
            </section>

            <section className={cn(panelClass, 'space-y-4 p-5 sm:p-6')}>
              <SectionTitle>Intro video</SectionTitle>
              <div className="space-y-2">
                <Label htmlFor="intro-video-url" className="text-white/65">
                  Video URL
                </Label>
                <Input
                  id="intro-video-url"
                  value={introVideoUrl}
                  onChange={(e) => setIntroVideoUrl(e.target.value)}
                  className={cn('h-11 font-mono text-sm', fieldClass)}
                  placeholder="YouTube, Vimeo, or direct .mp4"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="intro-thumb-url" className="text-white/65">
                  Intro thumbnail URL
                </Label>
                <Input
                  id="intro-thumb-url"
                  value={introThumbnailUrl}
                  onChange={(e) => setIntroThumbnailUrl(e.target.value)}
                  className={cn('h-11 font-mono text-sm', fieldClass)}
                  placeholder="https://… or /uploads/…"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={introThumbFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={onUploadIntroThumbnailFile}
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => introThumbFileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/4 px-4 py-2.5 text-xs font-semibold text-white/85 transition-colors hover:bg-white/8 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Upload intro image
                </button>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                <div className="aspect-video">
                  <CourseTextThumbnail
                    variant="admin"
                    title={title.trim() || 'Untitled course'}
                    priceLabel={
                      isFree ? 'Free' : `AUD ${Number.parseFloat(priceAud || '0').toFixed(0)}`
                    }
                    isFree={isFree}
                    moduleCount={modules.length}
                    draft={!published}
                    shortDescription={
                      introThumbnailUrl.trim() || thumbnailUrl.trim()
                        ? null
                        : 'Intro video cover — upload an image or use the catalogue thumbnail.'
                    }
                    backdropImageSrc={introThumbnailUrl.trim() || thumbnailUrl.trim() || undefined}
                    backdropImageLoading="eager"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className={cn(panelClass, 'space-y-4 p-5 sm:p-6')}>
          <div>
            <SectionTitle>Course article</SectionTitle>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
              The whole course lives here — every module&apos;s reading is in this article. Type
              normally. Select words and use the toolbar to make a title, a heading, or bold.
            </p>
          </div>
          <MarkdownEditor
            id="course-article"
            label="Course article"
            variant="article"
            value={article}
            onChange={applyArticle}
            minRows={28}
            placeholder="Course title — then the full article, including every module."
          />
        </section>

        <div className="sticky bottom-0 z-20 -mx-4 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#0c101c]/95 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <p className="text-xs text-white/40">
            {isDirty
              ? 'You have unsaved article changes.'
              : 'All article changes saved in this session.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="inline-flex min-w-[148px] items-center justify-center gap-2 rounded-xl bg-[#ed9d24] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(237,157,36,0.55)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save course'}
            </button>
            <Link
              href="/admin/courses"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/75 hover:bg-white/5"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
