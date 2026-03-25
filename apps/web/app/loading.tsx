export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-background px-6 py-12">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded-lg bg-muted" />
      <div className="mt-4 h-32 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
