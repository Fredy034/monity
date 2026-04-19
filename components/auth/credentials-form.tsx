'use client';

import googleLogo from '@/public/icons/google.svg';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { useI18n } from '@/lib/i18n/client';
import Image from 'next/image';

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
      return false;
    }

    window.location.assign(payload.url);
    return true;
  } catch {
    setError(fallbackError);
    return false;
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
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

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
        <label className='mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300' htmlFor='email'>
          {t('auth.form.email')}
        </label>
        <input
          id='email'
          type='email'
          autoComplete='email'
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className='h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-50 dark:focus:bg-slate-700 dark:focus:border-slate-500 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder={t('auth.form.emailPlaceholder')}
        />
      </div>

      {showName ? (
        <div>
          <label className='mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300' htmlFor='name'>
            {t('auth.form.name')}
          </label>
          <input
            id='name'
            type='text'
            autoComplete='name'
            value={name}
            onChange={(event) => setName(event.target.value)}
            className='h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-50 dark:focus:bg-slate-700 dark:focus:border-slate-500 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
            placeholder={t('auth.form.namePlaceholder')}
          />
        </div>
      ) : null}

      <div>
        <label className='mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300' htmlFor='password'>
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
          className='h-12 w-full rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-50 dark:focus:bg-slate-700 dark:focus:border-slate-500 bg-slate-50 px-4 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white'
          placeholder='••••••••'
        />
      </div>

      {error ? (
        <p className='rounded-2xl border border-rose-200 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400 bg-rose-50 px-4 py-3 text-sm text-rose-700'>
          {error}
        </p>
      ) : null}

      <button
        type='submit'
        disabled={isSubmitting}
        className='inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 dark:bg-emerald-600 dark:hover:bg-emerald-500 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60'
      >
        {isSubmitting && (
          <span className='mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
        )}
        {isSubmitting ? t('auth.form.processing') : submitLabel}
      </button>

      <div className='relative py-1 text-center'>
        <span className='absolute inset-x-0 top-1/2 h-px dark:bg-slate-700 -translate-y-1/2 bg-slate-200' />
        <span className='relative inline-block dark:bg-slate-800/40 dark:text-slate-400 bg-white px-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-400'>
          {t('auth.form.orContinueWith')}
        </span>
      </div>

      <button
        type='button'
        disabled={isGoogleSubmitting}
        onClick={async () => {
          setIsGoogleSubmitting(true);
          const started = await startGoogleOAuth(setError, t('auth.form.oauthStartFailed'));
          if (!started) {
            setIsGoogleSubmitting(false);
          }
        }}
        className='inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800/50 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50'
      >
        {isGoogleSubmitting ? (
          <span className='inline-flex items-center gap-2'>
            <span className='inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
            {t('auth.form.redirectingToGoogle')}
          </span>
        ) : (
          <>
            <Image src={googleLogo} alt='Google' width={18} height={18} />
            {t('auth.form.continueWithGoogle')}
          </>
        )}
      </button>

      <div className='flex items-center justify-between text-sm text-slate-600 dark:text-slate-400'>
        <Link
          className='font-medium text-slate-900 dark:text-slate-50 underline decoration-slate-300 dark:decoration-slate-700 underline-offset-4'
          href={footerHref.startsWith('/') ? withLocale(footerHref) : footerHref}
        >
          {footerLabel}
        </Link>
        <Link
          className='text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
          href={withLocale('/')}
        >
          {t('common.backHome')}
        </Link>
      </div>
    </form>
  );
}
