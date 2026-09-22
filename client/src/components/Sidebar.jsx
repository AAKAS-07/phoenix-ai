import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout, showConfirm } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = () => {
    if (showConfirm) {
      showConfirm({
        title: 'Logout Account',
        message: 'Are you sure you want to log out of Phoenix AI platform?',
        confirmText: 'Yes, Logout',
        cancelText: 'Cancel',
        type: 'danger',
        onConfirm: () => {
          logout();
          navigate('/login');
        }
      });
    } else {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'fa-chart-pie'
    },
    {
      path: '/advisory',
      label: 'Crop Advisory',
      icon: 'fa-seedling'
    },
    {
      path: '/prices',
      label: 'Live Crop Prices',
      icon: 'fa-tags'
    },
    {
      path: '/news',
      label: 'Farmer News',
      icon: 'fa-newspaper'
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'fa-gear'
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-[#166534]/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        ></div>
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 w-[260px] bg-[#166534] text-white z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out select-none shadow-xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header Branding (Clickable link to /dashboard) */}
        <Link
          to="/dashboard"
          onClick={onClose}
          className="p-6 border-b border-white/10 flex items-center gap-3 hover:bg-white/5 transition-colors duration-200 cursor-pointer block"
        >
          <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center text-white shadow-md shrink-0">
            <i className="fas fa-leaf text-lg"></i>
          </div>
          <div>
            <h2 className="font-extrabold text-base tracking-tight text-white leading-tight">
              Phoenix AI
            </h2>
            <p className="text-[10px] text-[#A7F3D0] font-medium tracking-wide mt-0.5">
              Technology for a Greener Tomorrow
            </p>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-[#22C55E] text-[#17231C] font-extrabold shadow-sm'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <i className={`fas ${item.icon} text-sm ${isActive ? 'text-[#17231C]' : 'text-[#A7F3D0]'}`}></i>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer Logout Button */}
        <div className="p-4 border-t border-white/10 bg-[#14532D]/40">
          <button
            onClick={handleLogoutClick}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border border-white/10 active:scale-95"
          >
            <i className="fas fa-power-off text-rose-300"></i>
            <span>Logout Account</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
