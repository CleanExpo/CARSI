interface GlassStatCardProps {
  value: string;
  label: string;
}

export function GlassStatCard({ value, label }: GlassStatCardProps) {
  return (
    <div className="rounded-sm border border-border bg-secondary px-5 py-4 text-center">
      <p className="text-2xl font-bold text-primary">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
