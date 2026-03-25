'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

interface CourseIdea {
  id: string;
  title: string;
  description: string | null;
  iicrc_discipline: string | null;
  vote_count: number;
  status: string;
  ai_outline: Record<string, unknown> | null;
}

const DISCIPLINES = ['WRT', 'CRT', 'OCT', 'ASD', 'CCT'];

export default function InstructorIdeasPage() {
  const [ideas, setIdeas] = useState<CourseIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [outline, setOutline] = useState<{ id: string; data: Record<string, unknown> } | null>(
    null
  );
  const [form, setForm] = useState({ title: '', description: '', iicrc_discipline: '' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<CourseIdea[]>('/api/lms/ideas')
      .then(setIdeas)
      .catch(() => setError('Could not load ideas.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const newIdea = await apiClient.post<CourseIdea>('/api/lms/ideas', {
        title: form.title,
        description: form.description || null,
        iicrc_discipline: form.iicrc_discipline || null,
      });
      setIdeas((prev) => [newIdea, ...prev]);
      setForm({ title: '', description: '', iicrc_discipline: '' });
    } catch {
      setError('Could not submit idea.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateOutline(ideaId: string) {
    setGeneratingId(ideaId);
    setOutline(null);
    setError(null);
    try {
      const data = await apiClient.post<Record<string, unknown>>(
        `/api/lms/ideas/${ideaId}/generate-outline`
      );
      setOutline({ id: ideaId, data });
      // Update cached outline on idea
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? { ...i, ai_outline: data } : i)));
    } catch {
      setError('Could not generate outline. Check AI provider is running.');
    } finally {
      setGeneratingId(null);
    }
  }

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">Course Ideas</h1>
        <p className="text-sm text-white/40">Submit ideas and generate AI course outlines.</p>
      </div>

      {/* Submit form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6"
      >
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">New Idea</h2>

        <input
          type="text"
          placeholder="Course title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
        />

        <textarea
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
        />

        <select
          value={form.iicrc_discipline}
          onChange={(e) => setForm((f) => ({ ...f, iicrc_discipline: e.target.value }))}
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="">IICRC Discipline (optional)</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-sm bg-cyan-600 px-4 py-2 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Submit Idea'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {/* Ideas list */}
      {loading && <p className="text-sm text-white/40">Loading…</p>}

      <div className="flex flex-col gap-4">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{idea.title}</span>
                  {idea.iicrc_discipline && (
                    <span className="rounded-sm bg-cyan-950 px-2 py-0.5 font-mono text-xs text-cyan-400">
                      {idea.iicrc_discipline}
                    </span>
                  )}
                  <span className="font-mono text-xs text-white/30">{idea.vote_count} votes</span>
                </div>
                {idea.description && <p className="text-xs text-white/40">{idea.description}</p>}
              </div>

              <button
                onClick={() => handleGenerateOutline(idea.id)}
                disabled={generatingId === idea.id}
                className="shrink-0 rounded-sm border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-white/60 transition-colors hover:border-cyan-500/40 hover:text-cyan-400 disabled:opacity-40"
              >
                {generatingId === idea.id
                  ? 'Generating…'
                  : idea.ai_outline
                    ? '↻ Regenerate outline'
                    : '✦ Generate outline'}
              </button>
            </div>

            {/* Show AI outline inline when generated */}
            {outline?.id === idea.id && (
              <div className="flex flex-col gap-3 rounded-sm border border-emerald-500/20 bg-emerald-950/20 p-4">
                <p className="font-mono text-xs tracking-widest text-emerald-400 uppercase">
                  AI Course Outline
                </p>
                <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-white/60">
                  {JSON.stringify(outline.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
