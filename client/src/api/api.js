import axios from 'axios';

// Create the axios instance
const axiosInstance = axios.create({
    baseURL: '/api',
    withCredentials: true, // Crucial for sending cookies (refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach access token to every outgoing request
axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('quickbill_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 retry logic
axiosInstance.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;
        
        const message = error.response?.data?.message || error.message || 'Request failed';
        error.message = message;

        // If error is 401 and we haven't already retried this request
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Prevent infinite loops on the refresh endpoint itself
            if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            try {
                // Request a new access token
                const { token } = await api.refreshToken();
                
                // Save the new token
                localStorage.setItem('quickbill_token', token);
                
                // Update the Authorization header and retry original request
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // Wiping config out if completely unauthorized
                localStorage.removeItem('quickbill_token');
                window.location.href = '/auth'; // Adjusted to match generic React Router auth path
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export const api = {
    getProducts: () => axiosInstance.get('/products'),
    createProduct: (body) => axiosInstance.post('/products', body),
    updateProduct: (id, body) => axiosInstance.put(`/products/${id}`, body),
    getAlerts: () => axiosInstance.get('/products/alerts'),

    getInvoices: () => axiosInstance.get('/invoices'),
    createInvoice: (body) => axiosInstance.post('/invoices', body),
    getLoyaltyStatus: (customerId) => axiosInstance.get(`/invoices/loyalty/${customerId}`),
    downloadInvoiceReceipt: (invoiceId) => axiosInstance.get(`/invoices/${invoiceId}/receipt`, { responseType: 'blob' }),

    login: (body) => axiosInstance.post('/auth/login', body),
    register: (body) => axiosInstance.post('/auth/register', body),
    googleLogin: (body) => axiosInstance.post('/auth/google', body),
    refreshToken: () => axiosInstance.post('/auth/refresh'),
    logout: () => axiosInstance.post('/auth/logout'),

    getCustomers: () => axiosInstance.get('/customers'),
    createCustomer: (body) => axiosInstance.post('/customers', body),
    updateCustomer: (id, body) => axiosInstance.put(`/customers/${id}`, body),
    deleteCustomer: (id) => axiosInstance.delete(`/customers/${id}`),

    getEmployees: () => axiosInstance.get('/employees'),
    createEmployee: (body) => axiosInstance.post('/employees', body),
    updateEmployee: (id, body) => axiosInstance.put(`/employees/${id}`, body),
    deleteEmployee: (id) => axiosInstance.delete(`/employees/${id}`),

    getSuppliers: () => axiosInstance.get('/suppliers'),
    createSupplier: (body) => axiosInstance.post('/suppliers', body),
    updateSupplier: (id, body) => axiosInstance.put(`/suppliers/${id}`, body),
    deleteSupplier: (id) => axiosInstance.delete(`/suppliers/${id}`),

    getReturns: () => axiosInstance.get('/returns'),
    getReturnInvoice: (query) => axiosInstance.get(`/returns/invoice/${encodeURIComponent(query)}`),
    createReturn: (body) => axiosInstance.post('/returns', body),

    getStorefrontProducts: (params = {}) => {
        const q = new URLSearchParams(params).toString();
        return axiosInstance.get(`/products/storefront${q ? '?' + q : ''}`);
    },
    getCategories: () => axiosInstance.get('/products/categories'),
    getProductById: (id) => axiosInstance.get(`/products/${id}`),

    createOrder: (body) => axiosInstance.post('/orders', body),
    getMyOrders: (email) => axiosInstance.get(`/orders/my?email=${encodeURIComponent(email)}`),
    getOrderById: (id) => axiosInstance.get(`/orders/${id}`),
    getOrders: () => axiosInstance.get('/orders'),
    updateOrderStatus: (id, body) => axiosInstance.put(`/orders/${id}/status`, body),
    getOrderStats: () => axiosInstance.get('/orders/stats'),
};
