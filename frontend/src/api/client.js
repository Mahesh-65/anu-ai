const BASE = '/api';

function formatApiError(err, fallback = 'Request failed') {
  if (!err) return fallback;
  if (typeof err.detail === 'string') return err.detail;
  if (Array.isArray(err.detail)) {
    return err.detail.map((e) => e.msg || JSON.stringify(e)).join('. ');
  }
  if (typeof err.message === 'string') return err.message;
  if (typeof err.detail === 'object') return JSON.stringify(err.detail);
  return fallback;
}

function getToken() {
  return localStorage.getItem('access_token');
}

function setTokens(access, refresh) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
}

function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

async function refreshAccessToken() {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) throw new Error('No refresh token');
  const res = await fetch(`${BASE}/auth/refresh?refresh_token=${refresh}`, { method: 'POST' });
  if (!res.ok) { clearTokens(); throw new Error('Session expired'); }
  const data = await res.json();
  setTokens(data.access_token, data.refresh_token);
  return data.access_token;
}

async function request(path, options = {}, retry = true) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && retry) {
    try {
      const newToken = await refreshAccessToken();
      return request(path, options, false);
    } catch {
      clearTokens();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(formatApiError(err, res.statusText));
  }

  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const authApi = {
  login:    (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data)            => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  logout:   (refresh_token)   => request(`/auth/logout?refresh_token=${refresh_token}`, { method: 'POST' }),
  me:             () => request('/auth/me'),
  changePassword: (current_password, new_password) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password, new_password }) }),
  setTokens,
  clearTokens,
  getToken,
};

// Users
export const usersApi = {
  list:    ()          => request('/users'),
  create:  (data)     => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  get:     (id)        => request(`/users/${id}`),
  update:  (id, data)  => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove:  (id)        => request(`/users/${id}`, { method: 'DELETE' }),
};

// Roles
export const rolesApi = {
  list:        ()           => request('/roles'),
  permissions: ()           => request('/permissions'),
};

// AI Service
export const aiApi = {
  health:    ()       => request('/ai/health'),
  documents: ()       => request('/ai/documents'),
  query:     (q)      => request('/ai/query', { method: 'POST', body: JSON.stringify({ query: q }) }),
  reset:     ()       => request('/ai/reset', { method: 'POST' }),
  ingest: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    const token = getToken();
    return fetch(`${BASE}/ai/ingest`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(r => r.json());
  },
};

// HR Service
export const hrApi = {
  employees:         ()           => request('/hr/employees'),
  getEmployee:       (id)         => request(`/hr/employees/${id}`),
  createEmployee:    (d)          => request('/hr/employees', { method: 'POST', body: JSON.stringify(d) }),
  updateEmployee:    (id, d)      => request(`/hr/employees/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  deleteEmployee:    (id)         => request(`/hr/employees/${id}`, { method: 'DELETE' }),
  attendance:        (id)         => request(`/hr/employees/${id}/attendance`),
  leaveRequests:     ()           => request('/hr/leaves'),
  createLeave:       (d)          => request('/hr/leaves', { method: 'POST', body: JSON.stringify(d) }),
  updateLeave:       (id, status) => request(`/hr/leaves/${id}`, { method: 'PUT', body: JSON.stringify({ status }) }),
  jobs:              ()           => request('/hr/jobs'),
  createJob:         (d)          => request('/hr/jobs', { method: 'POST', body: JSON.stringify(d) }),
};

// Project Service
export const projectApi = {
  projects:      ()      => request('/projects/projects'),
  getProject:    (id)    => request(`/projects/projects/${id}`),
  createProject: (d)     => request('/projects/projects', { method: 'POST', body: JSON.stringify(d) }),
  updateProject: (id, d) => request(`/projects/projects/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  tasks:         (pid)   => request(`/projects/projects/${pid}/tasks`),
  createTask:    (pid, d)=> request(`/projects/projects/${pid}/tasks`, { method: 'POST', body: JSON.stringify(d) }),
  updateTask:    (id, d) => request(`/projects/tasks/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  tickets:       ()      => request('/projects/tickets'),
  createTicket:  (d)     => request('/projects/tickets', { method: 'POST', body: JSON.stringify(d) }),
  updateTicket:  (id, d) => request(`/projects/tickets/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
};

// Finance Service
export const financeApi = {
  expenses:       ()      => request('/finance/expenses'),
  createExpense:  (d)     => request('/finance/expenses', { method: 'POST', body: JSON.stringify(d) }),
  updateExpense:  (id, d) => request(`/finance/expenses/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  budgets:        ()      => request('/finance/budgets'),
  createBudget:   (d)     => request('/finance/budgets', { method: 'POST', body: JSON.stringify(d) }),
  invoices:       ()      => request('/finance/invoices'),
  createInvoice:  (d)     => request('/finance/invoices', { method: 'POST', body: JSON.stringify(d) }),
  updateInvoice:  (id, d) => request(`/finance/invoices/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
  summary:        ()      => request('/finance/summary'),
};
