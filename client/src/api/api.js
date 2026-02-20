const BASE = '/api';

async function request(endpoint, options = {}) {
    const res = await fetch(`${BASE}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

export const api = {
    // Products
    getProducts: () => request('/products'),
    createProduct: (body) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
    updateProduct: (id, body) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

    // Invoices
    getInvoices: () => request('/invoices'),
    createInvoice: (body) => request('/invoices', { method: 'POST', body: JSON.stringify(body) }),

    // Auth
    login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    // Customers
    getCustomers: () => request('/customers'),
    createCustomer: (body) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
    updateCustomer: (id, body) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
};
