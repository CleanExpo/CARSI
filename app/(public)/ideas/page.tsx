'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import { CommunityHubShell } from '@/components/marketing/hub/CommunityHubShell';
import { apiClient } from '@/lib/api/client';

interface CourseIdea {
  id: string;
  title: string;
  description: string | null;
  iicrc_discipline: string | null;
  vote_count: number;
  status: string;
  ai_outline: object | null;
  created_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  in_development: 'In Development',
  published: 'Published',
};

export default function CourseIdeasPage() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<CourseIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<CourseIdea[]>('/api/lms/ideas')
      .then(setIdeas)
      .catch(() => setError('Could not load ideas.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleVote(ideaId: string) {
    if (!user) return;

    setVotingId(ideaId);
    try {
      const data = await apiClient.post<{ vote_count: number }>(`/api/lms/ideas/${ideaId}/vote`);
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? { ...idea, vote_count: data.vote_count } : idea))
      );
    } catch {
      // silently ignore vote errors
    } finally {
      setVotingId(null);
    }
  }

  return (
    <CommunityHubShell
      eyebrow="Community & resources"
      title="Community Ideas"
      description="Vote for courses you would like CARSI to build. Instructors use your votes to prioritise development."
      stats={[
        { value: loading ? '…' : String(ideas.length), label: 'Ideas' },
        { value: user ? 'Ready' : 'Sign in', label: 'To vote' },
        { value: 'CEC', label: 'When approved' },
        { value: 'AU', label: 'For the field' },
      ]}
    >
      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && !error && ideas.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white px-6 py-16 text-center">
          <p className="text-sm text-slate-500">
            No course ideas yet. Be the first to suggest one.
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"
          >
            <button
              onClick={() => handleVote(idea.id)}
              disabled={votingId === idea.id}
              className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-xl border border-slate-200 bg-[#fafbfc] px-3 py-2 text-slate-700 transition hover:border-[#2490ed]/40 hover:text-[#146fc2] disabled:opacity-50"
            >
              <span className="text-xs">▲</span>
              <span className="font-mono text-sm font-bold">{idea.vote_count}</span>
            </button>

            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-slate-950">
                  {idea.title}
                </h2>
                {idea.iicrc_discipline ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {idea.iicrc_discipline}
                  </span>
                ) : null}
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] text-slate-500">
                  {STATUS_LABELS[idea.status] ?? idea.status}
                </span>
                {idea.ai_outline ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] text-emerald-700">
                    Outline ready
                  </span>
                ) : null}
              </div>
              {idea.description ? (
                <p className="text-sm leading-relaxed text-slate-500">{idea.description}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </CommunityHubShell>
  );
}
