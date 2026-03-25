'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';

const DISCIPLINES = ['WRT', 'ASD', 'AMRT', 'CCT', 'FSRT', 'CRT', 'OCT'] as const;

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

interface Lesson {
  title: string;
  content: string;
  key_takeaways: string[];
  quiz_questions: QuizQuestion[];
}

interface Module {
  name: string;
  description: string;
  lessons: Lesson[];
}

interface AIBuilderResult {
  modules: Module[];
}

export default function AIBuilderPage() {
  const [standardOutline, setStandardOutline] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [title, setTitle] = useState('');
  const [moduleCount, setModuleCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIBuilderResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  function toggleModule(index: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !discipline || !standardOutline.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiClient.post<AIBuilderResult>('/api/lms/admin/ai-course-builder', {
        title,
        iicrc_discipline: discipline,
        standard_outline: standardOutline,
        module_count: moduleCount,
      });
      setResult(data);
      // Expand all modules by default
      setExpandedModules(new Set(data.modules.map((_, i) => i)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate course content.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex max-w-5xl flex-col gap-8 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">AI Course Builder</h1>
        <p className="text-sm text-white/40">
          Generate structured lesson content from IICRC standards using AI.
        </p>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleGenerate}
        className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6"
      >
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
          Course Parameters
        </h2>

        <input
          type="text"
          placeholder="Course title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
        />

        <select
          value={discipline}
          onChange={(e) => setDiscipline(e.target.value)}
          required
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500/50 focus:outline-none"
        >
          <option value="">Select IICRC Discipline</option>
          {DISCIPLINES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <div className="flex flex-col gap-1">
          <label htmlFor="module-count" className="font-mono text-xs text-white/40">
            Number of modules ({moduleCount})
          </label>
          <input
            id="module-count"
            type="number"
            min={2}
            max={5}
            value={moduleCount}
            onChange={(e) => setModuleCount(Number(e.target.value))}
            className="w-24 rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500/50 focus:outline-none"
          />
        </div>

        <textarea
          placeholder="Paste the IICRC standard outline here (e.g. S500, S520 key topics)..."
          value={standardOutline}
          onChange={(e) => setStandardOutline(e.target.value)}
          required
          rows={8}
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading}
          className="self-start rounded-sm bg-cyan-600 px-5 py-2 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Generate Course Content'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-3 rounded-sm border border-cyan-500/20 bg-cyan-950/20 p-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="font-mono text-sm text-cyan-400">
            AI is generating course content. This may take a moment...
          </p>
        </div>
      )}

      {/* Result preview */}
      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs tracking-widest text-emerald-400 uppercase">
              Generated Content — {result.modules.length} Modules
            </h2>
          </div>

          {result.modules.map((mod, mi) => (
            <div key={mi} className="rounded-sm border border-white/[0.06] bg-zinc-900/50">
              {/* Module header */}
              <button
                type="button"
                onClick={() => toggleModule(mi)}
                className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-sm font-semibold text-white">
                    Module {mi + 1}: {mod.name}
                  </span>
                  <span className="text-xs text-white/40">{mod.description}</span>
                </div>
                <span className="font-mono text-xs text-white/30">
                  {expandedModules.has(mi) ? '[-]' : '[+]'} {mod.lessons.length} lessons
                </span>
              </button>

              {/* Expanded lessons */}
              {expandedModules.has(mi) && (
                <div className="flex flex-col gap-3 border-t border-white/[0.06] p-4">
                  {mod.lessons.map((lesson, li) => (
                    <div
                      key={li}
                      className="flex flex-col gap-3 rounded-sm border border-white/[0.04] bg-zinc-800/50 p-4"
                    >
                      <h4 className="font-mono text-sm font-semibold text-cyan-400">
                        Lesson {li + 1}: {lesson.title}
                      </h4>

                      <p className="text-sm leading-relaxed text-white/60">{lesson.content}</p>

                      {lesson.key_takeaways.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs text-white/30 uppercase">
                            Key Takeaways
                          </span>
                          <ul className="flex flex-col gap-1 pl-4">
                            {lesson.key_takeaways.map((t, ti) => (
                              <li key={ti} className="list-disc text-xs text-white/50">
                                {t}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {lesson.quiz_questions.length > 0 && (
                        <div className="flex flex-col gap-2">
                          <span className="font-mono text-xs text-white/30 uppercase">
                            Quiz Questions
                          </span>
                          {lesson.quiz_questions.map((q, qi) => (
                            <div
                              key={qi}
                              className="flex flex-col gap-1 rounded-sm border border-white/[0.04] bg-zinc-900/50 p-3"
                            >
                              <p className="text-xs font-medium text-white/70">{q.question}</p>
                              <div className="flex flex-col gap-0.5 pl-3">
                                {q.options.map((opt, oi) => (
                                  <span
                                    key={oi}
                                    className={`text-xs ${oi === q.correct_index ? 'text-emerald-400' : 'text-white/40'}`}
                                  >
                                    {String.fromCharCode(65 + oi)}. {opt}
                                    {oi === q.correct_index && ' *'}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
