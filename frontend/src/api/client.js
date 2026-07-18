import axios from 'axios'

const BASE = 'http://localhost:8000'

const api = axios.create({ baseURL: BASE })

// Add request interceptor to attach bearer token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('stockpulse_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

export const health = () => api.get('/')

// Auth
export const loginUser = (credentials) => api.post('/auth/login', credentials)
export const registerUser = (userData) => api.post('/auth/register', userData)
export const getRegisteredUsers = () => api.get('/auth/users')

// Dashboard
export const getDashboard = () => api.get('/analytics/dashboard')

// Products
export const getProducts = () => api.get('/products/')

// Inventory
export const getInventory = () => api.get('/inventory/')
export const getLowStock  = () => api.get('/inventory/low-stock')

// Suppliers
export const getSuppliers = () => api.get('/suppliers/')

// Purchase Orders
export const getPOs         = (status) => api.get('/purchase-orders/', { params: status ? { status } : {} })
export const getRankedPOs   = () => api.get('/purchase-orders/ranked')
export const draftAutoPOs   = () => api.post('/purchase-orders/draft-auto')
export const draftManualPO  = (productId) => api.post(`/purchase-orders/draft-manual/${productId}`)
export const updatePOStatus = (poId, status) =>
  api.patch(`/purchase-orders/${poId}/status`, { status })

// Analytics / P&L
export const getPnL = () => api.get('/analytics/pnl')

// Upload
export const uploadFile = (formData) =>
  api.post('/upload/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
export const confirmUpload = (uploadId) => api.post(`/upload/confirm/${uploadId}`)
