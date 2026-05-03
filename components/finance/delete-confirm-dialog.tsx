'use client';

import { createPortal } from 'react-dom';

import { ActionButton } from '@/components/finance/action-button';
import { financeUi } from '@/components/finance/ui';

type DeleteConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  impact: string;
  resourceLabel: string;
  resourceName: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteConfirmDialog({
  isOpen,
  title,
  description,
  impact,
  resourceLabel,
  resourceName,
  confirmLabel,
  cancelLabel,
  closeLabel,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (typeof document === 'undefined' || !isOpen) return null;

  return createPortal(
    <div className='fixed inset-0 z-100 flex items-center justify-center p-4'>
      <button
        type='button'
        className='absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]'
        onClick={isSubmitting ? undefined : onCancel}
        aria-label={closeLabel}
        disabled={isSubmitting}
      />

      <section className={`${financeUi.modalCard} relative z-10 w-full max-w-lg`} role='dialog' aria-modal='true'>
        <div className='mb-4 flex items-start justify-between gap-3'>
          <div>
            <h3 className='text-lg font-semibold text-slate-900 dark:text-slate-100'>{title}</h3>
            <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>{description}</p>
          </div>
          <ActionButton type='button' variant='secondary' onClick={onCancel} disabled={isSubmitting}>
            {closeLabel}
          </ActionButton>
        </div>

        <div className='space-y-3'>
          <div className='rounded-xl border border-rose-200/70 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300'>
            <p className='font-semibold'>{resourceLabel}</p>
            <p className='mt-1 break-all'>{resourceName}</p>
          </div>
          <p className='text-sm text-slate-700 dark:text-slate-300'>{impact}</p>
        </div>

        <div className='mt-5 flex flex-wrap justify-end gap-2'>
          <ActionButton type='button' variant='secondary' onClick={onCancel} disabled={isSubmitting}>
            {cancelLabel}
          </ActionButton>
          <ActionButton type='button' variant='danger' onClick={onConfirm} disabled={isSubmitting}>
            {confirmLabel}
          </ActionButton>
        </div>
      </section>
    </div>,
    document.body,
  );
}
