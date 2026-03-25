import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md py-12">
        {/* Logo + Wordmark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="https://carsi.com.au/wp-content/uploads/2021/02/CARSI-LOGO-best-compression-2.png"
              alt="CARSI"
              width={140}
              height={48}
              className="h-10 w-auto"
              unoptimized
              priority
            />
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            &larr; Back to home
          </Link>
        </div>

        {children}
      </div>
    </div>
  );
}
