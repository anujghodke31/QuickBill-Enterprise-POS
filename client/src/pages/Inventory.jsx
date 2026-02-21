import { useState, useEffect } from 'react'
import { Package, Plus, Search, Edit3, Calendar } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import Modal from '../components/Modal'
import './Inventory.css'

export default function Inventory() {
    const [products, setProducts] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [form, setForm] = useState({ name: '', price: '', stock: '', barcode: '', category: 'Groceries', manufacturingDate: '', expiryDate: '' })
    const { addToast } = useToast()

    useEffect(() => { loadProducts() }, [])

    async function loadProducts() {
        try {
            setProducts(await api.getProducts())
        } catch (err) {
            addToast('Failed to load inventory', 'error')
        }
    }

    function openAdd() {
        setEditingProduct(null)
        setForm({ name: '', price: '', stock: '', barcode: '', category: 'Groceries', manufacturingDate: '', expiryDate: '' })
        setModalOpen(true)
    }

    function openEdit(product) {
        setEditingProduct(product)
        setForm({
            name: product.name,
            price: product.price,
            stock: product.stock,
            barcode: product.barcode || '',
            category: product.category || 'Groceries',
            manufacturingDate: product.manufacturingDate ? product.manufacturingDate.split('T')[0] : '',
            expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
        })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name || !form.price) {
            addToast('Name and price are required', 'error')
            return
        }

        try {
            const body = {
                ...form,
                price: parseFloat(form.price),
                stock: parseInt(form.stock) || 0,
                manufacturingDate: form.manufacturingDate || null,
                expiryDate: form.expiryDate || null,
            }

            if (editingProduct) {
                await api.updateProduct(editingProduct._id, body)
                addToast('Product updated', 'success')
            } else {
                await api.createProduct(body)
                addToast('Product added', 'success')
            }

            setModalOpen(false)
            loadProducts()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    function getExpiryStatus(product) {
        if (!product.expiryDate) return null
        const now = new Date()
        const expiry = new Date(product.expiryDate)
        const daysUntilExpiry = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiry <= 0) return 'expired'
        if (daysUntilExpiry <= 30) return 'expiring-soon'
        return 'valid'
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.barcode && p.barcode.includes(search))
    )

    return (
        <div className="inventory">
            <div className="page-header">
                <h1><Package size={24} /> Inventory</h1>
                <div className="page-actions">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search products…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Product
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Barcode</th>
                            <th>Price</th>
                            <th>Stock</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(p => {
                            const expiryStatus = getExpiryStatus(p)
                            return (
                                <tr key={p._id}>
                                    <td><strong>{p.name}</strong></td>
                                    <td><span className="badge badge-info">{p.category || '—'}</span></td>
                                    <td className="text-mono">{p.barcode || '—'}</td>
                                    <td>₹{p.price}</td>
                                    <td>{p.stock}</td>
                                    <td>
                                        {p.expiryDate ? (
                                            <span className={`expiry-date ${expiryStatus}`}>
                                                <Calendar size={12} />
                                                {new Date(p.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td>
                                        {expiryStatus === 'expired' ? (
                                            <span className="badge badge-danger">Expired</span>
                                        ) : expiryStatus === 'expiring-soon' ? (
                                            <span className="badge badge-warning">Expiring Soon</span>
                                        ) : p.stock < (p.lowStockThreshold || 5) ? (
                                            <span className="badge badge-danger">Low Stock</span>
                                        ) : (
                                            <span className="badge badge-success">In Stock</span>
                                        )}
                                    </td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(p)}>
                                            <Edit3 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="8" className="empty-state">No products found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingProduct ? 'Edit Product' : 'Add Product'}
            >
                <div className="form-group">
                    <label>Product Name</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Toor Dal 1kg" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Price (₹)</label>
                        <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group">
                        <label>Stock</label>
                        <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" />
                    </div>
                </div>
                <div className="form-group">
                    <label>Barcode</label>
                    <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Optional" />
                </div>
                <div className="form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                        <option>Groceries</option>
                        <option>Personal Care</option>
                        <option>Household</option>
                        <option>Baby Care</option>
                    </select>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label>Manufacturing Date</label>
                        <input type="date" value={form.manufacturingDate} onChange={(e) => setForm({ ...form, manufacturingDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Expiry Date</label>
                        <input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                    </div>
                </div>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {editingProduct ? 'Update' : 'Add Product'}
                    </button>
                </div>
            </Modal>
        </div>
    )
}
