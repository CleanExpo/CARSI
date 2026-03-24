'use client';

interface XPLevelBadgeProps {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  xpToNextLevel: number | null;
}

const LEVEL_COLOURS: Record<number, string> = {
  1: 'bg-zinc-800 text-zinc-300',
  2: 'bg-emerald-950 text-emerald-400',
  3: 'bg-cyan-950 text-cyan-400',
  4: 'bg-blue-950 text-blue-400',
  5: 'bg-purple-950 text-purple-400',
  6: 'bg-amber-950 text-amber-400',
};

export function XPLevelBadge({
  totalXp,
  currentLevel,
  levelTitle,
  xpToNextLevel,
}: XPLevelBadgeProps) {
  const colourClass = LEVEL_COLOURS[currentLevel] ?? LEVEL_COLOURS[1];

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-mono text-sm font-semibold ${colourClass}`}
      >
        <span className="text-xs opacity-60">LVL {currentLevel}</span>
        <span>{levelTitle}</span>
        <span className="text-xs opacity-60">{totalXp.toLocaleString()} XP</span>
      </div>
      {xpToNextLevel !== null && (
        <p className="font-mono text-xs text-white/40">
          {xpToNextLevel.toLocaleString()} XP to next level
        </p>
      )}
    </div>
  );
}
