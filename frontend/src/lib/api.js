import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Roles
export const rolesAPI = {
  getAll: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  getPermissions: () => api.get('/permissions'),
};

// Companies
export const companiesAPI = {
  getAll: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

// Branches
export const branchesAPI = {
  getAll: (companyId) => api.get('/branches', { params: { company_id: companyId } }),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Employees
export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

// Equipment Fields
export const equipmentFieldsAPI = {
  getAll: () => api.get('/equipment-fields'),
  create: (data) => api.post('/equipment-fields', data),
  update: (id, data) => api.put(`/equipment-fields/${id}`, data),
  delete: (id) => api.delete(`/equipment-fields/${id}`),
};

// Equipment
export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getLogs: (id) => api.get(`/equipment/${id}/logs`),
  createLog: (id, data) => api.post(`/equipment/${id}/logs`, data),
};

// Assignments
export const assignmentsAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  create: (data) => api.post('/assignments', data),
  return: (id, observations) => api.put(`/assignments/${id}/return`, null, { params: { observations } }),
};

// Repairs
export const repairsAPI = {
  getAll: (params) => api.get('/repairs', { params }),
  create: (data) => api.post('/repairs', data),
  finish: (id, params) => api.put(`/repairs/${id}/finish`, null, { params }),
};

// Decommissions
export const decommissionsAPI = {
  getAll: () => api.get('/decommissions'),
  create: (data) => api.post('/decommissions', data),
};

// External Services
export const externalServicesAPI = {
  getAll: (params) => api.get('/external-services', { params }),
  create: (data) => api.post('/external-services', data),
  update: (id, data) => api.put(`/external-services/${id}`, data),
  delete: (id) => api.delete(`/external-services/${id}`),
};

// Quotations
export const quotationsAPI = {
  getAll: (params) => api.get('/quotations', { params }),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  updateStatus: (id, status) => api.put(`/quotations/${id}/status`, null, { params: { status } }),
  downloadPdf: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
};

// Invoices
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, null, { params: { status } }),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

// Reports
export const reportsAPI = {
  equipmentPdf: (params) => api.get('/reports/equipment/pdf', { params, responseType: 'blob' }),
  equipmentLogsPdf: (id) => api.get(`/reports/equipment-logs/${id}/pdf`, { responseType: 'blob' }),
};

// Notifications
export const notificationsAPI = {
  sendEmail: (data) => api.post('/notifications/email', data),
};

export default api;
