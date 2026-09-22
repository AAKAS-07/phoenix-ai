import React from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Trash2, HelpCircle, X, ShieldAlert } from 'lucide-react';

const ConfirmModal = () => {
  const { confirmModal, closeConfirm } = useAuth();

  if (!confirmModal || !confirmModal.isOpen) return null;

  const {
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed with this action?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'danger',
    onConfirm,
    onCancel
  } = confirmModal;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    closeConfirm();
  };

  const getHeaderIcon = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0 border border-rose-200 dark:border-rose-800/50 shadow-sm">
            <Trash2 className="w-6 h-6" />
          </div>
        );
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-200 dark:border-amber-800/50 shadow-sm">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl shrink-0 border border-blue-200 dark:border-blue-800/50 shadow-sm">
            <HelpCircle className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'danger':
      case 'error':
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/25';
      case 'warning':
        return 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25';
      default:
        return 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/25';
    }
  };

  return (
    <div
      onClick={handleCancel}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300 animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-7 animate-scale-up space-y-5"
      >
        {/* Top Close Button */}
        <button
          onClick={handleCancel}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content Section */}
        <div className="flex items-start gap-4 pr-6">
          {getHeaderIcon()}
          <div>
            <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed font-medium">
              {message}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${getConfirmButtonStyles()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
