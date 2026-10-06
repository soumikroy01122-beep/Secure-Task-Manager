import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import UserDashboard from './pages/UserDashboard';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

export default function App() {
  const { user, loading } = useAuth();
  const [unauthPage, setUnauthPage] = useState('landing'); // 'landing' | 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');

  // When user logs in or role changes, reset tab to dashboard
  useEffect(() => {
    if (user) {
      setActiveTab('dashboard');
    } else {
      setUnauthPage('landing');
    }
  }, [user?.id, user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold text-slate-400">Verifying secure session...</span>
        </div>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    switch (unauthPage) {
      case 'login':
        return <LoginPage onNavigate={setUnauthPage} />;
      case 'register':
        return <RegisterPage onNavigate={setUnauthPage} />;
      default:
        return <LandingPage onNavigate={setUnauthPage} />;
    }
  }

  // Authenticated Role-Based Dashboard Flow
  const renderDashboardByRole = () => {
    switch (user.role) {
      case 'ADMIN':
        return <AdminDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      case 'MANAGER':
        return <ManagerDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
      default:
        return <UserDashboard activeTab={activeTab} onTabChange={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {renderDashboardByRole()}
        </main>
      </div>
    </div>
  );
}
