import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ProductsModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: string;
  zIndexClass?: string;
  footer?: ReactNode;
}

export default function ProductsModal({
  title,
  onClose,
  children,
  size = 'max-w-6xl',
  zIndexClass = 'z-[100]',
  footer,
}: ProductsModalProps) {
  return createPortal(
    <div className={`fixed inset-0 ${zIndexClass} flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm transition-all duration-300 sm:p-6`}>
      <div className={`relative my-auto flex max-h-[calc(100dvh-2rem)] w-full ${size} flex-col overflow-hidden rounded-2xl border border-white/20 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]`}>
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200/60 bg-white/95 px-6 py-4 backdrop-blur-md">
          <h2 className="text-[1.15rem] font-bold tracking-tight text-slate-800">{title}</h2>
          <button
            type="button"
            className="group flex h-9 w-9 items-center justify-center rounded-full bg-slate-100/50 text-slate-500 transition-all hover:bg-slate-200 hover:text-slate-900"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-4 w-4 transition-transform group-hover:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-slate-50/30 p-5 sm:p-6">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 px-5 py-3 shadow-[0_-8px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
