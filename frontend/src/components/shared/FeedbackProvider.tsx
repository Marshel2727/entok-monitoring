"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LuCheck, LuInfo, LuTriangleAlert, LuX } from 'react-icons/lu';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger' | 'warning';
}

interface ConfirmState extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

interface FeedbackContextValue {
  showToast: (type: ToastType, message: string) => void;
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const toastIcon = {
  success: <LuCheck size={16} />,
  error: <LuX size={16} />,
  warning: <LuTriangleAlert size={16} />,
  info: <LuInfo size={16} />,
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const closeToast = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((items) => [...items.slice(-3), { id, type, message }]);
    window.setTimeout(() => closeToast(id), type === 'error' ? 5000 : 3500);
  }, [closeToast]);

  const confirmAction = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        title: options.title || 'Konfirmasi Aksi',
        message: options.message,
        confirmLabel: options.confirmLabel || 'Lanjutkan',
        cancelLabel: options.cancelLabel || 'Batal',
        tone: options.tone || 'default',
        resolve,
      });
    });
  }, []);

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmState((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const value = useMemo(() => ({ showToast, confirmAction }), [showToast, confirmAction]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}

      <div className="toast-stack" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`app-toast app-toast-${toast.type}`}>
            <div className="app-toast-icon">{toastIcon[toast.type]}</div>
            <div className="app-toast-message">{toast.message}</div>
            <button
              type="button"
              className="app-toast-close"
              aria-label="Tutup notifikasi"
              onClick={() => closeToast(toast.id)}
            >
              <LuX size={14} />
            </button>
          </div>
        ))}
      </div>

      {confirmState && (
        <div className="confirm-overlay" role="presentation" onClick={() => closeConfirm(false)}>
          <div
            className={`confirm-dialog confirm-dialog-${confirmState.tone}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog-icon">
              <LuTriangleAlert size={22} />
            </div>
            <div className="confirm-dialog-content">
              <h2 id="confirm-dialog-title">{confirmState.title}</h2>
              <p>{confirmState.message}</p>
            </div>
            <div className="confirm-dialog-actions">
              <button type="button" className="retro-btn btn-secondary" onClick={() => closeConfirm(false)}>
                {confirmState.cancelLabel}
              </button>
              <button type="button" className="retro-btn confirm-action-btn" onClick={() => closeConfirm(true)}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used inside FeedbackProvider');
  }
  return context;
}
