import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit3, Trash2, Star, Phone, Mail } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import Modal from '../components/Modal'
import './Customers.css'

export default function Customers() {
    const [customers, setCustomers] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [editing, setEditing] = useState(null)
    const [form, setForm] = useState({ name: '', phone: '', email: '' })
    const { addToast } = useToast()

    useEffect(() => { loadCustomers() }, [])

    async function loadCustomers() {
        try {
            setCustomers(await api.getCustomers())
        } catch (err) {
            addToast('Failed to load customers', 'error')
        }
    }

    function openAdd() {
        setEditing(null)
        setForm({ name: '', phone: '', email: '' })
        setModalOpen(true)
    }

    function openEdit(customer) {
        setEditing(customer)
        setForm({
            name: customer.name,
            phone: customer.phone,
            email: customer.email || '',
        })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name || !form.phone) {
            addToast('Name and phone are required', 'error')
            return
        }

        try {
            if (editing) {
                await api.updateCustomer(editing._id, form)
                addToast('Customer updated', 'success')
            } else {
                await api.createCustomer(form)
                addToast('Customer added', 'success')
            }
            setModalOpen(false)
            loadCustomers()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    async function handleDelete(id) {
        try {
            await api.deleteCustomer(id)
            addToast('Customer deleted', 'success')
            setDeleteConfirm(null)
            loadCustomers()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
    )

    const totalCustomers = customers.length
    const totalSpent = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
    const totalPoints = customers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0)

    return (
        <div className="customers">
            <div className="page-header">
                <h1><Users size={24} /> Customers</h1>
                <div className="page-actions">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search by name, phone or email…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Customer
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="cust-summary">
                <div className="cust-stat">
                    <span className="cust-stat-label">Total Customers</span>
                    <span className="cust-stat-value">{totalCustomers}</span>
                </div>
                <div className="cust-stat">
                    <span className="cust-stat-label">Total Revenue</span>
                    <span className="cust-stat-value">₹{totalSpent.toLocaleString()}</span>
                </div>
                <div className="cust-stat">
                    <span className="cust-stat-label">Loyalty Points Issued</span>
                    <span className="cust-stat-value">{totalPoints.toLocaleString()}</span>
                </div>
            </div>

            {/* Customer Cards Grid */}
            {filtered.length === 0 ? (
                <div className="empty-card card">
                    <Users size={48} strokeWidth={1} />
                    <h3>No customers found</h3>
                    <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
                </div>
            ) : (
                <div className="customer-grid">
                    {filtered.map(c => (
                        <div key={c._id} className="customer-card card">
                            <div className="cc-header">
                                <div className="cc-avatar">{c.name.charAt(0).toUpperCase()}</div>
                                <div className="cc-info">
                                    <span className="cc-name">{c.name}</span>
                                    <span className="cc-since">
                                        Since {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                                    </span>
                                </div>
                                <div className="cc-actions">
                                    <button className="icon-btn" onClick={() => openEdit(c)} title="Edit">
                                        <Edit3 size={14} />
                                    </button>
                                    <button className="icon-btn danger" onClick={() => setDeleteConfirm(c)} title="Delete">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="cc-details">
                                <div className="cc-detail">
                                    <Phone size={14} />
                                    <span>{c.phone}</span>
                                </div>
                                {c.email && (
                                    <div className="cc-detail">
                                        <Mail size={14} />
                                        <span>{c.email}</span>
                                    </div>
                                )}
                            </div>

                            <div className="cc-footer">
                                <div className="cc-metric">
                                    <span className="cc-metric-label">Spent</span>
                                    <span className="cc-metric-value">₹{(c.totalSpent || 0).toLocaleString()}</span>
                                </div>
                                <div className="cc-metric">
                                    <span className="cc-metric-label">Points</span>
                                    <span className="cc-metric-value points">
                                        <Star size={12} /> {c.loyaltyPoints || 0}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editing ? 'Edit Customer' : 'Add Customer'}
            >
                <div className="form-group">
                    <label>Full Name</label>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Rahul Sharma"
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label>Phone Number</label>
                    <input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="e.g. 9876543210"
                    />
                </div>
                <div className="form-group">
                    <label>Email (optional)</label>
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="e.g. rahul@email.com"
                    />
                </div>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {editing ? 'Update' : 'Add Customer'}
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Customer"
                width={400}
            >
                <p style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-secondary)' }}>
                    Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
                </p>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm._id)}>
                        <Trash2 size={14} /> Delete
                    </button>
                </div>
            </Modal>
        </div>
    )
}
