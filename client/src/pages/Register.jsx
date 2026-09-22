import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import AuthLayout from '../components/AuthLayout';

const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState({});

  const { showToast } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, id, value, type, checked } = e.target;
    const fieldName = name || id;

    setFormData(prev => ({
      ...prev,
      [fieldName === 'agreeTerms' || type === 'checkbox' ? 'agreeTerms' : fieldName]: type === 'checkbox' ? checked : value
    }));

    if (error) setError('');
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  // Password validation rules
  const pass = formData.password;
  const reqLength = pass.length >= 8;
  const reqUpper = /[A-Z]/.test(pass);
  const reqLower = /[a-z]/.test(pass);
  const reqNumber = /\d/.test(pass);
  const reqSpecial = /[@$!%*?&#]/.test(pass);

  // Calculate password strength score
  const strengthScore = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;

  const getStrengthText = () => {
    if (!pass) return { text: '', color: 'bg-slate-200' };
    if (strengthScore <= 2) return { text: 'Weak', color: 'bg-rose-500', textCol: 'text-rose-500' };
    if (strengthScore <= 4) return { text: 'Good', color: 'bg-amber-500', textCol: 'text-amber-500' };
    return { text: 'Strong', color: 'bg-brand-500', textCol: 'text-brand-500' };
  };

  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordMismatch = formData.confirmPassword && formData.password !== formData.confirmPassword;

  const isPhoneInvalid = touched.phone && formData.phone && !/^\d{10}$/.test(formData.phone.trim());
  const isEmailInvalid = touched.email && formData.email && !/\S+@\S+\.\S+/.test(formData.email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
      agreeTerms: true
    });

    if (!formData.firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Please enter your last name.');
      return;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!reqLength || !reqUpper || !reqLower || !reqNumber || !reqSpecial) {
      setError('Password must be 8+ chars with uppercase, lowercase, number & special char.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.agreeTerms) {
      setError('You must agree to the Terms of Service & Privacy Policy.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.post('/auth/register', {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gender: 'Male', // Preserved for backend API contract compatibility
        password: formData.password
      });

      if (res.data && (res.data.success || res.data.token)) {
        showToast({
          title: 'Account created successfully',
          message: 'Welcome to Phoenix AI! Please sign in to continue.',
          type: 'success'
        });
        navigate('/login');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Unable to create your account. Please try again.';
      setError(errMsg);
      showToast({
        title: 'Registration failed',
        message: 'Please check your inputs and try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const strengthInfo = getStrengthText();

  return (
    <AuthLayout pageType="register">
      <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] p-4 sm:p-6 shadow-xl border border-slate-100 dark:border-slate-800 relative z-10 view-transition">

        {/* Phoenix AI Branding & Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 group cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-accent p-0.5 shadow-sm shadow-brand-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[0.4rem] flex items-center justify-center">
                  <i className="fas fa-wheat-awn text-brand-500 text-sm group-hover:rotate-12 transition-transform"></i>
                </div>
              </div>
              <span className="font-display font-extrabold text-lg text-slate-800 dark:text-white">
                Phoenix <span className="text-brand-500">AI</span>
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
              Smart Agriculture
            </span>
          </div>

          <h1 className="font-display font-extrabold text-xl text-slate-800 dark:text-white tracking-tight mt-2">
            Create Your Account
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
            Join thousands of smart farmers using AI crop advisory.
          </p>
        </div>

        {/* Server Error Alert */}
        {error && (
          <div className="mb-2.5 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-shake">
            <i className="fas fa-circle-exclamation text-xs shrink-0"></i>
            <span className="flex-1 leading-tight">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3" noValidate>

          {/* Row 1: First Name & Last Name (Side by Side on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors">
                FIRST NAME <span className="text-rose-500">*</span>
              </label>
              <div className="input-wrapper">
                <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-xs">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('firstName')}
                  placeholder="Enter first name"
                  className="form-input text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors">
                LAST NAME <span className="text-rose-500">*</span>
              </label>
              <div className="input-wrapper">
                <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-xs">
                  <i className="fas fa-user"></i>
                </span>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('lastName')}
                  placeholder="Enter last name"
                  className="form-input text-xs rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Email Address & Mobile Number (+91) (Side by Side on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors">
                EMAIL ADDRESS <span className="text-rose-500">*</span>
              </label>
              <div className="input-wrapper">
                <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-xs">
                  <i className="fas fa-envelope"></i>
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('email')}
                  placeholder="farmer@example.com"
                  className={`form-input text-xs rounded-xl ${isEmailInvalid ? 'border-rose-400 focus:border-rose-500' : ''}`}
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors">
                MOBILE NUMBER <span className="text-rose-500">*</span>
              </label>
              <div className={`flex rounded-xl overflow-hidden border transition-all h-[2.75rem] ${
                isPhoneInvalid
                  ? 'border-rose-400 ring-2 ring-rose-500/10'
                  : 'border-slate-200 dark:border-slate-700 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10'
              } bg-slate-50 dark:bg-slate-800/80`}>
                <div className="flex items-center gap-1 px-2.5 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-700 dark:text-slate-200 shrink-0 select-none">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('phone')}
                  placeholder="9876543210"
                  className="w-full h-full px-2.5 bg-transparent text-xs outline-none text-slate-800 dark:text-white placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Password & Confirm Password (Clean Side by Side Alignment on Desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Password Field */}
            <div className="space-y-1.5 group">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-0.5 group-focus-within:text-brand-500 transition-colors block h-[16px] leading-[16px]">
                PASSWORD <span className="text-rose-500">*</span>
              </label>
              <div className="input-wrapper has-right-icon">
                <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-xs">
                  <i className="fas fa-lock"></i>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('password')}
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

            {/* Confirm Password Field */}
            <div className="space-y-1.5 group">
              <div className="flex justify-between items-center px-0.5 h-[16px] leading-[16px]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-focus-within:text-brand-500 transition-colors">
                  CONFIRM PASSWORD <span className="text-rose-500">*</span>
                </label>
                {passwordsMatch && (
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <i className="fas fa-check-circle"></i> Match
                  </span>
                )}
              </div>
              <div className="input-wrapper has-right-icon">
                <span className="left-icon text-slate-400 group-focus-within:text-brand-500 transition-colors text-xs">
                  <i className="fas fa-shield-halved"></i>
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  placeholder="Confirm your password"
                  className={`form-input text-xs rounded-xl ${passwordMismatch ? 'border-rose-400 focus:border-rose-500' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="right-icon text-slate-400 hover:text-brand-500 transition-all focus:outline-none"
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs transition-transform duration-200 ${showConfirmPassword ? 'scale-110' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>

          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-slate-500 dark:text-slate-400">Password Strength</span>
                <span className={strengthInfo.textCol}>{strengthInfo.text}</span>
              </div>
              <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 transition-all ${strengthScore >= 1 ? strengthInfo.color : 'opacity-20 bg-slate-300'}`}></div>
                <div className={`h-full flex-1 transition-all ${strengthScore >= 3 ? strengthInfo.color : 'opacity-20 bg-slate-300'}`}></div>
                <div className={`h-full flex-1 transition-all ${strengthScore >= 4 ? strengthInfo.color : 'opacity-20 bg-slate-300'}`}></div>
                <div className={`h-full flex-1 transition-all ${strengthScore >= 5 ? strengthInfo.color : 'opacity-20 bg-slate-300'}`}></div>
              </div>
            </div>
          )}

          {/* Terms & Conditions Checkbox */}
          <div className="pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 accent-brand-500 shrink-0 transition-transform group-hover:scale-105"
              />
              <span className="text-[10px] text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                I agree to the{' '}
                <a href="#" onClick={(e) => e.preventDefault()} className="text-brand-500 font-bold hover:underline">
                  Terms of Service & Privacy Policy
                </a>.
              </span>
            </label>
          </div>

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white font-bold rounded-xl shadow-md shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-xs group animate-shimmer"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin text-xs"></i>
                <span>Creating Your Account...</span>
              </>
            ) : (
              <>
                <i className="fas fa-leaf text-brand-accent text-xs group-hover:rotate-12 transition-transform"></i>
                <span>Create Account</span>
                <i className="fas fa-arrow-right text-[10px] group-hover:translate-x-0.5 transition-transform"></i>
              </>
            )}
          </button>
        </form>

        {/* Redirect Footer */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-500 font-bold hover:underline inline-flex items-center gap-1 group">
              Sign in <i className="fas fa-chevron-right text-[9px] group-hover:translate-x-0.5 transition-transform"></i>
            </Link>
          </p>
        </div>

      </div>
    </AuthLayout>
  );
};

export default Register;
