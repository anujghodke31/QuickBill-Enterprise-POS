import { useEffect, useState } from 'react'
import { Building2, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, Hash } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import Modal from '../components/Modal'
import './Suppliers.css'

export default function Suppliers() {
    const [suppliers, setSuppliers] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [deleteModal, setDeleteModal] = useState(null)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [form, setForm] = useState({
        name: '', company: '', phone: '', email: '', address: '',
        gstNumber: '', category: 'General', status: 'active',
    })
    const { addToast } = useToast()

    useEffect(() => { loadSuppliers() }, [])

    async function loadSuppliers() {
        try {
            setSuppliers(await api.getSuppliers())
        } catch (_) {
            addToast('Failed to load suppliers', 'error')
        }
    }

    function openAdd() {
        setEditingSupplier(null)
        setForm({ name: '', company: '', phone: '', email: '', address: '', gstNumber: '', category: 'General', status: 'active' })
        setModalOpen(true)
    }

    function openEdit(supplier) {
        setEditingSupplier(supplier)
        setForm({
            name: supplier.name || '',
            company: supplier.company || '',
            phone: supplier.phone || '',
            email: supplier.email || '',
            address: supplier.address || '',
            gstNumber: supplier.gstNumber || '',
            category: supplier.category || 'General',
            status: supplier.status || 'active',
        })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name.trim()) {
            addToast('Supplier name is required', 'error')
            return
        }

        try {
            if (editingSupplier) {
                await api.updateSupplier(editingSupplier._id, form)
                addToast('Supplier updated', 'success')
            } else {
                await api.createSupplier(form)
                addToast('Supplier added', 'success')
            }
            setModalOpen(false)
            loadSuppliers()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    async function handleDelete() {
        try {
            await api.deleteSupplier(deleteModal._id)
            addToast('Supplier deleted', 'success')
            setDeleteModal(null)
            loadSuppliers()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    const filteredSuppliers = suppliers.filter((s) => {
        const term = search.toLowerCase()
        return (
            s.name.toLowerCase().includes(term) ||
            (s.company || '').toLowerCase().includes(term) ||
            (s.phone || '').includes(search) ||
            (s.gstNumber || '').toLowerCase().includes(term)
        )
    })

    const activeCount = suppliers.filter(s => s.status === 'active').length

    return (
        <div className="suppliers">
            <div className="page-header">
                <h1><Building2 size={24} /> Suppliers</h1>
                <div className="page-actions">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search suppliers…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Supplier
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="supplier-stats">
                <div className="supplier-stat-card">
                    <Building2 size={20} />
                    <div>
                        <span className="supplier-stat-value">{suppliers.length}</span>
                        <span className="supplier-stat-label">Total Suppliers</span>
                    </div>
                </div>
                <div className="supplier-stat-card active-stat">
                    <div className="status-dot active"></div>
                    <div>
                        <span className="supplier-stat-value">{activeCount}</span>
                        <span className="supplier-stat-label">Active</span>
                    </div>
                </div>
                <div className="supplier-stat-card inactive-stat">
                    <div className="status-dot inactive"></div>
                    <div>
                        <span className="supplier-stat-value">{suppliers.length - activeCount}</span>
                        <span className="supplier-stat-label">Inactive</span>
                    </div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Supplier</th>
                            <th>Company</th>
                            <th>Contact</th>
                            <th>GST No.</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.map((s) => (
                            <tr key={s._id}>
                                <td>
                                    <div className="supplier-name-cell">
                                        <div className="supplier-avatar">
                                            {s.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <strong>{s.name}</strong>
                                            {s.address && <small className="supplier-address">{s.address}</small>}
                                        </div>
                                    </div>
                                </td>
                                <td>{s.company || '—'}</td>
                                <td>
                                    <div className="contact-cell">
                                        {s.phone && <span><Phone size={12} /> {s.phone}</span>}
                                        {s.email && <span><Mail size={12} /> {s.email}</span>}
                                        {!s.phone && !s.email && '—'}
                                    </div>
                                </td>
                                <td className="text-mono">{s.gstNumber || '—'}</td>
                                <td><span className="badge badge-info">{s.category || 'General'}</span></td>
                                <td>
                                    <span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-secondary'}`}>
                                        {s.status === 'active' ? '● Active' : '○ Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(s)} title="Edit">
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteModal(s)} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredSuppliers.length === 0 && (
                            <tr>
                                <td colSpan="7" className="empty-state">No suppliers found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}>
                <div className="form-group">
                    <label>Supplier Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" />
                </div>
                <div className="form-group">
                    <label>Company</label>
                    <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company (optional)" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label><Phone size={14} /> Phone</label>
                        <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" />
                    </div>
                    <div className="form-group">
                        <label><Mail size={14} /> Email</label>
                        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address" />
                    </div>
                </div>
                <div className="form-group">
                    <label><MapPin size={14} /> Address</label>
                    <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" rows={2} />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label><Hash size={14} /> GST Number</label>
                        <input value={form.gstNumber} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" />
                    </div>
                    <div className="form-group">
                        <label>Category</label>
                        <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                            <option>General</option>
                            <option>Groceries</option>
                            <option>Personal Care</option>
                            <option>Household</option>
                            <option>Baby Care</option>
                            <option>Electronics</option>
                        </select>
                    </div>
                </div>
                <div className="form-group">
                    <label>Status</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Supplier">
                <p style={{ marginBottom: '1rem' }}>
                    Delete supplier <strong>{deleteModal?.name}</strong>? This action cannot be undone.
                </p>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
            </Modal>
        </div>
    )
}
