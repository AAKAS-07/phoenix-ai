import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { loginUser, showToast } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/auth/login', { email: email.trim(), password });
      if (res.data && res.data.token) {
        loginUser(res.data);
        showToast({
          title: 'Signed in successfully',
          message: 'Welcome back to Phoenix AI.',
          type: 'success'
        });
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Please check your credentials and try again.';
      setError(errMsg);
      showToast({
        title: 'Sign-in failed',
        message: 'Please check your credentials and try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout pageType="login">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-xl border border-slate-100 dark:border-slate-800 relative z-10 view-transition">

        {/* Phoenix AI Logo Header & Title */}
        <div className="mb-6 text-left">
          <div className="inline-flex items-center gap-3 mb-4 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-accent p-0.5 shadow-md shadow-brand-500/20 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[0.6rem] flex items-center justify-center">
                <i className="fas fa-wheat-awn text-brand-500 text-lg group-hover:rotate-12 transition-transform"></i>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-display font-extrabold text-xl tracking-tight text-slate-800 dark:text-white leading-none">
                Phoenix <span className="text-brand-500">AI</span>
              </span>
              <span className="block text-[9px] uppercase tracking-widest font-bold text-slate-400 mt-1 leading-none">
                Smart Agriculture
              </span>
            </div>
          </div>

          <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white tracking-tight">
            Welcome Back
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
            Access your AI crop intelligence & real-time Mandi dashboard.
          </p>
        </div>

        {/* Server Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>

          {/* Email Address Input Wrapper */}
          <div className="space-y-1.5 group">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors">
              EMAIL ADDRESS <span className="text-rose-500">*</span>
            </label>
            <div className="input-wrapper">
              <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-sm">
                <i className="fas fa-envelope"></i>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="form-input text-xs rounded-xl"
              />
            </div>
          </div>

          {/* Password Field Input Wrapper */}
          <div className="space-y-1.5 group">
            <div className="flex justify-between items-center px-0.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-focus-within:text-brand-500 transition-colors">
                PASSWORD <span className="text-rose-500">*</span>
              </label>
              <Link to="/forgot-password" className="text-[11px] font-bold text-brand-500 hover:text-brand-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <div className="input-wrapper has-right-icon">
              <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-sm">
                <i className="fas fa-lock"></i>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="form-input text-xs rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="right-icon text-slate-400 hover:text-brand-500 transition-all focus:outline-none"
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs transition-transform duration-200 ${showPassword ? 'scale-110' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500 accent-brand-500 shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                Remember me on this device
              </span>
            </label>
          </div>

          {/* Green Sign In Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2.5 text-xs tracking-wide group animate-shimmer"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-sm"></i>
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <i className="fas fa-leaf text-brand-accent text-sm group-hover:rotate-12 transition-transform"></i>
                <span>Sign In</span>
                <i className="fas fa-arrow-right text-xs ml-0.5 group-hover:translate-x-1 transition-transform"></i>
              </>
            )}
          </button>
        </form>

        {/* Redirect Footer Link */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-500 font-bold hover:underline inline-flex items-center gap-1 group">
              Create Account <i className="fas fa-chevron-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
            </Link>
          </p>
        </div>

      </div>
    </AuthLayout>
  );
};

export default Login;
