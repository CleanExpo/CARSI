import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="rounded-sm border border-border bg-card p-6 sm:p-8">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-foreground">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to create your account
        </p>
        <p className="text-xs font-medium tracking-wide text-primary">
          IICRC CEC-approved restoration training
        </p>
      </div>

      <RegisterForm />

      <div className="mt-5 text-center text-sm">
        <span className="text-muted-foreground">Already have an account? </span>
        <Link
          href="/login"
          className="font-medium text-primary underline decoration-white/20 underline-offset-4 transition-colors duration-150 hover:text-white hover:decoration-white/50"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
