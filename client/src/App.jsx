import React, { useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import ScrollToTop from './components/ScrollToTop';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';

import Dashboard from './pages/Dashboard';
import Advisory from './pages/Advisory';
import Crops from './pages/Crops';
import News from './pages/News';
import ArticleDetail from './pages/ArticleDetail';
import Settings from './pages/Settings';
import Trash from './pages/Trash';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen main-bg-gradient flex transition-colors duration-300">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-[270px] transition-all">
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto main-content">
          <Outlet />
        </main>
      </div>

      <Toast />
      <ConfirmModal />
    </div>
  );
};

const StandaloneLayout = ({ children }) => (
  <>
    {children}
    <Toast />
    <ConfirmModal />
  </>
);

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <StandaloneLayout>
            <Login />
          </StandaloneLayout>
        }
      />
      <Route
        path="/register"
        element={
          <StandaloneLayout>
            <Register />
          </StandaloneLayout>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <StandaloneLayout>
            <ForgotPassword />
          </StandaloneLayout>
        }
      />
      <Route
        path="/reset-password"
        element={
          <StandaloneLayout>
            <ResetPassword />
          </StandaloneLayout>
        }
      />
      <Route
        path="/reset-password/:token"
        element={
          <StandaloneLayout>
            <ResetPassword />
          </StandaloneLayout>
        }
      />

      {/* Profile Completion (Protected) */}
      <Route
        path="/complete-profile"
        element={
          <ProtectedRoute>
            <StandaloneLayout>
              <CompleteProfile />
            </StandaloneLayout>
          </ProtectedRoute>
        }
      />

      {/* Main Authenticated Layout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/advisory" element={<Advisory />} />
        <Route path="/prices" element={<Crops />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/detail" element={<ArticleDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/trash" element={<Trash />} />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}

export default App;
