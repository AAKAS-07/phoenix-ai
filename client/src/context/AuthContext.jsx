import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const recentToastsRef = useRef([]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    showToast({
      title: 'Theme changed',
      message: `Switched to ${nextMode ? 'Dark' : 'Light'} mode.`,
      type: 'info',
      duration: 3500
    });
  };

  const removeToast = (id) => {
    setToasts(prev =>
      prev.map(t => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 320);
  };

  const showToast = (arg1, arg2 = 'success', arg3 = null, arg4 = 4000) => {
    let title = '';
    let message = '';
    let type = 'success';
    let duration = 4000;

    if (typeof arg1 === 'object' && arg1 !== null) {
      title = arg1.title || '';
      message = arg1.message || '';
      type = arg1.type || 'success';
      duration = arg1.duration || 4000;
    } else if (typeof arg1 === 'string') {
      if (arg3 && typeof arg3 === 'string') {
        // Form: showToast(title, type, message, duration)
        title = arg1;
        type = arg2 || 'success';
        message = arg3;
        duration = typeof arg4 === 'number' ? arg4 : 4000;
      } else {
        // Form: showToast(message, type, duration)
        type = arg2 || 'success';
        duration = typeof arg3 === 'number' ? arg3 : 4000;

        const rawText = arg1;
        if (rawText.toLowerCase().includes('login successful') || rawText.toLowerCase().includes('signed in')) {
          title = 'Signed in successfully';
          message = 'Welcome back to Phoenix AI.';
          type = 'success';
        } else if (rawText.toLowerCase().includes('login failed') || rawText.toLowerCase().includes('sign-in failed')) {
          title = 'Sign-in failed';
          message = 'Please check your credentials and try again.';
          type = 'error';
        } else if (rawText.toLowerCase().includes('logged out') || rawText.toLowerCase().includes('signed out')) {
          title = 'Signed out successfully';
          message = 'You have been safely logged out.';
          type = 'info';
        } else if (rawText.toLowerCase().includes('profile updated') || rawText.toLowerCase().includes('changes saved')) {
          title = 'Changes saved';
          message = 'Your updates have been saved successfully.';
          type = 'success';
        } else if (rawText.toLowerCase().includes('password updated')) {
          title = 'Password updated';
          message = 'Your password has been updated successfully.';
          type = 'success';
        } else {
          title = type === 'success' ? 'Success' : type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Notice';
          message = rawText;
        }
      }
    }

    if (!title && !message) return;

    // Deduplication check: avoid repeating exact duplicate toast within 1 second
    const now = Date.now();
    const isDuplicate = recentToastsRef.current.some(
      r => r.title === title && r.message === message && (now - r.time) < 1000
    );
    if (isDuplicate) return;

    recentToastsRef.current.push({ title, message, time: now });
    if (recentToastsRef.current.length > 10) {
      recentToastsRef.current.shift();
    }

    const id = 'toast_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    const newToast = {
      id,
      title,
      message,
      type,
      duration,
      createdAt: now,
      isExiting: false
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      if (updated.length > 5) {
        return updated.slice(updated.length - 5);
      }
      return updated;
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  };

  const showSuccessToast = (title, message, duration = 4000) => {
    showToast({ title, message, type: 'success', duration });
  };

  const showErrorToast = (title, message, duration = 4000) => {
    showToast({ title, message, type: 'error', duration });
  };

  const showWarningToast = (title, message, duration = 4000) => {
    showToast({ title, message, type: 'warning', duration });
  };

  const showInfoToast = (title, message, duration = 4000) => {
    showToast({ title, message, type: 'info', duration });
  };

  const showConfirm = (config) => {
    setConfirmModal({
      isOpen: true,
      ...config
    });
  };

  const closeConfirm = () => {
    setConfirmModal({ isOpen: false });
  };

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/user');
          if (res.data) {
            setUser(res.data);
            localStorage.setItem('user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.error('Session expired or invalid token');
          logout();
          showWarningToast('Session expired', 'Please sign in again to continue.');
        }
      }
      setLoading(false);
    };
    verifyUser();
  }, [token]);

  const loginUser = (data) => {
    setToken(data.token);
    setUser(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showInfoToast('Signed out successfully', 'You have been safely logged out.');
  };

  const updateUserState = (updatedUser) => {
    setUser(prev => {
      const newUser = { ...prev, ...updatedUser };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      loginUser,
      logout,
      updateUserState,
      showToast,
      showSuccessToast,
      showErrorToast,
      showWarningToast,
      showInfoToast,
      toasts,
      removeToast,
      confirmModal,
      showConfirm,
      closeConfirm,
      darkMode,
      toggleDarkMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
