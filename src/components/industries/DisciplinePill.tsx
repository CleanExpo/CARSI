interface DisciplinePillProps {
  code?: string;
  label: string;
  color: string;
}

/** `code` is routing data only; the pill prints the plain-English subject, never the code. */
export function DisciplinePill({ label, color }: DisciplinePillProps) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-xs font-bold"
      style={{
        color,
        background: `${color}15`,
        borderColor: `${color}40`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
