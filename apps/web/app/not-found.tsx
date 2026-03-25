import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="font-mono text-[120px] leading-none font-bold tracking-tight text-primary">
          404
        </span>

        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>

        <Link
          href="/"
          className="inline-block rounded-md border border-border bg-secondary px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
        >
          Return to home
        </Link>
      </div>
    </main>
  );
}
