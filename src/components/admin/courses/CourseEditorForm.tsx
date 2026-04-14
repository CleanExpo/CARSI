'use client';

import { ChevronDown, ChevronUp, DollarSign, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { CourseTextThumbnail } from '@/components/lms/CourseTextThumbnail';

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
  const [modules, setModules] = useState<Mod[]>([emptyModule()]);
  const [uploading, setUploading] = useState(false);

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
      setModules(
        c.modules.length > 0
          ? c.modules.map((m) => ({
              key: m.id,
              id: m.id,
              title: m.title,
              textContent: m.textContent,
              videoUrl: m.videoUrl,
            }))
          : [emptyModule()]
      );
    } catch {
      toast({ title: 'Could not load course', variant: 'destructive' });
      router.push('/admin/courses');
    } finally {
      setLoading(false);
    }
  }, [courseId, router, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function moveModule(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= modules.length) return;
    setModules((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
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
      const payload = {
        title: title.trim(),
        description: description.trim(),
        thumbnailUrl: thumbnailUrl.trim(),
        introVideoUrl: introVideoUrl.trim() || undefined,
        introThumbnailUrl: introThumbnailUrl.trim() || undefined,
        isFree,
        priceAud: resolvedPrice,
        published,
        modules: modules.map((m) => ({
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
        toast({ title: 'Each module needs a title', variant: 'destructive' });
        setSaving(false);
        return;
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
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {courseId ? 'Edit course' : 'Create course'}
            </h1>
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
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className={cn('h-11', fieldClass)}
                  placeholder="e.g. Water Damage Restoration Essentials"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-desc" className="text-white/65">
                  Description
                </Label>
                <Textarea
                  id="course-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className={cn('min-h-[120px] resize-y', fieldClass)}
                  placeholder="Summary shown on catalogue cards and SEO snippets"
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

              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
                <div className="flex items-center gap-2">
                  <Switch id="pub" checked={published} onCheckedChange={setPublished} />
                  <Label htmlFor="pub" className="cursor-pointer text-sm text-white/75">
                    Published (visible in catalogue when live)
                  </Label>
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
                    priceLabel={isFree ? 'Free' : `AUD ${Number.parseFloat(priceAud || '0').toFixed(0)}`}
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
                    priceLabel={isFree ? 'Free' : `AUD ${Number.parseFloat(priceAud || '0').toFixed(0)}`}
                    isFree={isFree}
                    moduleCount={modules.length}
                    draft={!published}
                    shortDescription={
                      introThumbnailUrl.trim() || thumbnailUrl.trim()
                        ? null
                        : 'Intro video cover — upload an image or use the catalogue thumbnail.'
                    }
                    backdropImageSrc={
                      (introThumbnailUrl.trim() || thumbnailUrl.trim()) || undefined
                    }
                    backdropImageLoading="eager"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        <section className={cn(panelClass, 'space-y-5 p-5 sm:p-6')}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle>Modules</SectionTitle>
            <button
              type="button"
              onClick={() => setModules((m) => [...m, emptyModule()])}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2490ed] px-4 py-2 text-xs font-semibold text-white shadow-[0_6px_20px_-6px_rgba(36,144,237,0.55)] transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Add module
            </button>
          </div>

          <div className="space-y-5">
            {modules.map((mod, idx) => (
              <div key={mod.key} className={cn(panelClass, 'space-y-4 border-white/8 p-4 sm:p-5')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold tracking-wide text-white/50 uppercase">
                    Module {idx + 1}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                      onClick={() => moveModule(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move up"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-white/45 transition-colors hover:bg-white/10 hover:text-white"
                      onClick={() => moveModule(idx, 1)}
                      disabled={idx === modules.length - 1}
                      aria-label="Move down"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-400/85 transition-colors hover:bg-red-500/15"
                      onClick={() => setModules((m) => m.filter((_, i) => i !== idx))}
                      disabled={modules.length <= 1}
                      aria-label="Remove module"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/65">Module title</Label>
                  <Input
                    value={mod.title}
                    onChange={(e) =>
                      setModules((m) =>
                        m.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                      )
                    }
                    required
                    className={cn('h-11', fieldClass)}
                    placeholder="Required"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/65">Reading / text (optional)</Label>
                  <Textarea
                    value={mod.textContent}
                    onChange={(e) =>
                      setModules((m) =>
                        m.map((x, i) => (i === idx ? { ...x, textContent: e.target.value } : x))
                      )
                    }
                    rows={5}
                    className={cn('font-mono text-sm', fieldClass)}
                    placeholder="Plain text or HTML"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/65">Video URL (optional)</Label>
                  <Input
                    value={mod.videoUrl}
                    onChange={(e) =>
                      setModules((m) =>
                        m.map((x, i) => (i === idx ? { ...x, videoUrl: e.target.value } : x))
                      )
                    }
                    className={cn('h-11', fieldClass)}
                    placeholder="YouTube, Vimeo, or direct .mp4"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-8">
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
            className="inline-flex items-center justify-center rounded-xl border border-white/15 px-6 py-3 text-sm font-medium text-white/75 hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
