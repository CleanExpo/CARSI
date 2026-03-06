'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

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

const DISCIPLINE_COLOURS: Record<string, string> = {
  WRT: 'bg-cyan-950 text-cyan-400',
  CRT: 'bg-blue-950 text-blue-400',
  OCT: 'bg-purple-950 text-purple-400',
  ASD: 'bg-emerald-950 text-emerald-400',
  CCT: 'bg-amber-950 text-amber-400',
};

const STATUS_LABELS: Record<string, string> = {
  idea: 'Idea',
  in_development: 'In Development',
  published: 'Published',
};

export default function CourseIdeasPage() {
  const [ideas, setIdeas] = useState<CourseIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/lms/ideas`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setIdeas)
      .catch(() => setError('Could not load ideas.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleVote(ideaId: string) {
    const userId = localStorage.getItem('carsi_user_id') ?? '';
    if (!userId) return;

    setVotingId(ideaId);
    try {
      const resp = await fetch(`${API}/api/lms/ideas/${ideaId}/vote`, {
        method: 'POST',
        headers: { 'X-User-Id': userId },
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? { ...idea, vote_count: data.vote_count } : idea))
      );
    } finally {
      setVotingId(null);
    }
  }

  return (
    <main className="flex max-w-3xl flex-col gap-8 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-mono text-3xl font-bold text-white">Course Ideas</h1>
        <p className="text-sm leading-relaxed text-white/50">
          Vote for courses you&apos;d like CARSI to build. Instructors use your votes to prioritise
          development.
        </p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && ideas.length === 0 && (
        <p className="text-sm text-white/40">No course ideas yet. Be the first to suggest one!</p>
      )}

      <div className="flex flex-col gap-4">
        {ideas.map((idea) => (
          <div
            key={idea.id}
            className="flex items-start gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5"
          >
            {/* Vote button */}
            <button
              onClick={() => handleVote(idea.id)}
              disabled={votingId === idea.id}
              className="flex min-w-[52px] flex-col items-center gap-0.5 rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 transition-colors hover:border-cyan-500/40 hover:bg-zinc-700 disabled:opacity-50"
            >
              <span className="text-xs text-white/40">▲</span>
              <span className="font-mono text-sm font-bold text-white">{idea.vote_count}</span>
            </button>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-sm font-semibold text-white">{idea.title}</h2>
                {idea.iicrc_discipline && (
                  <span
                    className={`rounded-sm px-2 py-0.5 font-mono text-xs font-semibold ${
                      DISCIPLINE_COLOURS[idea.iicrc_discipline] ?? 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {idea.iicrc_discipline}
                  </span>
                )}
                <span className="rounded-sm bg-zinc-800 px-2 py-0.5 font-mono text-xs text-white/40">
                  {STATUS_LABELS[idea.status] ?? idea.status}
                </span>
                {idea.ai_outline && (
                  <span className="rounded-sm bg-emerald-950 px-2 py-0.5 font-mono text-xs text-emerald-400">
                    AI outline ready
                  </span>
                )}
              </div>
              {idea.description && (
                <p className="text-sm leading-relaxed text-white/50">{idea.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
