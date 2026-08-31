import { useCallback, useMemo, useRef, useState } from 'react';
import AlertDialog from './AlertDialog';
import AppToast, { AppToastOptions } from './AppToast';

type DialogVariant = 'info' | 'success' | 'warning' | 'error';
type AlertInput = string | AppToastOptions;

type DialogState =
  | {
      mode: 'alert';
      title: string;
      message: string;
      variant: DialogVariant;
      confirmLabel: string;
    }
  | {
      mode: 'confirm';
      title: string;
      message: string;
      variant: DialogVariant;
      confirmLabel: string;
      cancelLabel: string;
    }
  | {
      mode: 'prompt';
      title: string;
      message: string;
      variant: DialogVariant;
      confirmLabel: string;
      cancelLabel: string;
      inputLabel?: string;
      inputPlaceholder?: string;
    };

type Resolver = (value: any) => void;

export function useAppDialog() {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toast, setToast] = useState<AppToastOptions | null>(null);
  const [inputValue, setInputValue] = useState('');
  const resolverRef = useRef<Resolver | null>(null);

  const closeDialog = useCallback((value: boolean | string | null | void) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setDialog(null);
    setInputValue('');
  }, []);

  const showAlert = useCallback(
    (
      alert: AlertInput,
      options: Partial<AppToastOptions> & { confirmLabel?: string } = {},
    ) => {
      const payload = typeof alert === 'string' ? { ...options, message: alert } : { ...options, ...alert };
      setToast({
        ...payload,
        message: payload.message || '',
        variant: payload.variant || 'info',
        position: payload.position || 'top-end',
      });
    },
    [],
  );

  const confirm = useCallback(
    (
      message: string,
      options: { title?: string; variant?: DialogVariant; confirmLabel?: string; cancelLabel?: string } = {},
    ) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setDialog({
          mode: 'confirm',
          title: options.title || 'Confirm action',
          message,
          variant: options.variant || 'warning',
          confirmLabel: options.confirmLabel || 'Confirm',
          cancelLabel: options.cancelLabel || 'Cancel',
        });
      }),
    [],
  );

  const prompt = useCallback(
    (
      message: string,
      options: {
        title?: string;
        variant?: DialogVariant;
        confirmLabel?: string;
        cancelLabel?: string;
        inputLabel?: string;
        inputPlaceholder?: string;
        defaultValue?: string;
      } = {},
    ) =>
      new Promise<string | null>((resolve) => {
        resolverRef.current = resolve;
        setInputValue(options.defaultValue || '');
        setDialog({
          mode: 'prompt',
          title: options.title || 'Input required',
          message,
          variant: options.variant || 'info',
          confirmLabel: options.confirmLabel || 'Continue',
          cancelLabel: options.cancelLabel || 'Cancel',
          inputLabel: options.inputLabel,
          inputPlaceholder: options.inputPlaceholder,
        });
      }),
    [],
  );

  const dialogNode = useMemo(() => {
    if (!dialog && !toast) return null;
    if (toast) {
      return <AppToast open {...toast} onClose={() => setToast(null)} />;
    }

    if (!dialog) return null;
    const isConfirm = dialog.mode === 'confirm';
    const isPrompt = dialog.mode === 'prompt';

    return (
      <AlertDialog
        open
        title={dialog.title}
        message={dialog.message}
        variant={dialog.variant}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={isConfirm || isPrompt ? dialog.cancelLabel : undefined}
        inputLabel={isPrompt ? dialog.inputLabel : undefined}
        inputPlaceholder={isPrompt ? dialog.inputPlaceholder : undefined}
        inputValue={isPrompt ? inputValue : undefined}
        onInputChange={isPrompt ? setInputValue : undefined}
        onClose={() => closeDialog(isPrompt ? null : false)}
        onConfirm={
          isConfirm || isPrompt
            ? () => closeDialog(isPrompt ? inputValue : true)
            : () => closeDialog()
        }
      />
    );
  }, [closeDialog, dialog, inputValue, toast]);

  return { showAlert, confirm, prompt, dialogNode };
}

