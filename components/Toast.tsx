import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose?: () => void;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.type !== 'loading' && toast.duration) {
      const timer = setTimeout(() => {
        onClose();
        toast.onClose?.();
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-emerald-50 border-emerald-200',
          icon: <CheckCircle2 size={20} className="text-emerald-600" />,
          text: 'text-emerald-900',
        };
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertCircle size={20} className="text-red-600" />,
          text: 'text-red-900',
        };
      case 'loading':
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <div className="w-5 h-5 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />,
          text: 'text-blue-900',
        };
      case 'info':
      default:
        return {
          bg: 'bg-gray-50 border-gray-200',
          icon: <Info size={20} className="text-gray-600" />,
          text: 'text-gray-900',
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} border rounded-2xl p-4 shadow-lg flex items-center gap-3 animate-slide-in-up max-w-sm`}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <p className={`flex-1 font-medium text-sm ${styles.text}`}>{toast.message}</p>
      {toast.type !== 'loading' && (
        <button
          onClick={onClose}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

export default Toast;
