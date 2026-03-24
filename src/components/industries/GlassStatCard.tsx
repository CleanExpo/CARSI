interface GlassStatCardProps {
  value: string;
  label: string;
}

export function GlassStatCard({ value, label }: GlassStatCardProps) {
  return (
    <div
      className="rounded-xl px-5 py-4 text-center"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="text-2xl font-bold" style={{ color: '#2490ed' }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}
      </p>
    </div>
  );
}
