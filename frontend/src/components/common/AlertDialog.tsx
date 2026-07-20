import { createPortal } from 'react-dom';
import Button from './Button';

type AlertDialogVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertDialogProps {
  open: boolean;
  title?: string;
  message: string;
  variant?: AlertDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
}

const variantStyles: Record<AlertDialogVariant, { badge: string; icon: JSX.Element; title: string }> = {
  info: {
    badge: 'bg-sky-50 text-sky-700 ring-sky-100',
    title: 'text-slate-900',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 10v7" />
        <path d="M12 7h.01" />
      </svg>
    ),
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    title: 'text-slate-900',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="m8.5 12.5 2.5 2.5 4.5-5" />
      </svg>
    ),
  },
  warning: {
    badge: 'bg-amber-50 text-amber-700 ring-amber-100',
    title: 'text-slate-900',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
    ),
  },
  error: {
    badge: 'bg-rose-50 text-rose-700 ring-rose-100',
    title: 'text-slate-900',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9 9 15" />
        <path d="m9 9 6 6" />
      </svg>
    ),
  },
};

export default function AlertDialog({
  open,
  title = 'Notice',
  message,
  variant = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onClose,
  onConfirm,
}: AlertDialogProps) {
  if (!open) return null;

  const styles = variantStyles[variant];
  const isConfirmation = Boolean(onConfirm);

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="app-alert-title"
        aria-describedby="app-alert-message"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl ring-1 ring-slate-900/10"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${styles.badge}`}>
            {styles.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="app-alert-title" className={`text-base font-bold ${styles.title}`}>
              {title}
            </h2>
            <p id="app-alert-message" className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
              {message}
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close alert"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M6 18 18 6" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div className="flex justify-end gap-2 bg-slate-50/70 px-5 py-4">
          {isConfirmation && (
            <Button type="button" variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
          )}
          <Button type="button" variant={variant === 'error' || variant === 'warning' ? 'danger' : 'primary'} onClick={onConfirm || onClose}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
