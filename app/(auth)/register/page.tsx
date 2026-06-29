import { RegisterForm } from '@/components/auth/register-form';
import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div
      className="rounded-xl bg-white p-6 shadow-xl shadow-slate-200/70 ring-1 ring-slate-200 sm:p-8"
      style={{
        border: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <div className="mb-6 space-y-1.5">
        <h1 className="text-2xl font-bold text-slate-950">
          Create an account
        </h1>
        <p className="text-sm text-slate-600">
          Enter your details to create your account
        </p>
        <p className="text-xs font-semibold tracking-wide text-[#146fc2]">
          IICRC-aligned CEC restoration training
        </p>
      </div>

      <RegisterForm />

      <div className="mt-5 text-center text-sm">
        <span className="text-slate-600">Already have an account? </span>
        <Link
          href="/login"
          className="font-semibold text-[#146fc2] underline decoration-[#146fc2]/25 underline-offset-4 transition-colors duration-150 hover:text-[#0f5fa8]"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
