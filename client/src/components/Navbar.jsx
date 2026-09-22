import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';

const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const {
    notifications,
    unreadCount,
    filterType,
    setFilterType,
    markAsRead,
    markAllAsRead,
    getRelativeTime
  } = useNotifications();

  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notificationRef = useRef(null);
  const accountRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setShowAccountDropdown(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
        setShowAccountDropdown(false);
      }
    };

    if (showNotifications || showAccountDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showAccountDropdown]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    if (q.includes('crop') || q.includes('price') || q.includes('mandi')) {
      navigate('/prices');
    } else if (q.includes('news') || q.includes('scheme') || q.includes('market')) {
      navigate('/news');
    } else if (q.includes('advisory') || q.includes('pest') || q.includes('soil')) {
      navigate('/advisory');
    } else {
      navigate('/dashboard');
    }
  };

  const getCategoryIcon = (type) => {
    switch (type) {
      case 'advisory':
        return { icon: 'fa-seedling', color: 'text-[#166534] bg-[#DCFCE7]' };
      case 'price':
        return { icon: 'fa-tags', color: 'text-[#F59E0B] bg-[#FEF3C7]' };
      case 'news':
        return { icon: 'fa-newspaper', color: 'text-[#2563EB] bg-[#DBEAFE]' };
      default:
        return { icon: 'fa-bell', color: 'text-[#166534] bg-[#DCFCE7]' };
    }
  };

  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || 'Farmer')}&background=166534&color=fff`;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">

      {/* Left: Mobile Toggle & Rounded Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-[#F8FAFC] text-[#166534] hover:bg-[#F0FDF4] border border-[#E2E8F0] transition-colors cursor-pointer"
          aria-label="Toggle Navigation Menu"
        >
          <i className="fas fa-bars text-base"></i>
        </button>

        {/* Global Search Field */}
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-md hidden sm:block">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B] text-sm pointer-events-none">
            <i className="fas fa-magnifying-glass"></i>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crops, markets, or advisories..."
            className="w-full h-10 pl-9 pr-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-full text-xs font-medium text-[#17231C] placeholder-[#64748B] focus:bg-white focus:border-[#22C55E] focus:ring-2 focus:ring-[#22C55E]/15 outline-none transition-all"
          />
        </form>
      </div>

      {/* Right Header Actions */}
      <div className="flex items-center gap-3">

        {/* Notification Bell Dropdown */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => {
              setShowNotifications(prev => !prev);
              setShowAccountDropdown(false);
            }}
            className="relative w-10 h-10 flex items-center justify-center rounded-full bg-[#F8FAFC] text-[#166534] hover:bg-[#F0FDF4] border border-[#E2E8F0] transition-all focus:outline-none cursor-pointer"
            aria-label="Notifications"
          >
            <i className="fas fa-bell text-base"></i>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 bg-[#16A34A] text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Panel Dropdown */}
          {showNotifications && (
            <div className="dropdown-open absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50 animate-scale-up origin-top-right">

              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#166534] text-xs uppercase tracking-wider">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534]">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-[#166534] font-bold hover:underline cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Category Tabs */}
              <div className="px-3 py-2 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'advisory', label: '🌱 Advisory' },
                  { id: 'price', label: '💰 Prices' },
                  { id: 'news', label: '📰 News' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-3 py-1 rounded-full shrink-0 transition-all cursor-pointer ${
                      filterType === tab.id
                        ? 'bg-[#166534] text-white'
                        : 'text-[#64748B] hover:bg-[#E2E8F0]/60'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#E2E8F0]">
                {notifications.length > 0 ? (
                  notifications.map((item) => {
                    const visual = getCategoryIcon(item.type);
                    return (
                      <div
                        key={item._id}
                        onClick={() => {
                          if (!item.isRead) markAsRead(item._id);
                          setShowNotifications(false);
                          if (item.relatedRoute) navigate(item.relatedRoute);
                        }}
                        className={`p-3.5 hover:bg-[#F8FAFC] transition-colors flex items-start gap-3 cursor-pointer ${
                          !item.isRead ? 'bg-[#F0FDF4]/60' : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl ${visual.color} flex items-center justify-center shrink-0 mt-0.5 text-xs`}>
                          <i className={`fas ${visual.icon}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center gap-1">
                            <p className={`text-xs truncate ${!item.isRead ? 'font-extrabold text-[#17231C]' : 'font-semibold text-[#64748B]'}`}>
                              {item.title}
                            </p>
                            <span className="text-[10px] text-[#64748B] shrink-0">{getRelativeTime(item.createdAt)}</span>
                          </div>
                          <p className="text-[11px] text-[#64748B] mt-0.5 line-clamp-2">
                            {item.message}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs font-semibold text-[#64748B]">
                    No notifications currently.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={accountRef} className="relative">
          <button
            onClick={() => {
              setShowAccountDropdown(prev => !prev);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2 p-1 pr-3 bg-[#F8FAFC] hover:bg-[#F0FDF4] border border-[#E2E8F0] rounded-full transition-all focus:outline-none cursor-pointer"
            aria-label="User account menu"
          >
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-8 h-8 rounded-full object-cover border border-[#166534]/30"
            />
            <span className="font-bold text-xs text-[#166534] hidden sm:inline">
              {user ? `${user.firstName} ${user.lastName || ''}` : 'Farmer'}
            </span>
            <i className="fas fa-chevron-down text-[10px] text-[#64748B]"></i>
          </button>

          {/* Account Profile Dropdown Menu */}
          {showAccountDropdown && (
            <div className="dropdown-open absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-[#E2E8F0] overflow-hidden z-50 animate-scale-up origin-top-right">
              <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <p className="font-bold text-xs text-[#17231C] truncate">
                  {user ? `${user.firstName} ${user.lastName || ''}` : 'Farmer User'}
                </p>
                <p className="text-[11px] text-[#64748B] truncate mt-0.5">{user?.email}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setShowAccountDropdown(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#17231C] hover:bg-[#F0FDF4] transition-colors cursor-pointer"
                >
                  <i className="fas fa-user-circle text-[#166534]"></i> Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowAccountDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#DC2626] hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <i className="fas fa-sign-out-alt text-[#DC2626]"></i> Logout Account
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
