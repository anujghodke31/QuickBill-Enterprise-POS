import { useState, useEffect } from 'react'
import { FileText, Download } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import './Reports.css'

export default function Reports() {
    const [invoices, setInvoices] = useState([])
    const [downloadingId, setDownloadingId] = useState('')
    const { addToast } = useToast()

    useEffect(() => {
        loadInvoices()
    }, [])

    async function loadInvoices() {
        try {
            setInvoices(await api.getInvoices())
        } catch (_) {
            addToast('Failed to load reports', 'error')
        }
    }

    async function handleDownload(invoice) {
        setDownloadingId(invoice._id)
        try {
            const blob = await api.downloadInvoiceReceipt(invoice._id)
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `${invoice.invoiceNumber || `invoice-${invoice._id}`}.pdf`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            URL.revokeObjectURL(url)
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setDownloadingId('')
        }
    }

    const totalRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount || 0), 0)

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
                        <span className="summary-value">INR {totalRevenue.toLocaleString()}</span>
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
                            <th>Discount</th>
                            <th>Amount</th>
                            <th>Receipt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map((invoice) => (
                            <tr key={invoice._id}>
                                <td className="text-mono">{invoice.invoiceNumber || invoice._id.slice(-6).toUpperCase()}</td>
                                <td>{new Date(invoice.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                <td>
                                    <span className="items-preview">
                                        {invoice.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge ${
                                        invoice.paymentMethod === 'Cash'
                                            ? 'badge-success'
                                            : invoice.paymentMethod === 'Card'
                                                ? 'badge-info'
                                                : 'badge-warning'
                                    }`}>
                                        {invoice.paymentMethod}
                                    </span>
                                </td>
                                <td>
                                    {Number(invoice.discount || 0) > 0 ? (
                                        <span className="discount-badge">- INR {Number(invoice.discount).toFixed(2)}</span>
                                    ) : '-'}
                                </td>
                                <td className="amount-cell">INR {Number(invoice.totalAmount || 0).toLocaleString()}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-secondary download-btn"
                                        onClick={() => handleDownload(invoice)}
                                        disabled={downloadingId === invoice._id}
                                    >
                                        <Download size={14} />
                                        {downloadingId === invoice._id ? 'Downloading...' : 'Download PDF'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {invoices.length === 0 && (
                            <tr>
                                <td colSpan="7" className="empty-state">No transactions yet</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
