import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Settings = () => {
  const navigate = useNavigate();
  const { user, updateUserState, logout, showToast, showConfirm } = useAuth();

  const [showModalOverlay, setShowModalOverlay] = useState(false);
  const [modalSection, setModalSection] = useState('profile');

  // Profile Form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone?.replace('+91', '') || '');
  const [address, setAddress] = useState(user?.address || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '/default-avatar.svg');
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileErrors, setProfileErrors] = useState({});

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Settings preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone ? user.phone.replace('+91', '') : '');
      setAddress(user.address || '');
      setAvatarPreview(user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || 'Farmer')}&background=2E7D32&color=fff`);
    }
  }, [user]);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFieldErrors({});
    setPasswordError('');
    setPasswordSuccess('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
  };

  // Real-time password requirement checks for Update Security Password
  const reqLength = newPassword.length >= 8;
  const reqUpper = /[A-Z]/.test(newPassword);
  const reqLower = /[a-z]/.test(newPassword);
  const reqNumber = /\d/.test(newPassword);
  const reqSpecial = /[@$!%*?&]/.test(newPassword);

  const matchedCriteriaCount = [reqLength, reqUpper, reqLower, reqNumber, reqSpecial].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (matchedCriteriaCount === 0) return { text: 'None', color: 'bg-slate-200 dark:bg-slate-700', textCol: 'text-slate-400' };
    if (matchedCriteriaCount <= 2) return { text: 'Weak', color: 'bg-rose-500', textCol: 'text-rose-500' };
    if (matchedCriteriaCount <= 4) return { text: 'Medium', color: 'bg-amber-500', textCol: 'text-amber-500' };
    return { text: 'Strong', color: 'bg-emerald-500', textCol: 'text-emerald-500' };
  };

  const strength = getStrengthLabel();

  const openDetailSection = (sectionName) => {
    setModalSection(sectionName);
    setProfileErrors({});
    resetPasswordForm();
    setShowModalOverlay(true);
  };

  const closeDetailSection = () => {
    setShowModalOverlay(false);
    resetPasswordForm();
  };

  const handleCancelModal = (section) => {
    const hasProfileChanges =
      firstName !== (user?.firstName || '') ||
      lastName !== (user?.lastName || '') ||
      phone !== (user?.phone?.replace('+91', '') || '') ||
      address !== (user?.address || '') ||
      avatarFile !== null;

    const hasPasswordChanges = currentPassword !== '' || newPassword !== '' || confirmNewPassword !== '';

    if ((section === 'profile' && hasProfileChanges) || (section === 'security' && hasPasswordChanges)) {
      showConfirm({
        title: 'Discard unsaved changes?',
        message: 'You have unsaved changes in this form. Are you sure you want to cancel?',
        confirmText: 'Discard Changes',
        cancelText: 'Keep Editing',
        type: 'warning',
        onConfirm: () => {
          closeDetailSection();
          showToast({
            title: 'Action cancelled',
            message: 'No changes were applied.',
            type: 'info'
          });
        }
      });
    } else {
      closeDetailSection();
      showToast({
        title: 'Action cancelled',
        message: 'No changes were applied.',
        type: 'info'
      });
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const validateProfileForm = () => {
    const errors = {};
    if (!firstName || !firstName.trim()) {
      errors.firstName = 'First name is required.';
    }
    if (!phone || !phone.trim()) {
      errors.phone = 'Phone number is required.';
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!validateProfileForm()) {
      showToast({
        title: 'Unable to save changes',
        message: 'Please check required fields and try again.',
        type: 'error'
      });
      return;
    }

    setUpdatingProfile(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('phone', phone.trim());
      formData.append('address', address.trim());
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const res = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        updateUserState({
          firstName: res.data.firstName,
          lastName: res.data.lastName,
          phone: res.data.phone,
          address: res.data.address,
          avatar: res.data.avatar,
          isProfileComplete: res.data.isProfileComplete
        });
        showToast({
          title: 'Changes saved',
          message: 'Your updates have been saved successfully.',
          type: 'success'
        });
        closeDetailSection();
      }
    } catch (err) {
      showToast({
        title: 'Unable to save changes',
        message: 'Please try again.',
        type: 'error'
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    setPasswordError('');

    // 1. Check Current Password
    if (!currentPassword || !currentPassword.trim()) {
      errors.currentPassword = 'Current password is required.';
      setPasswordError('Current password is required.');
      setFieldErrors(errors);
      return false;
    }

    // 2. Check New Password & Password Requirements
    if (!newPassword || !newPassword.trim() || !reqLength || !reqUpper || !reqLower || !reqNumber || !reqSpecial) {
      errors.newPassword = 'Please meet all password requirements.';
      setPasswordError('Please meet all password requirements.');
      setFieldErrors(errors);
      return false;
    }

    if (newPassword === currentPassword) {
      errors.newPassword = 'New password must not be the same as current password.';
      setPasswordError('New password must not be the same as current password.');
      setFieldErrors(errors);
      return false;
    }

    // 3. Check Confirm Password & Password Match
    if (!confirmNewPassword || !confirmNewPassword.trim() || newPassword !== confirmNewPassword) {
      errors.confirmNewPassword = 'Passwords do not match.';
      setPasswordError('Passwords do not match.');
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!validatePasswordForm()) {
      showToast({
        title: 'Password update failed',
        message: passwordError || 'Please check your details and try again.',
        type: 'error'
      });
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword: confirmNewPassword
      });

      if (res.data && res.data.success) {
        setPasswordSuccess('Password updated successfully!');
        showToast({
          title: 'Password updated',
          message: 'Your password has been changed successfully.',
          type: 'success'
        });
        setTimeout(() => {
          closeDetailSection();
        }, 1200);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Please check your details and try again.';
      setPasswordError(errMsg);
      showToast({
        title: 'Password update failed',
        message: errMsg,
        type: 'error'
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleToggleEmailNotifications = () => {
    const nextVal = !emailNotifications;
    setEmailNotifications(nextVal);
    showToast({
      title: 'Preferences updated',
      message: `Email notification preference changed. (${nextVal ? 'Enabled' : 'Disabled'})`,
      type: 'info'
    });
  };

  const handleLanguageChange = (e) => {
    const val = e.target.value;
    setPreferredLanguage(val);
    const langNames = { en: 'English', hi: 'Hindi', ta: 'Tamil' };
    showToast({
      title: 'Preferences updated',
      message: `Application language changed to ${langNames[val] || val}.`,
      type: 'info'
    });
  };

  const handleResetSettings = () => {
    showConfirm({
      title: 'Reset all settings?',
      message: 'This will restore all application preferences and settings to default values.',
      confirmText: 'Reset Settings',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: () => {
        setEmailNotifications(true);
        setPreferredLanguage('en');
        showToast({
          title: 'Settings reset',
          message: 'All settings have been restored to defaults.',
          type: 'info'
        });
      }
    });
  };

  const handleDeleteCachedData = () => {
    showConfirm({
      title: 'Delete offline cached data?',
      message: 'Are you sure you want to delete stored field history and offline data? This action cannot be undone.',
      confirmText: 'Delete Data',
      cancelText: 'Keep Data',
      type: 'danger',
      onConfirm: async () => {
        try {
          localStorage.removeItem('advisoryHistory');
          localStorage.removeItem('cachedMandi');
          showToast({
            title: 'Deleted successfully',
            message: 'The selected item has been removed.',
            type: 'success'
          });
        } catch (err) {
          showToast({
            title: 'Delete failed',
            message: 'The item could not be deleted. Please try again.',
            type: 'error'
          });
        }
      }
    });
  };

  const handleSignOutConfirm = () => {
    showConfirm({
      title: 'Sign out of Phoenix AI?',
      message: 'You will need to sign back in to access your field data and crop advisory.',
      confirmText: 'Sign Out',
      cancelText: 'Stay Signed In',
      type: 'warning',
      onConfirm: () => {
        logout();
      }
    });
  };

  return (
    <div className="view-transition max-w-5xl mx-auto space-y-6">

      {/* 1. Settings Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-brand-accent rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-lg shrink-0">
            <i className="fas fa-sliders text-2xl text-emerald-100"></i>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
              Settings
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Keep your account secure and personalize your Phoenix AI experience.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/15 border border-white/20 text-xs font-bold text-white backdrop-blur-md z-10">
          <i className="fas fa-user-shield text-brand-accent"></i> Account Verified
        </div>
      </div>

      {/* 2. Settings Single-Column Wide Cards Section */}
      <div className="space-y-4">

        {/* Card 1: Profile Information */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-start sm:items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src={avatarPreview}
                  alt="Profile Avatar"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-brand-500 shadow-sm"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                    Profile Information
                  </h3>
                  <span className="text-[10px] font-extrabold text-brand-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Personal
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Update your personal details and profile photo.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <span><strong>Name:</strong> {user?.firstName} {user?.lastName || ''}</span>
                  <span><strong>Phone:</strong> {user?.phone || 'Not provided'}</span>
                  <span><strong>Address:</strong> {user?.address || 'Not provided'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openDetailSection('profile')}
              className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-brand-500 hover:text-white text-brand-600 dark:text-brand-accent font-bold rounded-2xl text-xs transition-all border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <i className="fas fa-pen-to-square text-xs"></i>
              <span>Edit Details</span>
            </button>

          </div>
        </div>

        {/* Card 2: Security & Password */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-amber-200 dark:border-amber-800/50">
                <i className="fas fa-shield-halved"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                  Security & Password
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Manage your password and keep your account safe.
                </p>
              </div>
            </div>

            <button
              onClick={() => openDetailSection('security')}
              className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-bold rounded-2xl text-xs transition-all border border-amber-200 dark:border-amber-800/50 flex items-center justify-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <i className="fas fa-key text-xs"></i>
              <span>Update Password</span>
            </button>

          </div>
        </div>

        {/* Card 3: Account Details */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-indigo-200 dark:border-indigo-800/50">
                <i className="fas fa-id-card"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                  Account Details
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  View your registered information and membership status.
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
                  Email: <span className="font-semibold text-slate-800 dark:text-white">{user?.email}</span> | Plan: <span className="font-semibold text-emerald-600">Verified Farmer Member</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => openDetailSection('account')}
              className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-500 hover:text-white text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-xs transition-all border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center gap-2 shrink-0 self-start sm:self-center cursor-pointer"
            >
              <i className="fas fa-eye text-xs"></i>
              <span>View Details</span>
            </button>

          </div>
        </div>

        {/* Card 4: Notifications */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-sky-200 dark:border-sky-800/50">
                <i className="fas fa-bell"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                  Notifications
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Manage your email notifications and weather alerts.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={handleToggleEmailNotifications}
                className="sr-only peer"
              />
              <div className="w-12 h-6.5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500 shadow-inner"></div>
            </label>

          </div>
        </div>


        {/* Card 6: Preferences & Maintenance */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-emerald-200 dark:border-emerald-800/50">
                <i className="fas fa-sliders"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                  Preferences & Maintenance
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Customize application language or reset settings.
                </p>
              </div>
            </div>

            {/* Embedded Control Box inside Card */}
            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/60 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-2 shrink-0 shadow-xs sm:min-w-[210px]">
              <div className="w-full">
                <select
                  value={preferredLanguage}
                  onChange={handleLanguageChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-white text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-rotate-left text-[11px]"></i>
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleDeleteCachedData}
                  className="flex-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 font-bold rounded-xl text-xs transition-all border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-trash-can text-[11px]"></i>
                  <span>Clear</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Card 6.5: Trash */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-slate-100 dark:border-slate-800 transition-all hover:shadow-md">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-amber-200 dark:border-amber-800/50">
                <i className="fas fa-trash-can"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-800 dark:text-white text-base">
                  Trash
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  View and manage deleted crop advisories.
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate('/trash')}
              className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-500 hover:text-white text-amber-600 dark:text-amber-400 font-bold rounded-2xl text-xs transition-all border border-amber-200 dark:border-amber-900/50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <i className="fas fa-trash-arrow-up text-xs"></i>
              <span>Open Trash</span>
            </button>

          </div>
        </div>

        {/* Card 7: Session Sign Out */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs border border-rose-100 dark:border-rose-950/60 transition-all hover:shadow-md">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center text-xl shrink-0 shadow-xs border border-rose-200 dark:border-rose-800/50">
                <i className="fas fa-sign-out-alt"></i>
              </div>
              <div>
                <h3 className="font-display font-extrabold text-rose-600 dark:text-rose-400 text-base">
                  Sign Out
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  Log out of your active Phoenix AI session on this device.
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOutConfirm}
              className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 font-bold rounded-2xl text-xs transition-all border border-rose-200 dark:border-rose-900/50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <i className="fas fa-sign-out-alt text-xs"></i>
              <span>Logout</span>
            </button>

          </div>
        </div>

      </div>

      {/* Detail Overlay Modals */}
      {showModalOverlay && (
        <div
          onClick={() => handleCancelModal(modalSection)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/65 backdrop-blur-md p-4 sm:p-6 transition-all duration-300 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl p-6 sm:p-8 animate-scale-up cursor-default space-y-6"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-brand-500 flex items-center justify-center text-lg shrink-0 border border-emerald-200 dark:border-emerald-800/50 shadow-xs">
                  <i className={`fas ${modalSection === 'profile' ? 'fa-pen-to-square' : modalSection === 'security' ? 'fa-key' : 'fa-id-card'}`}></i>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-extrabold text-slate-800 dark:text-white tracking-tight">
                    {modalSection === 'profile' ? 'Edit Profile Details' : modalSection === 'security' ? 'Update Security Password' : 'Account Overview'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Phoenix AI System Settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCancelModal(modalSection)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Redesigned Edit Profile Details Form */}
            {modalSection === 'profile' && (
              <form onSubmit={handleProfileSave} noValidate className="space-y-6">

                {/* Avatar / Profile Picture Upload Section */}
                <div className="flex flex-col items-center justify-center my-2">
                  <div className="relative group cursor-pointer">
                    <img
                      src={avatarPreview}
                      className="w-24 h-24 sm:w-26 sm:h-26 rounded-2xl object-cover border-4 border-brand-500 shadow-md transition-transform duration-300 group-hover:scale-105"
                      alt="Profile Avatar Preview"
                    />
                    <label
                      htmlFor="profile-photo-input"
                      title="Change Profile Photo"
                      className="absolute -bottom-1.5 -right-1.5 w-8.5 h-8.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg border-2 border-white dark:border-slate-900 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <i className="fas fa-camera text-xs"></i>
                    </label>
                  </div>
                  <input
                    type="file"
                    id="profile-photo-input"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2.5 text-center">
                    Click camera icon to upload a new profile photo
                  </span>
                </div>

                {/* Form Fields: 2-Column Grid on Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                  {/* First Name */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                        <i className="fas fa-user"></i>
                      </span>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value);
                          if (profileErrors.firstName) {
                            setProfileErrors(prev => ({ ...prev, firstName: '' }));
                          }
                        }}
                        placeholder="First Name"
                        className={`w-full h-13 sm:h-14 pl-11 pr-4 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border outline-none transition-all ${
                          profileErrors.firstName
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700/80 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15'
                        }`}
                      />
                    </div>
                    {profileErrors.firstName && (
                      <p className="text-[11px] font-semibold text-rose-500 pl-1 flex items-center gap-1 mt-1">
                        <i className="fas fa-circle-exclamation text-[10px]"></i>
                        <span>{profileErrors.firstName}</span>
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      Last Name
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                        <i className="fas fa-user"></i>
                      </span>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full h-13 sm:h-14 pl-11 pr-4 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/80 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15 transition-all"
                      />
                    </div>
                  </div>

                  {/* Phone Number with +91 Prefix Badge */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative w-full flex items-center">
                      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold text-xs pointer-events-none z-10 pr-2 border-r border-slate-200 dark:border-slate-700">
                        <i className="fas fa-phone text-xs text-slate-400 group-focus-within:text-brand-500 transition-colors"></i>
                        <span>+91</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (profileErrors.phone) {
                            setProfileErrors(prev => ({ ...prev, phone: '' }));
                          }
                        }}
                        placeholder="Phone Number"
                        className={`w-full h-13 sm:h-14 pl-20 pr-4 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border outline-none transition-all ${
                          profileErrors.phone
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700/80 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15'
                        }`}
                      />
                    </div>
                    {profileErrors.phone && (
                      <p className="text-[11px] font-semibold text-rose-500 pl-1 flex items-center gap-1 mt-1">
                        <i className="fas fa-circle-exclamation text-[10px]"></i>
                        <span>{profileErrors.phone}</span>
                      </p>
                    )}
                  </div>

                  {/* Residential Address */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      Residential Address
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                        <i className="fas fa-house"></i>
                      </span>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Residential Address"
                        className="w-full h-13 sm:h-14 pl-11 pr-4 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700/80 outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15 transition-all"
                      />
                    </div>
                  </div>

                </div>

                {/* Footer Buttons */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleCancelModal('profile')}
                    className="w-full sm:w-auto px-6 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full sm:w-auto px-7 h-12 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
                  >
                    {updatingProfile ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save text-xs"></i>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

            {/* Redesigned Update Security Password Form */}
            {modalSection === 'security' && (
              <form onSubmit={handleChangePassword} noValidate className="space-y-5">

                {/* General Alerts */}
                {passwordError && (
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2.5 animate-shake">
                    <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2.5">
                    <i className="fas fa-circle-check text-sm shrink-0"></i>
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                {/* 1. Current Password Field (Full Width, 48-54px Height) */}
                <div className="space-y-1.5 group">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                    Current Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative w-full flex items-center">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                      <i className="fas fa-lock"></i>
                    </span>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => {
                        setCurrentPassword(e.target.value);
                        if (fieldErrors.currentPassword) {
                          setFieldErrors(prev => ({ ...prev, currentPassword: '' }));
                        }
                      }}
                      placeholder="Enter current password"
                      className={`w-full h-13 sm:h-14 pl-11 pr-12 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border outline-none transition-all ${
                        fieldErrors.currentPassword
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                          : 'border-slate-200 dark:border-slate-700/80 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 dark:hover:text-brand-accent transition-colors focus:outline-none z-10 cursor-pointer"
                    >
                      <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                    </button>
                  </div>
                  {fieldErrors.currentPassword && (
                    <p className="text-[11px] font-semibold text-rose-500 pl-1 flex items-center gap-1 mt-1">
                      <i className="fas fa-circle-exclamation text-[10px]"></i>
                      <span>{fieldErrors.currentPassword}</span>
                    </p>
                  )}
                </div>

                {/* 2. New Password & Confirm Password (2 Equal-Width Columns on Desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">

                  {/* New Password */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                        <i className="fas fa-key"></i>
                      </span>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (fieldErrors.newPassword) {
                            setFieldErrors(prev => ({ ...prev, newPassword: '' }));
                          }
                        }}
                        placeholder="Enter new password"
                        className={`w-full h-13 sm:h-14 pl-11 pr-12 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border outline-none transition-all ${
                          fieldErrors.newPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700/80 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        tabIndex={-1}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 dark:hover:text-brand-accent transition-colors focus:outline-none z-10 cursor-pointer"
                      >
                        <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                      </button>
                    </div>
                    {fieldErrors.newPassword && (
                      <p className="text-[11px] font-semibold text-rose-500 pl-1 flex items-center gap-1 mt-1">
                        <i className="fas fa-circle-exclamation text-[10px]"></i>
                        <span>{fieldErrors.newPassword}</span>
                      </p>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5 group">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 pl-0.5">
                      Confirm New Password <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative w-full flex items-center">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors pointer-events-none z-10 text-sm">
                        <i className="fas fa-shield-check text-brand-500"></i>
                      </span>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => {
                          setConfirmNewPassword(e.target.value);
                          if (fieldErrors.confirmNewPassword) {
                            setFieldErrors(prev => ({ ...prev, confirmNewPassword: '' }));
                          }
                        }}
                        placeholder="Confirm new password"
                        className={`w-full h-13 sm:h-14 pl-11 pr-12 text-xs sm:text-sm font-semibold rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-white border outline-none transition-all ${
                          fieldErrors.confirmNewPassword
                            ? 'border-rose-500 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : 'border-slate-200 dark:border-slate-700/80 focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-brand-500/15'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                        tabIndex={-1}
                        aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-brand-500 dark:hover:text-brand-accent transition-colors focus:outline-none z-10 cursor-pointer"
                      >
                        <i className={`fas ${showConfirmNewPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                      </button>
                    </div>
                    {fieldErrors.confirmNewPassword && (
                      <p className="text-[11px] font-semibold text-rose-500 pl-1 flex items-center gap-1 mt-1">
                        <i className="fas fa-circle-exclamation text-[10px]"></i>
                        <span>{fieldErrors.confirmNewPassword}</span>
                      </p>
                    )}
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
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Required Rules:</p>
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

                {/* Footer Actions */}
                <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => handleCancelModal('security')}
                    className="w-full sm:w-auto px-6 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full sm:w-auto px-7 h-12 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 text-white text-xs font-bold shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 tracking-wide cursor-pointer"
                  >
                    {changingPassword ? (
                      <>
                        <i className="fas fa-spinner fa-spin text-sm"></i>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-key text-xs"></i>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            )}

            {/* Account Details View */}
            {modalSection === 'account' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Registered Email</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{user?.email}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Phone Number</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">{user?.phone || 'Not provided'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Member Since</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Jan 2024'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Membership Status</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">Verified Farmer Member</p>
                  </div>
                </div>

                <div className="pt-3 flex justify-end border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={closeDetailSection}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;
