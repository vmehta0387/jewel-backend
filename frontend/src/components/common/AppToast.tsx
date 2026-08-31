import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type AppToastVariant = 'info' | 'success' | 'warning' | 'error';
export type AppToastPosition = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';

export interface AppToastOptions {
  title?: string;
  message: string;
  variant?: AppToastVariant;
  position?: AppToastPosition;
  zIndex?: number;
  className?: string;
  durationMs?: number;
}

interface AppToastProps extends AppToastOptions {
  open: boolean;
  onClose: () => void;
}

const positionClasses: Record<AppToastPosition, string> = {
  'top-start': 'left-4 top-4',
  'top-end': 'right-4 top-4',
  'bottom-start': 'bottom-4 left-4',
  'bottom-end': 'bottom-4 right-4',
};

const variantStyles: Record<AppToastVariant, { iconWrap: string; title: string; bar: string; icon: JSX.Element }> = {
  info: {
    iconWrap: 'bg-sky-50 text-sky-700 ring-sky-100',
    title: 'text-sky-950',
    bar: 'bg-sky-500',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="M10 9v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 6.6h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    ),
  },
  success: {
    iconWrap: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    title: 'text-emerald-950',
    bar: 'bg-emerald-500',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="m6.8 10.2 2 2 4.4-4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warning: {
    iconWrap: 'bg-amber-50 text-amber-700 ring-amber-100',
    title: 'text-amber-950',
    bar: 'bg-amber-500',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M10 7.5v3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M10 14h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M8.4 3.7 2.2 15a1.4 1.4 0 0 0 1.2 2.1h13.2a1.4 1.4 0 0 0 1.2-2.1L11.6 3.7a1.8 1.8 0 0 0-3.2 0Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  error: {
    iconWrap: 'bg-rose-50 text-rose-700 ring-rose-100',
    title: 'text-rose-950',
    bar: 'bg-rose-500',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" />
        <path d="m7.5 7.5 5 5M12.5 7.5l-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
};

const defaultTitles: Record<AppToastVariant, string> = {
  info: 'Notice',
  success: 'Success',
  warning: 'Attention',
  error: 'Unable to complete',
};

export default function AppToast({
  open,
  title,
  message,
  variant = 'info',
  position = 'top-end',
  zIndex = 160,
  className = '',
  durationMs = 4200,
  onClose,
}: AppToastProps) {
  useEffect(() => {
    if (!open || durationMs <= 0) return undefined;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, onClose, open]);

  if (!open) return null;

  const styles = variantStyles[variant];
  const resolvedTitle = title || defaultTitles[variant];

  return createPortal(
    <div className={`fixed ${positionClasses[position]} w-[calc(100%-2rem)] max-w-md`} style={{ zIndex }}>
      <div
        role="status"
        aria-live={variant === 'error' ? 'assertive' : 'polite'}
        className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 ${className}`}
      >
        <div className={`h-1 ${styles.bar}`} />
        <div className="flex items-start gap-3 p-4">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${styles.iconWrap}`}>
            {styles.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${styles.title}`}>{resolvedTitle}</p>
            <p className="mt-1 whitespace-pre-line break-words text-sm leading-5 text-slate-600">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
