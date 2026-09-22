import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const CompleteProfile = () => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { updateUserState, showToast } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!address || address.trim().length === 0) {
      setError('Residential address is required to proceed.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.put('/auth/profile', { address: address.trim() });
      if (res.data) {
        updateUserState({ address: address.trim(), isProfileComplete: true });
        showToast({
          title: 'Profile updated',
          message: 'Your profile updates have been saved successfully.',
          type: 'success'
        });
        navigate('/dashboard');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to update address.';
      setError(errMsg);
      showToast({
        title: 'Unable to save changes',
        message: 'Please try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-50 relative overflow-hidden dark:bg-slate-950">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0 100 C 20 0 50 0 100 100 Z" fill="#2E7D32"></path>
        </svg>
      </div>

      <div className="view-transition w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 relative z-10 border border-brand-500/10 dark:border-slate-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <i className="fas fa-user-edit text-white text-3xl"></i>
          </div>
          <h1 className="font-display font-bold text-2xl text-slate-800 dark:text-white">Complete Your Profile</h1>
          <p className="text-red-500 text-sm mt-2 font-semibold">Please complete your address to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase text-slate-400 pl-1">
              Residential Address <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="form-input resize-none"
              placeholder="Enter your full village/city address..."
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Saving...
              </>
            ) : (
              'Save & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;
