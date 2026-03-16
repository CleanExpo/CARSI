import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#050505' }}
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <span
          className="font-mono text-[120px] leading-none font-bold tracking-tight"
          style={{ color: '#00F5FF', fontFamily: 'JetBrains Mono, monospace' }}
        >
          404
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-white">Page not found</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block rounded-sm border px-6 py-3 text-sm font-medium text-white transition-colors"
          style={{
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          Return to home
        </Link>
      </div>
    </main>
  );
}
