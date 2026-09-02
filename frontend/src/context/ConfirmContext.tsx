import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, Info, Trash2, X } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string, title?: string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: { message: '' }
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = (options: ConfirmOptions | string, customTitle?: string): Promise<boolean> => {
    let opts: ConfirmOptions;
    if (typeof options === 'string') {
      opts = {
        message: options,
        title: customTitle || 'Confirm Action',
        type: 'danger',
        confirmText: 'Confirm',
        cancelText: 'Cancel'
      };
    } else {
      opts = {
        confirmText: 'Confirm',
        cancelText: 'Cancel',
        type: 'danger',
        ...options
      };
    }

    setDialogState({
      isOpen: true,
      options: opts
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  };

  const handleConfirm = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialogState.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogState.isOpen]);

  const { title, message, confirmText, cancelText, type } = dialogState.options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialogState.isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4 sm:p-6 animate-fadeIn"
          onMouseDown={handleCancel}
        >
          <div
            className="bg-white w-full max-w-md rounded-xl border border-border-light shadow-2xl overflow-hidden animate-scaleUp flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-light bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  type === 'danger' ? 'bg-red-50 text-red-600' :
                  type === 'warning' ? 'bg-amber-50 text-amber-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  {type === 'danger' ? <Trash2 className="w-4 h-4" /> :
                   type === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                   <Info className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-sm text-text-primary">
                  {title || (type === 'danger' ? 'Delete Confirmation' : 'Confirm Action')}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded text-text-muted hover:text-text-primary hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 text-xs text-text-secondary leading-relaxed">
              {message}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-50/70 border-t border-border-light">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded text-xs font-semibold text-text-secondary bg-white border border-border-light hover:bg-slate-50 transition-colors cursor-pointer"
              >
                {cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className={`px-4 py-1.5 rounded text-xs font-bold text-white transition-colors shadow-sm cursor-pointer ${
                  type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                  type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-brand-primary hover:bg-brand-primary-dark'
                }`}
              >
                {confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
