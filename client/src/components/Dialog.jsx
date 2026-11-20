import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function Modal({ open, onClose, title, description, children, footer, size = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative flex max-h-[92dvh] w-full ${size} animate-sheet flex-col rounded-t-[32px] bg-white shadow-2xl sm:animate-rise sm:rounded-[32px]`}
      >
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-12 rounded-full bg-ink-200" />
        </div>
        {(title || onClose) && (
          <div className="flex items-start gap-3 px-6 pt-3 pb-2 sm:pt-6">
            <div className="min-w-0 flex-1">
              {title && <h2 className="text-xl leading-tight font-extrabold text-ink-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
            </div>
            {onClose && (
              <button className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-700 active:scale-90" onClick={onClose} aria-label="Close">
                <X className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto px-6 pt-2 pb-6">{children}</div>
        {footer && <div className="pb-safe flex justify-end gap-2 border-t border-ink-100 px-6 py-4 [&>*]:flex-1 sm:[&>*]:flex-none">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

const DialogContext = createContext(null);

// Replacement for window.confirm / prompt: await confirm({ title, message, withReason })
export function DialogProvider({ children }) {
  const [state, setState] = useState(null);
  const [reason, setReason] = useState('');
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    setReason('');
    setState(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setState(null);
  };

  return (
    <DialogContext.Provider value={confirm}>
      {children}
      <Modal
        open={Boolean(state)}
        onClose={() => close({ ok: false })}
        title={state?.title}
        size="max-w-md"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => close({ ok: false })}>
              {state?.cancelLabel ?? 'Cancel'}
            </button>
            <button
              className={`btn ${state?.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={() => close({ ok: true, reason: reason.trim() || null })}
            >
              {state?.confirmLabel ?? 'Confirm'}
            </button>
          </>
        }
      >
        {state?.message && <p className="text-sm text-ink-600">{state.message}</p>}
        {state?.withReason && (
          <div className="mt-4">
            <label className="label">{state.reasonLabel ?? 'Reason (optional)'}</label>
            <textarea
              className="input"
              rows={3}
              maxLength={300}
              autoFocus
              placeholder={state.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useConfirm must be used inside DialogProvider');
  return ctx;
}
