import { useState, useEffect } from 'react'
import { UserCog, Plus, Search, Edit3, Trash2, Shield, User } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import Modal from '../components/Modal'
import './Employees.css'

export default function Employees() {
    const [employees, setEmployees] = useState([])
    const [search, setSearch] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [deleteModal, setDeleteModal] = useState(null)
    const [editingEmp, setEditingEmp] = useState(null)
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'cashier' })
    const { addToast } = useToast()

    useEffect(() => { loadEmployees() }, [])

    async function loadEmployees() {
        try {
            setEmployees(await api.getEmployees())
        } catch (err) {
            addToast('Failed to load employees', 'error')
        }
    }

    function openAdd() {
        setEditingEmp(null)
        setForm({ name: '', username: '', password: '', role: 'cashier' })
        setModalOpen(true)
    }

    function openEdit(emp) {
        setEditingEmp(emp)
        setForm({ name: emp.name, username: emp.username, password: '', role: emp.role })
        setModalOpen(true)
    }

    async function handleSave() {
        if (!form.name || !form.username) {
            addToast('Name and username are required', 'error')
            return
        }
        if (!editingEmp && !form.password) {
            addToast('Password is required for new employees', 'error')
            return
        }

        try {
            const body = { ...form }
            if (editingEmp && !body.password) delete body.password

            if (editingEmp) {
                await api.updateEmployee(editingEmp._id, body)
                addToast('Employee updated', 'success')
            } else {
                await api.createEmployee(body)
                addToast('Employee added', 'success')
            }

            setModalOpen(false)
            loadEmployees()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    async function handleDelete() {
        try {
            await api.deleteEmployee(deleteModal._id)
            addToast('Employee removed', 'success')
            setDeleteModal(null)
            loadEmployees()
        } catch (err) {
            addToast(err.message, 'error')
        }
    }

    const filtered = employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.username.toLowerCase().includes(search.toLowerCase())
    )

    const adminCount = employees.filter(e => e.role === 'admin').length
    const cashierCount = employees.filter(e => e.role === 'cashier').length

    return (
        <div className="employees">
            <div className="page-header">
                <h1><UserCog size={24} /> Employees</h1>
                <div className="page-actions">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search employees…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={openAdd}>
                        <Plus size={16} /> Add Employee
                    </button>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="emp-stats">
                <div className="emp-stat-card">
                    <UserCog size={20} />
                    <div>
                        <span className="emp-stat-value">{employees.length}</span>
                        <span className="emp-stat-label">Total Staff</span>
                    </div>
                </div>
                <div className="emp-stat-card">
                    <Shield size={20} />
                    <div>
                        <span className="emp-stat-value">{adminCount}</span>
                        <span className="emp-stat-label">Admins</span>
                    </div>
                </div>
                <div className="emp-stat-card">
                    <User size={20} />
                    <div>
                        <span className="emp-stat-value">{cashierCount}</span>
                        <span className="emp-stat-label">Cashiers</span>
                    </div>
                </div>
            </div>

            {/* Employee Table */}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Joined</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(emp => (
                            <tr key={emp._id}>
                                <td>
                                    <div className="emp-name-cell">
                                        <div className="emp-avatar">
                                            {emp.name.charAt(0).toUpperCase()}
                                        </div>
                                        <strong>{emp.name}</strong>
                                    </div>
                                </td>
                                <td className="text-mono">@{emp.username}</td>
                                <td>
                                    <span className={`badge ${emp.role === 'admin' ? 'badge-accent' : 'badge-info'}`}>
                                        {emp.role === 'admin' ? '🛡️ Admin' : '💳 Cashier'}
                                    </span>
                                </td>
                                <td>
                                    {new Date(emp.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit', month: 'short', year: 'numeric'
                                    })}
                                </td>
                                <td>
                                    <div className="action-btns">
                                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(emp)} title="Edit">
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="btn btn-sm btn-danger" onClick={() => setDeleteModal(emp)} title="Delete">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan="5" className="empty-state">No employees found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingEmp ? 'Edit Employee' : 'Add Employee'}>
                <div className="form-group">
                    <label>Full Name</label>
                    <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" />
                </div>
                <div className="form-group">
                    <label>Username</label>
                    <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="e.g. johndoe" />
                </div>
                <div className="form-group">
                    <label>{editingEmp ? 'New Password (leave blank to keep)' : 'Password'}</label>
                    <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editingEmp ? 'Unchanged' : 'Enter password'} />
                </div>
                <div className="form-group">
                    <label>Role</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                        <option value="cashier">Cashier</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>
                        {editingEmp ? 'Update' : 'Add Employee'}
                    </button>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Employee">
                <p style={{ marginBottom: '1rem' }}>
                    Are you sure you want to remove <strong>{deleteModal?.name}</strong>? This action cannot be undone.
                </p>
                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
                    <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                </div>
            </Modal>
        </div>
    )
}
