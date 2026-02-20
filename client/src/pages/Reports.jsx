import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import './Reports.css'

export default function Reports() {
    const [invoices, setInvoices] = useState([])
    const { addToast } = useToast()

    useEffect(() => {
        loadInvoices()
    }, [])

    async function loadInvoices() {
        try {
            setInvoices(await api.getInvoices())
        } catch (err) {
            addToast('Failed to load reports', 'error')
        }
    }

    const totalRevenue = invoices.reduce((sum, i) => sum + i.totalAmount, 0)

    return (
        <div className="reports">
            <div className="page-header">
                <h1><FileText size={24} /> Transaction Reports</h1>
                <div className="reports-summary">
                    <span className="summary-item">
                        <span className="summary-label">Total Transactions</span>
                        <span className="summary-value">{invoices.length}</span>
                    </span>
                    <span className="summary-item">
                        <span className="summary-label">Total Revenue</span>
                        <span className="summary-value">₹{totalRevenue.toLocaleString()}</span>
                    </span>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Invoice #</th>
                            <th>Date & Time</th>
                            <th>Items</th>
                            <th>Payment</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(inv => (
                            <tr key={inv._id}>
                                <td className="text-mono">{inv.invoiceNumber || inv._id.slice(-6).toUpperCase()}</td>
                                <td>{new Date(inv.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                <td>
                                    <span className="items-preview">
                                        {inv.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${inv.paymentMethod === 'Cash' ? 'badge-success' :
                                            inv.paymentMethod === 'Card' ? 'badge-info' : 'badge-warning'
                                        }`}>
                                        {inv.paymentMethod}
                                    </span>
                                </td>
                                <td className="amount-cell">₹{inv.totalAmount.toLocaleString()}</td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan="5" className="empty-state">No transactions yet</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
