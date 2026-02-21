import { useEffect, useState } from 'react'
import { Building2, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin } from 'lucide-react'
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
        name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
    })
    const { addToast } = useToast()

    useEffect(() => {
        loadSuppliers()
    }, [])

    async function loadSuppliers() {
        try {
            setSuppliers(await api.getSuppliers())
        } catch (_) {
            addToast('Failed to load suppliers', 'error')
        }
    }

    function openAdd() {
        setEditingSupplier(null)
        setForm({ name: '', company: '', phone: '', email: '', address: '' })
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

    const filteredSuppliers = suppliers.filter((supplier) => {
        const term = search.toLowerCase()
        return (
            supplier.name.toLowerCase().includes(term) ||
            (supplier.company || '').toLowerCase().includes(term) ||
            (supplier.phone || '').includes(search)
        )
    })

    return (
        <div className="suppliers">
            <div className="page-header">
                <h1><Building2 size={24} /> Suppliers</h1>
                <div className="page-actions">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Supplier
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Company</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>Created</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSuppliers.map((supplier) => (
                            <tr key={supplier._id}>
                                <td><strong>{supplier.name}</strong></td>
                                <td>{supplier.company || '-'}</td>
                                <td>{supplier.phone || '-'}</td>
                                <td>{supplier.email || '-'}</td>
                                <td className="supplier-address-cell">{supplier.address || '-'}</td>
                                <td>
                                    {new Date(supplier.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                    })}
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(supplier)} title="Edit">
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteModal(supplier)} title="Delete">
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

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}>
                <div className="form-group">
                    <label>Name</label>
                    <input
                        value={form.name}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Supplier name"
                    />
                </div>
                <div className="form-group">
                    <label>Company</label>
                    <input
                        value={form.company}
                        onChange={(event) => setForm({ ...form, company: event.target.value })}
                        placeholder="Company (optional)"
                    />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label><Phone size={14} /> Phone</label>
                        <input
                            value={form.phone}
                            onChange={(event) => setForm({ ...form, phone: event.target.value })}
                            placeholder="Phone number"
                        />
                    </div>
                    <div className="form-group">
                        <label><Mail size={14} /> Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            placeholder="Email address"
                        />
                    </div>
                </div>
                <div className="form-group">
                    <label><MapPin size={14} /> Address</label>
                    <textarea
                        value={form.address}
                        onChange={(event) => setForm({ ...form, address: event.target.value })}
                        placeholder="Address"
                        rows={3}
                    />
                </div>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Supplier">
                <p style={{ marginBottom: '1rem' }}>
                    Delete supplier <strong>{deleteModal?.name}</strong>?
                </p>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
            </Modal>
        </div>
    )
}
