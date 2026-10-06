import React from 'react';
import { Shield, Users, CheckSquare, Lock, ArrowRight, KeyRound, Database, CheckCircle2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onNavigate }) {
  const { login } = useAuth();

  const handleQuickLogin = async (identifier, role) => {
    try {
      await login(identifier, 'Password123!');
      // Login state triggers auto-redirect in App.jsx
    } catch (e) {
      alert(`Demo login error: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between">
      {/* Top Navbar */}
      <nav className="h-20 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">
              Secure Task Manager
            </span>
            <span className="text-xs text-blue-400 font-medium">JWT + RBAC + MySQL Architecture</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('login')}
            className="px-5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
          >
            Sign In
          </button>
          <button
            onClick={() => onNavigate('register')}
            className="px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section styled to match flowchart */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 flex flex-col items-center justify-center text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-semibold mb-8 animate-pulse">
          <Lock className="w-3.5 h-3.5" />
          <span>Enterprise Grade Security • Role-Based Dashboards</span>
        </div>

        {/* Central Brand Box matching the flow diagram */}
        <div className="w-full max-w-2xl bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/80 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-md mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Secure Task Manager
          </h1>
          <p className="text-blue-300 text-base sm:text-lg font-medium mb-8">
            Organize • Collaborate • Get Things Done
          </p>

          {/* 3 Pillar Features from the diagram */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2.5">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Secure</h3>
              <p className="text-[12px] text-slate-400">JWT Tokens & Bcrypt</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Role Based</h3>
              <p className="text-[12px] text-slate-400">Admin, Manager & User</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 flex flex-col items-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2.5">
                <CheckSquare className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-white mb-1">Task Management</h3>
              <p className="text-[12px] text-slate-400">Track & Update Status</p>
            </div>
          </div>

          {/* Action buttons matching the diagram */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-44 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all text-sm"
            >
              Login
            </button>
            <button
              onClick={() => onNavigate('register')}
              className="w-full sm:w-44 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold rounded-xl transition-all text-sm"
            >
              Register
            </button>
          </div>
        </div>

        {/* Quick Demo Credentials for Instant Review */}
        <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-left">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Instant Demo Logins (Password: Password123!)</span>
            </div>
            <span className="text-[11px] text-slate-500">Click any card to auto-sign in</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => handleQuickLogin('admin@company.com', 'ADMIN')}
              className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 hover:border-rose-600/70 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400">👑 Admin Flow</span>
                <ChevronRight className="w-3.5 h-3.5 text-rose-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-[12px] text-slate-300 mt-1 font-mono">admin@company.com</div>
              <div className="text-[11px] text-rose-400/80 mt-0.5">Full System Access</div>
            </button>

            <button
              onClick={() => handleQuickLogin('manager@company.com', 'MANAGER')}
              className="p-3 rounded-lg bg-blue-950/30 border border-blue-800/40 hover:border-blue-600/70 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-400">👥 Manager Flow</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-[12px] text-slate-300 mt-1 font-mono">manager@company.com</div>
              <div className="text-[11px] text-blue-400/80 mt-0.5">Team & Task Oversight</div>
            </button>

            <button
              onClick={() => handleQuickLogin('alex@company.com', 'USER')}
              className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 hover:border-emerald-600/70 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400">👤 User Flow</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div className="text-[12px] text-slate-300 mt-1 font-mono">alex@company.com</div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">Assigned Tasks Only</div>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-6 text-center text-xs text-slate-500">
        <p>Secure Task Manager • Built with Node.js, Express, React, Tailwind CSS & MySQL Database</p>
      </footer>
    </div>
  );
}
