import React from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastItem = ({ toast, onRemove }) => {
  const { id, title, message, type = 'success', duration = 4000, isExiting } = toast;

  const getStatusStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/50',
          border: 'border-emerald-500/25 dark:border-emerald-500/30',
          progressBar: 'bg-emerald-500 dark:bg-emerald-400',
          accentDot: 'bg-emerald-500'
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
          badgeBg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/50',
          border: 'border-rose-500/25 dark:border-rose-500/30',
          progressBar: 'bg-rose-500 dark:bg-rose-400',
          accentDot: 'bg-rose-500'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />,
          badgeBg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/50',
          border: 'border-amber-500/25 dark:border-amber-500/30',
          progressBar: 'bg-amber-500 dark:bg-amber-400',
          accentDot: 'bg-amber-500'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />,
          badgeBg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/50',
          border: 'border-blue-500/25 dark:border-blue-500/30',
          progressBar: 'bg-blue-500 dark:bg-blue-400',
          accentDot: 'bg-blue-500'
        };
    }
  };

  const style = getStatusStyles();

  return (
    <div
      className={`pointer-events-auto relative w-full overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border shadow-xl shadow-slate-950/10 dark:shadow-black/40 p-4 transition-all duration-300 ${style.border} ${
        isExiting ? 'animate-toast-out' : 'animate-toast-in'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status Icon Container */}
        <div className={`p-2 rounded-xl border ${style.badgeBg} flex items-center justify-center`}>
          {style.icon}
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0 pt-0.5">
          {title && (
            <h4 className="font-display font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white tracking-tight leading-snug">
              {title}
            </h4>
          )}
          {message && (
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed break-words">
              {message}
            </p>
          )}
        </div>

        {/* Close Icon Button */}
        <button
          type="button"
          onClick={() => onRemove(id)}
          aria-label="Close notification"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 -mr-1 -mt-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar Display Indicator */}
      {duration > 0 && !isExiting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className={`h-full ${style.progressBar} animate-toast-progress`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
};

const Toast = () => {
  const { toasts = [], removeToast } = useAuth();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-[9999] pointer-events-none flex flex-col-reverse gap-3 max-w-[calc(100vw-2rem)] sm:max-w-md w-full items-end"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
};

export default Toast;
