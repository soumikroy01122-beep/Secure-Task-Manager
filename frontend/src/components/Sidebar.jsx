import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3,
  User,
  LogOut,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

export default function Sidebar({ activeTab, onTabChange }) {
  const { user, logout } = useAuth();
  const role = user?.role;

  // Define tabs based on role matching the screenshot
  const getNavItems = () => {
    if (role === 'ADMIN') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    } else if (role === 'MANAGER') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'team', label: 'My Team', icon: Users },
        { id: 'tasks', label: 'Tasks', icon: CheckSquare },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    } else {
      // USER
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'tasks', label: 'My Tasks', icon: CheckSquare },
        { id: 'profile', label: 'Profile', icon: User },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* Role header box in sidebar */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
            {role === 'ADMIN' ? '👑' : role === 'MANAGER' ? '👥' : '👤'}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {role === 'ADMIN'
                ? 'Admin Console'
                : role === 'MANAGER'
                ? 'Manager Portal'
                : 'Workspace'}
            </div>
            <div className="text-xs text-slate-400">
              {role === 'ADMIN'
                ? 'Full System Authority'
                : role === 'MANAGER'
                ? 'Team Oversight'
                : 'Task Execution'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout button at bottom of sidebar */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
