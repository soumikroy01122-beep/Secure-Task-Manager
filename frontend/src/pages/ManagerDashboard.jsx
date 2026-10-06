import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  Mail,
  Briefcase,
  ArrowUpRight
} from 'lucide-react';
import TaskModal from '../components/TaskModal';

export default function ManagerDashboard({ activeTab, onTabChange }) {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState({
    myTeam: 0,
    totalTasks: 0,
    completed: 0,
    pending: 0,
    inProgress: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [teamTasks, setTeamTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Filters for team tasks
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    title: user?.title || '',
    current_password: '',
    new_password: ''
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, tasksRes, membersRes, reportsRes] = await Promise.all([
        api.tasks.getStats(),
        api.tasks.getAll(),
        api.users.getTeamMembers(),
        api.tasks.getReports()
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (statsRes.recentTasks) setRecentTasks(statsRes.recentTasks);
      if (tasksRes.tasks) setTeamTasks(tasksRes.tasks);
      if (membersRes.members) setTeamMembers(membersRes.members);
      if (reportsRes) setReportsData(reportsRes);
    } catch (err) {
      console.error('Failed to load manager dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSaveTask = async (data) => {
    if (selectedTask) {
      await api.tasks.update(selectedTask.id, data);
    } else {
      await api.tasks.create(data);
    }
    loadData();
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Delete this task?')) {
      await api.tasks.delete(id);
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

  const filteredTasks = teamTasks.filter(t => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch = !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignee_name && t.assignee_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner for Manager Flow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-slate-900">Manager Flow</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200">
              Team Access
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Coordinate team deliverables, delegate tasks, and monitor progress.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setSelectedTask(null);
              setIsTaskModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm shadow-blue-200 flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 1. MANAGER DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Cards from flowchart: My Team (8), Total Tasks (45), Completed (30), Pending (15) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">My Team</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.myTeam}</div>
                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 inline-block">Active Developers & Testers</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tasks</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalTasks}</div>
                <span className="text-[11px] text-purple-600 font-semibold mt-0.5 inline-block">Assigned to Team</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block">Closed Deliverables</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</span>
                <div className="text-2xl font-extrabold text-amber-500 mt-1">{stats.pending}</div>
                <span className="text-[11px] text-amber-600 font-semibold mt-0.5 inline-block">In Queue</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Team Tasks Table matching the flowchart */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Team Tasks</h3>
                <p className="text-xs text-slate-500">Active tasks across your team members</p>
              </div>
              <button
                onClick={() => onTabChange('tasks')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Manage Team Tasks</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-5">Title</th>
                    <th className="py-3 px-5">Assigned To</th>
                    <th className="py-3 px-5">Status</th>
                    <th className="py-3 px-5">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTasks.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-900">{t.title}</td>
                      <td className="py-3.5 px-5 text-slate-600">{t.assigned_to || 'Unassigned'}</td>
                      <td className="py-3.5 px-5">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TEAM TASKS VIEW */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Team Tasks</h3>
              <p className="text-xs text-slate-500">Create, assign and update team assignments</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search team tasks..."
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

              <button
                onClick={() => {
                  setSelectedTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Title</th>
                  <th className="py-3 px-5">Assigned To</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Due Date</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{t.title}</div>
                      {t.description && (
                        <div className="text-xs text-slate-400 truncate max-w-xs">{t.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-slate-700">{t.assignee_name || 'Unassigned'}</td>
                    <td className="py-3.5 px-5">{getStatusBadge(t.status)}</td>
                    <td className="py-3.5 px-5 text-slate-500 text-xs">
                      {t.due_date ? new Date(t.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTask(t);
                          setIsTaskModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Task"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Delete Task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TEAM MEMBERS VIEW matching flowchart (Alex Developer, Priya Tester, Rahul Developer) */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base">Team Members</h3>
            <p className="text-xs text-slate-500">Personnel in your reporting line and their workload</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.map((m) => (
              <div key={m.id} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {m.full_name ? m.full_name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{m.full_name}</h4>
                    <span className="text-xs text-blue-600 font-medium">{m.title || 'Developer'}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{m.email}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Total</span>
                    <span className="font-bold text-slate-800">{m.task_count || 0}</span>
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase text-amber-600 font-semibold block">Active</span>
                    <span className="font-bold text-amber-700">{m.active_count || 0}</span>
                  </div>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase text-emerald-600 font-semibold block">Done</span>
                    <span className="font-bold text-emerald-700">{m.completed_count || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. REPORTS VIEW */}
      {activeTab === 'reports' && reportsData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base">Team Task Analytics</h3>
          <p className="text-xs text-slate-500">Completion rate and workload breakdown across team members</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-semibold text-amber-700 uppercase">Pending</span>
              <div className="text-2xl font-extrabold text-amber-900 mt-1">{reportsData.statusBreakdown.pending}</div>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-xs font-semibold text-blue-700 uppercase">In Progress</span>
              <div className="text-2xl font-extrabold text-blue-900 mt-1">{reportsData.statusBreakdown.inProgress}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Completed</span>
              <div className="text-2xl font-extrabold text-emerald-900 mt-1">{reportsData.statusBreakdown.completed}</div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PROFILE VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-2xl border-2 border-blue-200">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{user?.full_name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">MANAGER</span>
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

            <div className="pt-3">
              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm shadow-blue-200 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Task Modal for Manager to assign tasks to team */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
        users={teamMembers}
        isUserRole={false}
      />
    </div>
  );
}
