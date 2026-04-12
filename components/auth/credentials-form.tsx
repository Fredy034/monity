'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n/client';

type Props = {
  mode: 'sign-in' | 'sign-up';
  endpoint: string;
  submitLabel: string;
  footerHref: string;
  footerLabel: string;
  showName?: boolean;
};

async function startGoogleOAuth(setError: (value: string | null) => void, fallbackError: string) {
  setError(null);

  try {
    const response = await fetch('/api/auth/oauth/google/start', {
      method: 'GET',
      cache: 'no-store',
    });

    const payload = (await response.json()) as {
      url?: string;
      message?: string;
      error?: string;
    };

    if (!response.ok || !payload.url) {
      setError(payload.message ?? payload.error ?? fallbackError);
      return;
    }

    window.location.assign(payload.url);
  } catch {
    setError(fallbackError);
  }
}

export function CredentialsForm({ mode, endpoint, submitLabel, footerHref, footerLabel, showName = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, withLocale } = useI18n();
  const next = searchParams.get('next') ?? withLocale('/dashboard');
  const initialEmail = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(showName ? { name } : {}),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        nextStep?: string;
        requiresVerification?: boolean;
        user?: { email?: string } | null;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.message ?? payload.error ?? t('auth.form.authFailed'));
        return;
      }

      if (mode === 'sign-up' && payload.requiresVerification) {
        router.replace(withLocale(`/verify-email?email=${encodeURIComponent(email)}`));
        return;
      }

      const nextStep = payload.nextStep ?? next;
      router.replace(nextStep.startsWith('/') ? withLocale(nextStep) : nextStep);
      router.refresh();
    } catch {
      setError(t('auth.form.genericError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className='space-y-5' onSubmit={handleSubmit}>
      <div>
        <label className='mb-2 block text-sm font-medium text-slate-700' htmlFor='email'>
          {t('auth.form.email')}
        </label>
        <input
          id='email'
          type='email'
          autoComplete='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className='h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder={t('auth.form.emailPlaceholder')}
        />
      </div>

      {showName ? (
        <div>
          <label className='mb-2 block text-sm font-medium text-slate-700' htmlFor='name'>
            {t('auth.form.name')}
          </label>
          <input
            id='name'
            type='text'
            autoComplete='name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            className='h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
            placeholder={t('auth.form.namePlaceholder')}
          />
        </div>
      ) : null}

      <div>
        <label className='mb-2 block text-sm font-medium text-slate-700' htmlFor='password'>
          {t('auth.form.password')}
        </label>
        <input
          id='password'
          type='password'
          autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className='h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder='••••••••'
        />
      </div>

      {error ? (
        <p className='rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700'>{error}</p>
      ) : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isSubmitting ? t('auth.form.processing') : submitLabel}
      </button>

      <div className='relative py-1 text-center'>
        <span className='absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-slate-200' />
        <span className='relative inline-block bg-white px-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400'>
          {t('auth.form.orContinueWith')}
        </span>
      </div>

      <button
        type='button'
        onClick={() => startGoogleOAuth(setError, t('auth.form.oauthStartFailed'))}
        className='inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
      >
        <svg aria-hidden='true' viewBox='0 0 24 24' className='h-5 w-5'>
          <path
            fill='#EA4335'
            d='M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.8-2.7-5.8-6s2.6-6 5.8-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.8 3.3 14.7 2.4 12 2.4 6.9 2.4 2.8 6.6 2.8 11.7S6.9 21 12 21c6.9 0 9.2-4.9 9.2-7.4 0-.5-.1-.9-.1-1.3H12z'
          />
        </svg>
        {t('auth.form.continueWithGoogle')}
      </button>

      <div className='flex items-center justify-between text-sm text-slate-600'>
        <Link
          className='font-medium text-slate-900 underline decoration-slate-300 underline-offset-4'
          href={footerHref.startsWith('/') ? withLocale(footerHref) : footerHref}
        >
          {footerLabel}
        </Link>
        <Link className='text-slate-500 hover:text-slate-900' href={withLocale('/')}>
          {t('common.backHome')}
        </Link>
      </div>
    </form>
  );
}
