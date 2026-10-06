import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Users,
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Search,
  Filter,
  RefreshCw,
  BarChart2,
  ArrowUpRight
} from 'lucide-react';
import TaskModal from '../components/TaskModal';
import UserModal from '../components/UserModal';

export default function AdminDashboard({ activeTab, onTabChange }) {
  const { user, updateUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTasks: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    overdue: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reportsData, setReportsData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Profile form
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    title: user?.title || '',
    current_password: '',
    new_password: ''
  });
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Filters for tasks view
  const [taskFilterStatus, setTaskFilterStatus] = useState('ALL');
  const [taskSearch, setTaskSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, tasksRes, usersRes, reportsRes] = await Promise.all([
        api.tasks.getStats(),
        api.tasks.getAll(),
        api.users.getAll(),
        api.tasks.getReports()
      ]);

      if (statsRes.stats) setStats(statsRes.stats);
      if (statsRes.recentTasks) setRecentTasks(statsRes.recentTasks);
      if (tasksRes.tasks) setAllTasks(tasksRes.tasks);
      if (usersRes.users) setAllUsers(usersRes.users);
      if (reportsRes) setReportsData(reportsRes);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Task Handlers
  const handleSaveTask = async (data) => {
    if (selectedTask) {
      await api.tasks.update(selectedTask.id, data);
    } else {
      await api.tasks.create(data);
    }
    loadData();
  };

  const handleDeleteTask = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await api.tasks.delete(id);
      loadData();
    }
  };

  // User Handlers
  const handleSaveUser = async (data) => {
    if (selectedUser) {
      await api.users.update(selectedUser.id, data);
    } else {
      await api.users.create(data);
    }
    loadData();
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await api.users.delete(id);
      loadData();
    }
  };

  // Profile update
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

  // Filtered tasks for task management tab
  const filteredTasks = allTasks.filter(t => {
    const matchesStatus = taskFilterStatus === 'ALL' || t.status === taskFilterStatus;
    const matchesSearch = !taskSearch || 
      t.title.toLowerCase().includes(taskSearch.toLowerCase()) || 
      (t.assignee_name && t.assignee_name.toLowerCase().includes(taskSearch.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">In Progress</span>;
      case 'OVERDUE':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">Overdue</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  const getRoleBadge = (r) => {
    switch (r) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">ADMIN</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-700">MANAGER</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-700">USER</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner for Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold text-slate-900">Admin Flow</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
              Full Access
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage system users, company tasks, and audit logs.
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
              setSelectedUser(null);
              setIsUserModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User</span>
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

      {/* 1. ADMIN DASHBOARD VIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stat Cards from flowchart: Total Users (25), Total Tasks (120), Completed (95), Pending (25) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Users</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalUsers}</div>
                <span className="text-[11px] text-blue-600 font-semibold mt-0.5 inline-block">Active Accounts</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tasks</span>
                <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalTasks}</div>
                <span className="text-[11px] text-purple-600 font-semibold mt-0.5 inline-block">Across Organization</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckSquare className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Completed</span>
                <div className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.completed}</div>
                <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 inline-block">Finished Tasks</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending</span>
                <div className="text-2xl font-extrabold text-amber-500 mt-1">{stats.pending}</div>
                <span className="text-[11px] text-amber-600 font-semibold mt-0.5 inline-block">Awaiting Action</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Recent Tasks Table */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Recent Tasks</h3>
                <p className="text-xs text-slate-500">Latest updates across the entire team</p>
              </div>
              <button
                onClick={() => onTabChange('tasks')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>View All Tasks</span>
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
                  {recentTasks.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-400">
                        No tasks recorded in database. Click "Create Task" to add one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER MANAGEMENT VIEW */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">User Management</h3>
              <p className="text-xs text-slate-500">Configure roles, permissions, and active statuses</p>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setIsUserModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-5">Name</th>
                  <th className="py-3 px-5">Role</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-slate-900">{u.full_name}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </td>
                    <td className="py-3.5 px-5">{getRoleBadge(u.role)}</td>
                    <td className="py-3.5 px-5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setIsUserModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user?.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors disabled:opacity-30"
                        title={u.id === user?.id ? "Cannot delete self" : "Delete User"}
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

      {/* 3. TASK MANAGEMENT VIEW */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Task Management</h3>
              <p className="text-xs text-slate-500">Full control over organizational tasks</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Status filter */}
              <select
                value={taskFilterStatus}
                onChange={(e) => setTaskFilterStatus(e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="OVERDUE">Overdue</option>
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
                  <th className="py-3 px-5">Priority</th>
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
                    <td className="py-3.5 px-5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        t.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                        t.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                        t.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
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

      {/* 4. REPORTS VIEW */}
      {activeTab === 'reports' && reportsData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">Task Reports</h3>
            <p className="text-xs text-slate-500 mb-6">Distribution and operational velocity</p>

            {/* Custom SVG Bar Chart matching the flowchart visual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">
                  Tasks by Status
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-amber-600">Pending</span>
                      <span>{reportsData.statusBreakdown.pending}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-amber-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(reportsData.statusBreakdown.pending / (stats.totalTasks || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-blue-600">In Progress</span>
                      <span>{reportsData.statusBreakdown.inProgress}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(reportsData.statusBreakdown.inProgress / (stats.totalTasks || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-emerald-600">Completed</span>
                      <span>{reportsData.statusBreakdown.completed}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(reportsData.statusBreakdown.completed / (stats.totalTasks || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-rose-600">Overdue</span>
                      <span>{reportsData.statusBreakdown.overdue}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-rose-500 h-3 rounded-full transition-all duration-500"
                        style={{
                          width: `${(reportsData.statusBreakdown.overdue / (stats.totalTasks || 1)) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Priority distribution */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-4">
                  Tasks by Priority
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Low</span>
                    <div className="text-xl font-bold text-slate-700">{reportsData.priorityBreakdown.low}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <span className="text-xs text-blue-600 font-medium">Medium</span>
                    <div className="text-xl font-bold text-blue-800">{reportsData.priorityBreakdown.medium}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <span className="text-xs text-amber-600 font-medium">High</span>
                    <div className="text-xl font-bold text-amber-800">{reportsData.priorityBreakdown.high}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                    <span className="text-xs text-rose-600 font-medium">Urgent</span>
                    <div className="text-xl font-bold text-rose-800">{reportsData.priorityBreakdown.urgent}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. PROFILE VIEW */}
      {activeTab === 'profile' && (
        <div className="max-w-xl mx-auto bg-white rounded-xl border border-slate-200/80 shadow-xs p-6">
          <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-2xl border-2 border-rose-200">
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{user?.full_name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
              <div className="mt-1.5">{getRoleBadge(user?.role)}</div>
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

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
        users={allUsers}
        isUserRole={false}
      />

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
        user={selectedUser}
      />
    </div>
  );
}
