import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Button from './Button';

type UnsavedChangesGuardOptions = {
  value: unknown;
  ready?: boolean;
  isSaving?: boolean;
  onSave: () => Promise<boolean>;
  title?: string;
};

export function useUnsavedChangesGuard({
  value,
  ready = true,
  isSaving = false,
  onSave,
  title = 'Unsaved Changes',
}: UnsavedChangesGuardOptions) {
  const initialSnapshotRef = useRef<string | null>(null);
  const [savingFromGuard, setSavingFromGuard] = useState(false);
  const snapshot = useMemo(() => JSON.stringify(value), [value]);

  useEffect(() => {
    if (ready && initialSnapshotRef.current === null) {
      initialSnapshotRef.current = snapshot;
    }
  }, [ready, snapshot]);

  const isDirty = ready && initialSnapshotRef.current !== null && initialSnapshotRef.current !== snapshot;
  const blocker = useBlocker(isDirty && !isSaving && !savingFromGuard);

  const markClean = useCallback(() => {
    initialSnapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const saveAndProceed = useCallback(async () => {
    setSavingFromGuard(true);
    try {
      const saved = await onSave();
      if (saved) {
        blocker.proceed?.();
      }
    } finally {
      setSavingFromGuard(false);
    }
  }, [blocker, onSave]);

  const dialogNode = blocker.state === 'blocked'
    ? createPortal(
      <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]">
        <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            You have unsaved changes. Save them before leaving, discard them, or stay on this form.
          </p>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button type="button" size="sm" onClick={() => void saveAndProceed()} disabled={isSaving || savingFromGuard}>
              {isSaving || savingFromGuard ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => blocker.proceed?.()} disabled={isSaving || savingFromGuard}>
              Discard Changes
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => blocker.reset?.()} disabled={isSaving || savingFromGuard}>
              Cancel
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return { isDirty, markClean, dialogNode };
}
