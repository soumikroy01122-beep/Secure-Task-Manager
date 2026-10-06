const API_BASE = '/api';

/**
 * Universal authenticated fetch helper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
      throw new Error(data.error || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Authentication
  auth: {
    login: (identifier, password) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }),
    register: (userData) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    getMe: () => request('/auth/me'),
    updateProfile: (profileData) =>
      request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      }),
  },

  // Tasks
  tasks: {
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.append('status', params.status);
      if (params.priority) searchParams.append('priority', params.priority);
      if (params.search) searchParams.append('search', params.search);
      const query = searchParams.toString();
      return request(`/tasks${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/tasks/${id}`),
    getStats: () => request('/tasks/stats'),
    getReports: () => request('/tasks/reports'),
    create: (taskData) =>
      request('/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      }),
    update: (id, taskData) =>
      request(`/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(taskData),
      }),
    delete: (id) =>
      request(`/tasks/${id}`, {
        method: 'DELETE',
      }),
  },

  // Users
  users: {
    getAll: () => request('/users'),
    getTeamMembers: () => request('/users/team-members'),
    getById: (id) => request(`/users/${id}`),
    create: (userData) =>
      request('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),
    update: (id, userData) =>
      request(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      }),
    delete: (id) =>
      request(`/users/${id}`, {
        method: 'DELETE',
      }),
  },

  // Health
  health: () => request('/health'),
};
