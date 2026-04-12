'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { LogoutButton } from '@/components/auth/logout-button';
import { financeUi } from '@/components/finance/ui';
import { useToast } from '@/components/ui/toast-provider';

type MePayload = {
  user?: { email?: string; displayName?: string | null };
  profile?: { display_name?: string | null; email?: string } | null;
  message?: string;
};

type SidebarAccountSectionProps = {
  initialEmail?: string;
  initialDisplayName?: string | null;
};

function getInitials(name: string, fallbackEmail: string) {
  const source = name.trim() || fallbackEmail;
  const words = source.replace(/@.*/, '').split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase();
}

export function SidebarAccountSection({ initialEmail = '', initialDisplayName = '' }: SidebarAccountSectionProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [isLoading, setIsLoading] = useState(!initialEmail && !initialDisplayName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [email, setEmail] = useState(initialEmail);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [draftName, setDraftName] = useState(initialDisplayName);

  const initials = useMemo(() => getInitials(displayName, email), [displayName, email]);

  async function loadProfile() {
    if (!initialEmail && !initialDisplayName) {
      setIsLoading(true);
    }
    try {
      const response = await fetch('/api/user/me', { cache: 'no-store' });
      const payload = (await response.json()) as MePayload;

      if (!response.ok) {
        addToast({
          title: 'Could not load account',
          description: payload.message ?? 'Please try again.',
          variant: 'error',
        });
        return;
      }

      const resolvedEmail = payload.profile?.email ?? payload.user?.email ?? '';
      const resolvedDisplayName = payload.profile?.display_name ?? payload.user?.displayName ?? '';

      setEmail(resolvedEmail);
      setDisplayName(resolvedDisplayName);
      setDraftName(resolvedDisplayName);
    } finally {
      if (!initialEmail && !initialDisplayName) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadProfile();
  }, []);

  async function onSaveDisplayName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draftName.trim().replace(/\s+/g, ' ');

    if (!trimmed || trimmed.length > 80) {
      addToast({
        title: 'Invalid display name',
        description: 'Please enter a name between 1 and 80 characters.',
        variant: 'error',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: trimmed }),
      });

      const payload = (await response.json()) as { message?: string; profile?: { display_name?: string | null } };

      if (!response.ok) {
        addToast({
          title: 'Profile update failed',
          description: payload.message ?? 'Could not update display name.',
          variant: 'error',
        });
        return;
      }

      const updatedName = payload.profile?.display_name ?? trimmed;
      setDisplayName(updatedName);
      setDraftName(updatedName);
      setIsEditing(false);
      addToast({ title: 'Profile updated', description: 'Display name saved successfully.' });
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className='mt-auto border-t border-slate-200 pt-4'>
      <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-3'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500'>Account</p>

        <div className='mt-3 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-sm font-semibold text-emerald-700'>
            {initials}
          </div>
          <div className='min-w-0'>
            {isLoading ? (
              <p className={financeUi.mutedText}>Loading profile...</p>
            ) : (
              <>
                <p className='truncate text-sm font-semibold text-slate-900'>{displayName || 'Your account'}</p>
                {email ? <p className='truncate text-xs text-slate-500'>{email}</p> : null}
              </>
            )}
          </div>
        </div>

        <div className='mt-3 flex flex-col gap-2'>
          <button
            type='button'
            className={`${financeUi.secondaryButton} h-24 flex-1`}
            onClick={() => setIsEditing(true)}
          >
            Edit profile
          </button>
          <LogoutButton className='h-24 flex-1 rounded-xl' />
        </div>
      </div>

      {isEditing ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm'>
          <div className='w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.16)]'>
            <h2 className='text-xl font-semibold text-slate-950'>Edit account</h2>
            <p className='mt-1 text-sm text-slate-600'>Update how your name appears across Monity.</p>

            <form className='mt-4 space-y-4' onSubmit={onSaveDisplayName}>
              <div>
                <label className={financeUi.label}>Display name</label>
                <input
                  className={financeUi.input}
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label className={financeUi.label}>Email</label>
                <input className={`${financeUi.input} cursor-not-allowed bg-slate-100`} value={email} readOnly />
              </div>

              <div className='flex justify-end gap-2'>
                <button type='button' className={financeUi.secondaryButton} onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type='submit' className={financeUi.primaryButton} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
