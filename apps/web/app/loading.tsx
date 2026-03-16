export default function Loading() {
  return (
    <div
      className="flex min-h-screen flex-col gap-4 px-6 py-12"
      style={{ backgroundColor: '#050505' }}
    >
      <div className="h-8 w-48 animate-pulse rounded-sm" style={{ backgroundColor: '#1a1a1a' }} />
      <div className="h-4 w-full animate-pulse rounded-sm" style={{ backgroundColor: '#1a1a1a' }} />
      <div className="h-4 w-3/4 animate-pulse rounded-sm" style={{ backgroundColor: '#1a1a1a' }} />
      <div
        className="mt-4 h-32 w-full animate-pulse rounded-sm"
        style={{ backgroundColor: '#1a1a1a' }}
      />
    </div>
  );
}
