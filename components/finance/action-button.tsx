import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ActionButtonVariant = 'primary' | 'secondary' | 'danger';

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ActionButtonVariant;
  fullWidthOnMobile?: boolean;
  children: ReactNode;
};

const baseClassName =
  'inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

const variantClassNames: Record<ActionButtonVariant, string> = {
  primary:
    'border-emerald-600 bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.2)] hover:border-emerald-500 hover:bg-emerald-500',
  secondary: 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50',
  danger: 'border-rose-200 bg-white text-rose-700 shadow-sm hover:border-rose-300 hover:bg-rose-50',
};

export function ActionButton({
  variant = 'secondary',
  className,
  fullWidthOnMobile = false,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      className={`${baseClassName} ${variantClassNames[variant]} ${fullWidthOnMobile ? 'w-full sm:w-auto' : ''} ${className ?? ''}`}
    >
      {children}
    </button>
  );
}
