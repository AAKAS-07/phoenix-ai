import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ResetPassword = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useAuth();

  const token = params.token || searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Password reset link is invalid or has expired.');
        setTokenValid(false);
        setValidatingToken(false);
        return;
      }

      try {
        const res = await api.get(`/auth/reset-password/${token}`);
        if (res.data && res.data.valid) {
          setTokenValid(true);
          setUserInfo(res.data);
        } else {
          setTokenValid(false);
          setError(res.data?.message || 'Password reset link is invalid or has expired.');
        }
      } catch (err) {
        setTokenValid(false);
        const msg = err.response?.data?.message || 'Password reset link is invalid or has expired.';
        setError(msg);
      } finally {
        setValidatingToken(false);
      }
    };

    verifyToken();
  }, [token]);

  // Real-time password requirement checks
  const reqLength = password.length >= 8;
  const reqUpper = /[A-Z]/.test(password);
  const reqLower = /[a-z]/.test(password);
  const reqNumber = /\d/.test(password);
  const reqSpecial = /[@$!%*?&]/.test(password);

  const matchedCriteriaCount = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (matchedCriteriaCount === 0) return { text: 'None', color: 'bg-slate-200 dark:bg-slate-700', textCol: 'text-slate-400' };
    if (matchedCriteriaCount <= 2) return { text: 'Weak', color: 'bg-rose-500', textCol: 'text-rose-500' };
    if (matchedCriteriaCount <= 4) return { text: 'Moderate', color: 'bg-amber-500', textCol: 'text-amber-500' };
    return { text: 'Strong', color: 'bg-emerald-500', textCol: 'text-emerald-500' };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Password reset link is invalid or has expired.');
      return;
    }

    if (!reqLength || !reqUpper || !reqLower || !reqNumber || !reqSpecial) {
      setError('Password does not meet all required security criteria.');
      showToast({
        title: 'Weak Password',
        message: 'Password must meet all 5 security requirements.',
        type: 'warning'
      });
      return;
    }

    if (password !== confirmPassword) {
      setError('New password and confirm password do not match.');
      showToast({
        title: 'Passwords Do Not Match',
        message: 'Please ensure both password fields match exactly.',
        type: 'error'
      });
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post(`/auth/reset-password/${token}`, {
        password: password,
        confirmPassword: confirmPassword
      });

      if (res.data && res.data.success) {
        showToast({
          title: 'Password Reset Successful',
          message: res.data.message || 'Password reset successfully.',
          type: 'success'
        });
        navigate('/login');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Password reset link is invalid or has expired.';
      setError(errMsg);
      showToast({
        title: 'Password Reset Failed',
        message: errMsg,
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-brand-50 dark:bg-slate-950">
        <div className="text-center bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800 max-w-sm w-full">
          <i className="fas fa-circle-notch fa-spin text-3xl text-brand-500 mb-4"></i>
          <p className="text-slate-700 dark:text-slate-200 font-bold text-sm">Validating Reset Token...</p>
          <p className="text-slate-400 text-xs mt-1">Checking link validity and security signature</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-brand-50 relative overflow-hidden dark:bg-slate-950">

      {/* Background graphic */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 C 20 0 50 0 100 100 Z" fill="#2E7D32"></path>
        </svg>
      </div>

      <div className="view-transition w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 relative z-10 border border-slate-100 dark:border-slate-800">

        {/* Header */}
        <div className="mb-6">
          <Link
            to="/login"
            className="mb-4 text-slate-400 hover:text-brand-500 inline-flex items-center gap-1.5 text-xs font-bold transition-colors uppercase tracking-wider"
          >
            <i className="fas fa-arrow-left text-[10px]"></i> Back to Sign In
          </Link>
          <h2 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Create New Password</h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1.5 leading-relaxed">
            {userInfo ? (
              <span>Resetting password for <strong className="text-slate-700 dark:text-slate-200">{userInfo.firstName || 'User'}</strong> ({userInfo.email})</span>
            ) : (
              'Enter your new secure password below.'
            )}
          </p>
        </div>

        {!tokenValid ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-slate-800 dark:text-slate-200 text-center space-y-4 animate-scale-up">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-rose-600 dark:text-rose-400">
                Invalid or Expired Link
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                {error || 'This password reset link is invalid, has expired (30 minute limit), or has already been used.'}
              </p>
            </div>
            <Link
              to="/forgot-password"
              className="block text-center w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-md transition-all text-xs cursor-pointer mt-2"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
                <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* New Password Field */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5">
                NEW PASSWORD <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10 flex items-center justify-center">
                  <i className="fas fa-lock text-xs"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="form-input !pl-14 pr-12 py-2.5 text-xs rounded-xl"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors p-1 cursor-pointer flex items-center justify-center"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5">
                CONFIRM NEW PASSWORD <span className="text-rose-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none z-10 flex items-center justify-center">
                  <i className="fas fa-shield-check text-xs"></i>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="form-input !pl-14 pr-12 py-2.5 text-xs rounded-xl"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 transition-colors p-1 cursor-pointer flex items-center justify-center"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {/* Password Strength Indicator Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
                <span className={strength.textCol}>{strength.text}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 transition-all duration-300 ${matchedCriteriaCount >= 1 ? strength.color : 'bg-transparent'}`}></div>
                <div className={`h-full flex-1 transition-all duration-300 ${matchedCriteriaCount >= 2 ? strength.color : 'bg-transparent'}`}></div>
                <div className={`h-full flex-1 transition-all duration-300 ${matchedCriteriaCount >= 3 ? strength.color : 'bg-transparent'}`}></div>
                <div className={`h-full flex-1 transition-all duration-300 ${matchedCriteriaCount >= 4 ? strength.color : 'bg-transparent'}`}></div>
                <div className={`h-full flex-1 transition-all duration-300 ${matchedCriteriaCount === 5 ? strength.color : 'bg-transparent'}`}></div>
              </div>
            </div>

            {/* Checklist Box */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-2">Required Rules:</p>
              <ul className="space-y-1.5">
                <li className={`flex items-center gap-2 ${reqLength ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <i className={`fas ${reqLength ? 'fa-circle-check text-emerald-500' : 'fa-circle text-[8px]'}`}></i>
                  <span>At least 8 characters</span>
                </li>
                <li className={`flex items-center gap-2 ${reqUpper ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <i className={`fas ${reqUpper ? 'fa-circle-check text-emerald-500' : 'fa-circle text-[8px]'}`}></i>
                  <span>At least one uppercase letter (A-Z)</span>
                </li>
                <li className={`flex items-center gap-2 ${reqLower ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <i className={`fas ${reqLower ? 'fa-circle-check text-emerald-500' : 'fa-circle text-[8px]'}`}></i>
                  <span>At least one lowercase letter (a-z)</span>
                </li>
                <li className={`flex items-center gap-2 ${reqNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <i className={`fas ${reqNumber ? 'fa-circle-check text-emerald-500' : 'fa-circle text-[8px]'}`}></i>
                  <span>At least one number (0-9)</span>
                </li>
                <li className={`flex items-center gap-2 ${reqSpecial ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                  <i className={`fas ${reqSpecial ? 'fa-circle-check text-emerald-500' : 'fa-circle text-[8px]'}`}></i>
                  <span>At least one special character (@$!%*?&)</span>
                </li>
              </ul>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 text-xs tracking-wide cursor-pointer"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin text-sm"></i>
                  <span>Resetting Password...</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <i className="fas fa-key text-xs"></i>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-brand-500 transition-colors inline-flex items-center gap-1">
            Back to Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;
