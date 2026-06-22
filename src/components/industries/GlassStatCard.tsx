interface GlassStatCardProps {
  value: string;
  label: string;
  accentColor?: string;
}

export function GlassStatCard({ value, label, accentColor = '#2490ed' }: GlassStatCardProps) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-4 py-5 text-center shadow-[0_16px_48px_-28px_rgba(0,0,0,0.8)]">
      <p className="text-2xl font-bold tracking-tight" style={{ color: accentColor }}>
        {value}
      </p>
      <p className="mt-1 text-xs font-medium tracking-wide text-white/55 uppercase">{label}</p>
    </div>
  );
}
