import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  const { showToast } = useAuth();

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSendReset = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      showToast({
        title: 'Invalid Email',
        message: 'Please enter a valid email address.',
        type: 'warning'
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/auth/forgot-password', { email: trimmedEmail });
      const responseMsg = res.data?.message || 'Password reset link sent to your email address.';
      setMessage(responseMsg);
      setSubmitted(true);
      setCooldown(60);

      showToast({
        title: 'Reset Link Sent',
        message: responseMsg,
        type: 'info'
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Unable to send the reset email. Please try again.';
      setErrorMessage(errorMsg);
      setSubmitted(false);

      showToast({
        title: 'Reset Request Failed',
        message: errorMsg,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout pageType="forgot-password">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800 relative z-10">

        {/* Header Row: Back Link on Left, Logo on Right */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-5 w-full">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 hover:text-brand-500 transition-colors uppercase tracking-wider whitespace-nowrap shrink-0"
          >
            <i className="fas fa-arrow-left text-[9px] sm:text-[10px]"></i> Back to Sign In
          </Link>

          <div className="inline-flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-accent p-0.5 shadow-sm flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[0.4rem] flex items-center justify-center">
                <i className="fas fa-wheat-awn text-brand-500 text-xs"></i>
              </div>
            </div>
            <span className="font-display font-extrabold text-sm sm:text-base text-slate-800 dark:text-white leading-none flex items-center gap-1">
              <span>Phoenix</span> <span className="text-brand-500">AI</span>
            </span>
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-5">
          <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
            Enter your registered email address and we'll send you instructions to safely reset your password.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-6 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-slate-800 dark:text-slate-100 text-center space-y-4 animate-scale-up">
            <div className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-brand-500/30 text-xl animate-bounce">
              <i className="fas fa-paper-plane"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white">
                Check Your Email Inbox
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-xs mx-auto font-medium">
                {message}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                The reset link will expire in <strong>30 minutes</strong>.
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <Link
                to="/login"
                className="block text-center w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/25 transition-all text-xs"
              >
                Return to Sign In
              </Link>

              <div className="pt-1">
                {cooldown > 0 ? (
                  <p className="text-[11px] font-semibold text-slate-400">
                    Resend link available in <span className="text-brand-500 font-bold">{cooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendReset()}
                    disabled={submitting}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-accent hover:underline transition-colors block mx-auto cursor-pointer"
                  >
                    Didn't receive email? Resend Reset Email
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors block mx-auto pt-1 cursor-pointer"
              >
                Try a different email address
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendReset} className="space-y-4" noValidate>

            {/* Email Address Field */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5">
                REGISTERED EMAIL ADDRESS <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10 flex items-center justify-center">
                  <i className="fas fa-envelope text-xs"></i>
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Enter your email address"
                  className="form-input !pl-14 pr-4 py-2.5 text-xs rounded-xl"
                />
              </div>
            </div>

            {/* Send Reset Link Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 text-xs tracking-wide mt-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <i className="fas fa-paper-plane text-xs"></i>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Remember your password?{' '}
            <Link to="/login" className="text-brand-500 font-bold hover:underline inline-flex items-center gap-1">
              Sign in <i className="fas fa-chevron-right text-[10px]"></i>
            </Link>
          </p>
        </div>

      </div>
    </AuthLayout>
  );
};

export default ForgotPassword;
