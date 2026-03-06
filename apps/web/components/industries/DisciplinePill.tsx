interface DisciplinePillProps {
  code: string;
  label: string;
  color: string;
}

export function DisciplinePill({ code, label, color }: DisciplinePillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-mono text-xs font-bold"
      style={{
        color,
        background: `${color}15`,
        border: `1px solid ${color}40`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {code} — {label}
    </span>
  );
}
