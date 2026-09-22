import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user, token, showToast } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const knownNotificationIds = useRef(new Set());
  const initialFetchDone = useRef(false);

  const fetchNotifications = useCallback(async (selectedFilter = filterType, silent = false) => {
    if (!token || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    if (!silent && !initialFetchDone.current) {
      setLoading(true);
    }

    try {
      const url = selectedFilter && selectedFilter !== 'all'
        ? `/notifications?type=${selectedFilter}`
        : '/notifications';

      const res = await api.get(url);
      if (res.data && res.data.success) {
        const fetched = res.data.notifications || [];
        const count = typeof res.data.unreadCount === 'number' ? res.data.unreadCount : 0;

        // Check for new unread notifications to trigger toast alert
        if (initialFetchDone.current) {
          fetched.forEach((notif) => {
            if (!notif.isRead && !knownNotificationIds.current.has(notif._id)) {
              if (showToast) {
                showToast({
                  title: notif.title,
                  message: notif.message,
                  type: 'info',
                  duration: 5000
                });
              }
            }
          });
        }

        // Update known IDs
        const newSet = new Set();
        fetched.forEach((n) => newSet.add(n._id));
        knownNotificationIds.current = newSet;

        setNotifications(fetched);
        setUnreadCount(count);
        initialFetchDone.current = true;
      }
    } catch (err) {
      console.error('Error in fetchNotifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user, filterType, showToast]);

  // Initial fetch and 30-second polling
  useEffect(() => {
    if (!token || !user) {
      initialFetchDone.current = false;
      return;
    }

    fetchNotifications(filterType, false);

    const interval = setInterval(() => {
      fetchNotifications(filterType, true);
    }, 30000);

    return () => clearInterval(interval);
  }, [token, user, filterType, fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic state update
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      const res = await api.put(`/notifications/${id}/read`);
      if (res.data && res.data.success) {
        if (typeof res.data.unreadCount === 'number') {
          setUnreadCount(res.data.unreadCount);
        }
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await api.put('/notifications/read-all');
    } catch (err) {
      console.error('Error marking all read:', err);
    }
  };

  const deleteSingleNotification = async (id) => {
    try {
      setNotifications(prev => prev.filter(n => n._id !== id));
      const target = notifications.find(n => n._id === id);
      if (target && !target.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  // Helper function for relative timestamp formatting
  const getRelativeTime = (dateInput) => {
    if (!dateInput) return '';
    try {
      const date = new Date(dateInput);
      const now = new Date();
      const diffMs = now - date;
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return String(dateInput);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    filterType,
    setFilterType,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteSingleNotification,
    getRelativeTime
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
