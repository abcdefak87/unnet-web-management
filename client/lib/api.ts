import axios from 'axios'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' && window.location.origin ? `${window.location.origin}/api` : 'http://localhost:3001/api');

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });

          const { token } = response.data;
          Cookies.set('token', token);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          Cookies.remove('token');
          Cookies.remove('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        Cookies.remove('token');
        window.location.href = '/login';
      }
    } else if (error.response?.status === 500) {
      toast.error('Terjadi kesalahan server');
    }
    return Promise.reject(error);
  }
)

// API endpoints
export const authAPI = {
  login: async (data: { username: string; password: string }) => {
    const response = await api.post('/auth/login', data);
    // Store refresh token
    if (response.data.refreshToken) {
      Cookies.set('refreshToken', response.data.refreshToken);
    }
    return response;
  },
  register: (data: any) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      // Always clear tokens
      Cookies.remove('token');
      Cookies.remove('refreshToken');
    }
  },
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
}

export const jobsAPI = {
  getAll: (params?: any) => api.get('/jobs', { params }),
  getById: (id: string) => api.get(`/jobs/${id}`),
  create: (data: FormData) => api.post('/jobs', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateStatus: (id: string, data: any) => api.put(`/jobs/${id}/status`, data),
  assign: (id: string, data: any) => api.post(`/jobs/${id}/assign`, data),
  complete: (id: string, data: FormData) => api.put(`/jobs/${id}/complete`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id: string) => api.delete(`/jobs/${id}`),
}

export const techniciansAPI = {
  getAll: () => api.get('/technicians'),
  getById: (id: string) => api.get(`/technicians/${id}`),
  getAvailable: () => api.get('/technicians/available/for-job'),
  create: (data: any) => api.post('/technicians', data),
  update: (id: string, data: any) => api.put(`/technicians/${id}`, data),
  delete: (id: string) => api.delete(`/technicians/${id}`),
}

export const inventoryAPI = {
  getItems: (params?: any) => api.get('/inventory/items', { params }),
  getItemById: (id: string) => api.get(`/inventory/items/${id}`),
  createItem: (data: any) => api.post('/inventory/items', data),
  updateItem: (id: string, data: any) => api.put(`/inventory/items/${id}`, data),
  addStock: (id: string, data: any) => api.post(`/inventory/items/${id}/stock/add`, data),
  removeStock: (id: string, data: any) => api.post(`/inventory/items/${id}/stock/remove`, data),
  returnStock: (id: string, data: any) => api.post(`/inventory/items/${id}/stock/return`, data),
  damageStock: (id: string, data: any) => api.post(`/inventory/items/${id}/stock/damage`, data),
  getLogs: (params?: any) => api.get('/inventory/logs', { params }),
  getLowStock: () => api.get('/inventory/low-stock'),
}

export const customersAPI = {
  getAll: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
}

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getJobs: (params?: any) => api.get('/reports/jobs', { params }),
  getInventory: (params?: any) => api.get('/reports/inventory', { params }),
  getTechnicians: (params?: any) => api.get('/reports/technicians', { params }),
}

export const telegramAPI = {
  sendMessage: (data: any) => api.post('/telegram/send-message', data),
  broadcastJob: (jobId: string) => api.post(`/telegram/broadcast-job/${jobId}`),
  sendReminders: () => api.post('/telegram/send-reminders'),
  getBotInfo: () => api.get('/telegram/bot-info'),
}
