import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  Calendar,
  AlertCircle,
  Flag,
  ArrowUpRight
} from 'lucide-react';
import TaskModal from '../components/TaskModal';

export default function UserDashboard({ activeTab, onTabChange }) {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Task details modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters for My Tasks
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    current_password: '',
    new_password: ''
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, tasksRes] = await Promise.all([
        api.tasks.getStats(),
        api.tasks.getAll()
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (statsRes.recentTasks) setRecentTasks(statsRes.recentTasks);
      if (tasksRes.tasks) setMyTasks(tasksRes.tasks);
    } catch (err) {
      console.error('Failed to load user dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleUpdateStatus = async (statusData) => {
    if (selectedTask) {
      await api.tasks.update(selectedTask.id, statusData);
      loadData();
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    try {
      const res = await api.auth.updateProfile(profileData);
      updateUser(res.user);
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setProfileData({ ...profileData, current_password: '', new_password: '' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">In Progress</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  const filteredTasks = myTasks.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner for User Flow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-slate-900">User Flow</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Own Tasks
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            View assigned work, inspect details, and update execution status.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2 self-start sm:self-auto text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          title="Refresh Tasks"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 1. USER DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Cards from flowchart: Pending (5), In Progress (3), Completed (8) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</span>
                <div className="text-3xl font-extrabold text-amber-500 mt-1">{stats.pending}</div>
                <span className="text-[11px] text-amber-600 font-semibold mt-0.5 inline-block">Need Attention</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">In Progress</span>
                <div className="text-3xl font-extrabold text-blue-600 mt-1">{stats.inProgress}</div>
                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 inline-block">Currently Working On</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed</span>
                <div className="text-3xl font-extrabold text-emerald-600 mt-1">{stats.completed}</div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block">Successfully Delivered</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* My Recent Tasks Table matching the flowchart */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">My Recent Tasks</h3>
                <p className="text-xs text-slate-500">Your latest work assignments</p>
              </div>
              <button
                onClick={() => onTabChange('tasks')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All My Tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Title</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Due Date</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{t.title}</td>
                      <td className="py-3.5 px-5">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          onClick={() => {
                            setSelectedTask(t);
                            setIsTaskModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          View & Update
                        </button>
                      </td>
                    </tr>
                  ))}
                  {recentTasks.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-400">
                        You currently have no tasks assigned.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. MY TASKS VIEW matching flowchart (Update Documentation, Fix Bugs, Prepare Presentation) */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">My Tasks</h3>
              <p className="text-xs text-slate-500">Click any task to inspect details and update status</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search my tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTask(t);
                  setIsTaskModalOpen(true);
                }}
                className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-base text-slate-900">{t.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                      t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                      t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-slate-500 line-clamp-1">{t.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {t.due_date ? new Date(t.due_date).toLocaleDateString() : 'None'}</span>
                  </div>
                  <div>{getStatusBadge(t.status)}</div>
                  <button className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg">
                    Task Details
                  </button>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-sm">
                No matching tasks found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. PROFILE VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-2xl border-2 border-emerald-200">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{user?.full_name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">USER</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
            {profileMsg.text && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                profileMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {profileMsg.text}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="block text-xs font-bold text-slate-800 mb-3">Change Password (Optional)</span>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={profileData.current_password}
                  onChange={(e) => setProfileData({ ...profileData, current_password: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="New Password (min 8 chars)"
                  value={profileData.new_password}
                  onChange={(e) => setProfileData({ ...profileData, new_password: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-200 transition-colors"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. TASK DETAILS MODAL matching flowchart (Title, Description, Status, Priority, Due Date, Update Status) */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleUpdateStatus}
        task={selectedTask}
        users={[]}
        isUserRole={true}
      />
    </div>
  );
}
