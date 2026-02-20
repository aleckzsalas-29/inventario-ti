import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

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

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const rolesAPI = {
  getAll: () => api.get('/roles'),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  getPermissions: () => api.get('/permissions'),
};

export const customFieldsAPI = {
  getAll: (entityType) => api.get('/custom-fields', { params: { entity_type: entityType } }),
  create: (data) => api.post('/custom-fields', data),
  update: (id, data) => api.put(`/custom-fields/${id}`, data),
  delete: (id) => api.delete(`/custom-fields/${id}`),
};

export const companiesAPI = {
  getAll: () => api.get('/companies'),
  create: (data) => api.post('/companies', data),
  update: (id, data) => api.put(`/companies/${id}`, data),
  delete: (id) => api.delete(`/companies/${id}`),
};

export const branchesAPI = {
  getAll: (companyId) => api.get('/branches', { params: { company_id: companyId } }),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

export const employeesAPI = {
  getAll: (params) => api.get('/employees', { params }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const equipmentAPI = {
  getAll: (params) => api.get('/equipment', { params }),
  getById: (id) => api.get(`/equipment/${id}`),
  create: (data) => api.post('/equipment', data),
  update: (id, data) => api.put(`/equipment/${id}`, data),
  delete: (id) => api.delete(`/equipment/${id}`),
  getLogs: (id) => api.get(`/equipment/${id}/logs`),
  createLog: (id, data) => api.post(`/equipment/${id}/logs`, data),
};

export const assignmentsAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  create: (data) => api.post('/assignments', data),
  return: (id, observations) => api.put(`/assignments/${id}/return`, null, { params: { observations } }),
};

export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance', { params }),
  getHistory: (equipmentId) => api.get(`/maintenance/history/${equipmentId}`),
  create: (data) => api.post('/maintenance', data),
  start: (id) => api.put(`/maintenance/${id}/start`),
  complete: (id, notes, solution, repairTime) => api.put(`/maintenance/${id}/complete`, null, { 
    params: { notes, solution, repair_time: repairTime } 
  }),
};

export const decommissionsAPI = {
  getAll: () => api.get('/decommissions'),
  create: (data) => api.post('/decommissions', data),
};

export const externalServicesAPI = {
  getAll: (params) => api.get('/external-services', { params }),
  create: (data) => api.post('/external-services', data),
  update: (id, data) => api.put(`/external-services/${id}`, data),
  delete: (id) => api.delete(`/external-services/${id}`),
};

export const quotationsAPI = {
  getAll: (params) => api.get('/quotations', { params }),
  getById: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  updateStatus: (id, status) => api.put(`/quotations/${id}/status`, null, { params: { status } }),
  approve: (id) => api.put(`/quotations/${id}/status`, null, { params: { status: 'Aprobada' } }),
  reject: (id) => api.put(`/quotations/${id}/status`, null, { params: { status: 'Rechazada' } }),
  downloadPdf: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
  getPdf: (id) => api.get(`/quotations/${id}/pdf`, { responseType: 'blob' }),
};

export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  updateStatus: (id, status) => api.put(`/invoices/${id}/status`, null, { params: { status } }),
  markPaid: (id) => api.put(`/invoices/${id}/status`, null, { params: { status: 'Pagada' } }),
  downloadPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  getPdf: (id) => api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
};

export const reportsAPI = {
  equipmentPdf: (params) => api.get('/reports/equipment/pdf', { params, responseType: 'blob' }),
  equipmentLogsPdf: (id) => api.get(`/reports/equipment-logs/${id}/pdf`, { responseType: 'blob' }),
  maintenanceHistoryPdf: (id) => api.get(`/reports/maintenance/${id}/pdf`, { responseType: 'blob' }),
  maintenancePdf: (params) => api.get('/reports/maintenance/pdf', { params, responseType: 'blob' }),
  equipmentStatusPdf: (companyId) => api.get('/reports/equipment-status/pdf', { params: { company_id: companyId }, responseType: 'blob' }),
  externalServicesPdf: (companyId) => api.get('/reports/external-services/pdf', { params: companyId ? { company_id: companyId } : {}, responseType: 'blob' }),
};

export const notificationsAPI = {
  sendEmail: (data) => api.post('/notifications/email', data),
};

export default api;
