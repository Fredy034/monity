'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

type Props = {
  endpoint: string;
};

export function VerificationForm({ endpoint }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const payload = (await response.json()) as {
        message?: string;
        nextStep?: string;
        user?: { email?: string } | null;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.message ?? payload.error ?? 'Verification failed.');
        return;
      }

      setSuccess('Email verified. Redirecting to your dashboard...');
      router.replace(payload.nextStep ?? '/dashboard');
      router.refresh();
    } catch {
      setError('Could not verify your email right now.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className='space-y-5' onSubmit={handleSubmit}>
      <div>
        <label className='mb-2 block text-sm font-medium text-slate-700' htmlFor='verify-email'>
          Email
        </label>
        <input
          id='verify-email'
          type='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className='h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder='you@monity.app'
        />
      </div>

      <div>
        <label className='mb-2 block text-sm font-medium text-slate-700' htmlFor='otp'>
          Verification code
        </label>
        <input
          id='otp'
          type='text'
          inputMode='numeric'
          autoComplete='one-time-code'
          required
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          className='h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder='123456'
        />
      </div>

      {error ? (
        <p className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{error}</p>
      ) : null}

      {success ? (
        <p className='rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
          {success}
        </p>
      ) : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isSubmitting ? 'Verifying...' : 'Verify email'}
      </button>
    </form>
  );
}
