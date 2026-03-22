const BASE = '/api';

async function request(endpoint, options = {}) {
    const { responseType = 'json', ...fetchOptions } = options;
    const token = localStorage.getItem('quickbill_token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(fetchOptions.headers || {})
    };

    const res = await fetch(`${BASE}${endpoint}`, {
        headers,
        ...fetchOptions,
    });

    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
        let message = 'Request failed';
        try {
            if (contentType.includes('application/json')) {
                const data = await res.json();
                message = data.message || message;
            } else {
                const text = await res.text();
                message = text || message;
            }
        } catch {
            // Ignore parsing errors and keep fallback message
        }
        throw new Error(message);
    }

    if (responseType === 'blob') return res.blob();
    if (responseType === 'text') return res.text();
    if (responseType === 'none') return null;
    if (contentType.includes('application/json')) return res.json();
    return null;
}

export const api = {
    // Products
    getProducts: () => request('/products'),
    createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
    updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    getAlerts: () => request('/products/alerts'),

    // Invoices
    getInvoices: () => request('/invoices'),
    createInvoice: (body) => request('/invoices', { method: 'POST', body: JSON.stringify(body) }),
    getLoyaltyStatus: (customerId) => request(`/invoices/loyalty/${customerId}`),
    downloadInvoiceReceipt: (invoiceId) => request(`/invoices/${invoiceId}/receipt`, { responseType: 'blob' }),

    // Auth
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
    googleLogin: (body) => request('/auth/google', { method: 'POST', body: JSON.stringify(body) }),

    // Customers
    getCustomers: () => request('/customers'),
    createCustomer: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
    updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

    // Employees
    getEmployees: () => request('/employees'),
    createEmployee: (body) => request('/employees', { method: 'POST', body: JSON.stringify(body) }),
    updateEmployee: (id, body) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteEmployee: (id) => request(`/employees/${id}`, { method: 'DELETE' }),

    // Suppliers
    getSuppliers: () => request('/suppliers'),
    createSupplier: (body) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
    updateSupplier: (id, body) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),

    // Returns
    getReturns: () => request('/returns'),
    getReturnInvoice: (query) => request(`/returns/invoice/${encodeURIComponent(query)}`),
    createReturn: (body) => request('/returns', { method: 'POST', body: JSON.stringify(body) }),

    // Storefront
    getStorefrontProducts: (params = {}) => {
        const q = new URLSearchParams(params).toString()
        return request(`/products/storefront${q ? '?' + q : ''}`)
    },
    getCategories: () => request('/products/categories'),
    getProductById: (id) => request(`/products/${id}`),

    // Orders
    createOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
    getMyOrders: (email) => request(`/orders/my?email=${encodeURIComponent(email)}`),
    getOrderById: (id) => request(`/orders/${id}`),
    getOrders: () => request('/orders'),
    updateOrderStatus: (id, body) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(body) }),
    getOrderStats: () => request('/orders/stats'),
};
