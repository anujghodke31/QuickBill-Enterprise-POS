import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, Search, RefreshCcw, Receipt, AlertTriangle } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import './Returns.css'

function getProductId(item) {
    if (!item?.productId) return ''
    if (typeof item.productId === 'string') return item.productId
    if (typeof item.productId === 'object' && item.productId._id) return String(item.productId._id)
    return String(item.productId)
}

export default function Returns() {
    const [invoiceQuery, setInvoiceQuery] = useState('')
    const [invoice, setInvoice] = useState(null)
    const [returnedQuantities, setReturnedQuantities] = useState({})
    const [selectedQuantities, setSelectedQuantities] = useState({})
    const [reason, setReason] = useState('')
    const [returns, setReturns] = useState([])
    const [loadingInvoice, setLoadingInvoice] = useState(false)
    const [processing, setProcessing] = useState(false)
    const { addToast } = useToast()

    useEffect(() => {
        loadReturns()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function loadReturns() {
        try {
            setReturns(await api.getReturns())
        } catch {
            addToast('Failed to load return history', 'error')
        }
    }

    async function lookupInvoice() {
        if (!invoiceQuery.trim()) {
            addToast('Enter invoice number or id', 'error')
            return
        }

        setLoadingInvoice(true)
        try {
            const data = await api.getReturnInvoice(invoiceQuery.trim())
            setInvoice(data.invoice)
            setReturnedQuantities(data.returnedQuantities || {})
            setSelectedQuantities({})
            setReason('')
            addToast('Invoice loaded', 'success')
        } catch (err) {
            setInvoice(null)
            setReturnedQuantities({})
            setSelectedQuantities({})
            addToast(err.message, 'error')
        } finally {
            setLoadingInvoice(false)
        }
    }

    function setItemQuantity(productId, value, max) {
        const parsed = Number(value)
        if (!Number.isFinite(parsed) || parsed < 0) return
        const clamped = Math.min(Math.floor(parsed), max)
        setSelectedQuantities((prev) => ({
            ...prev,
            [productId]: clamped,
        }))
    }

    const invoiceItemRows = useMemo(() => {
        if (!invoice?.items) return []

        return invoice.items.map((item) => {
            const productId = getProductId(item)
            const soldQty = Number(item.quantity || 0)
            const alreadyReturned = Number(returnedQuantities[productId] || 0)
            const remainingQty = Math.max(0, soldQty - alreadyReturned)
            const selectedQty = Number(selectedQuantities[productId] || 0)

            return {
                productId,
                name: item.name,
                price: Number(item.price || 0),
                soldQty,
                alreadyReturned,
                remainingQty,
                selectedQty: Math.min(selectedQty, remainingQty),
            }
        })
    }, [invoice, returnedQuantities, selectedQuantities])

    const selectedItems = invoiceItemRows
        .filter((row) => row.selectedQty > 0)
        .map((row) => ({ productId: row.productId, quantity: row.selectedQty }))

    const refundPreview = invoiceItemRows.reduce((sum, row) => {
        return sum + row.selectedQty * row.price
    }, 0)

    async function processReturn() {
        if (!invoice) {
            addToast('Lookup an invoice first', 'error')
            return
        }

        if (selectedItems.length === 0) {
            addToast('Select at least one item quantity', 'error')
            return
        }

        setProcessing(true)
        try {
            const created = await api.createReturn({
                invoiceId: invoice._id,
                items: selectedItems,
                reason,
            })

            addToast(`Return processed: INR ${created.refundAmount.toFixed(2)}`, 'success')
            await loadReturns()
            await lookupInvoice()
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="returns">
            <div className="page-header">
                <h1><RotateCcw size={24} /> Returns & Refunds</h1>
            </div>

            <div className="card return-lookup-card">
                <div className="return-lookup-row">
                    <div className="search-wrap">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Enter invoice number (e.g. INV-...) or invoice id"
                            value={invoiceQuery}
                            onChange={(event) => setInvoiceQuery(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') lookupInvoice()
                            }}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={lookupInvoice} disabled={loadingInvoice}>
                        <Search size={16} /> {loadingInvoice ? 'Searching...' : 'Lookup Invoice'}
                    </button>
                </div>
            </div>

            {invoice && (
                <div className="card return-invoice-card">
                    <div className="return-invoice-header">
                        <div>
                            <h3><Receipt size={18} /> Invoice {invoice.invoiceNumber || invoice._id}</h3>
                            <p>
                                {new Date(invoice.timestamp).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                                {invoice.customer?.name ? ` - ${invoice.customer.name}` : ''}
                            </p>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Sold</th>
                                    <th>Returned</th>
                                    <th>Remaining</th>
                                    <th>Return Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoiceItemRows.map((row) => (
                                    <tr key={row.productId}>
                                        <td><strong>{row.name}</strong></td>
                                        <td>INR {row.price.toFixed(2)}</td>
                                        <td>{row.soldQty}</td>
                                        <td>{row.alreadyReturned}</td>
                                        <td>{row.remainingQty}</td>
                                        <td>
                                            <input
                                                className="qty-input"
                                                type="number"
                                                min={0}
                                                max={row.remainingQty}
                                                value={row.selectedQty}
                                                onChange={(event) => setItemQuantity(row.productId, event.target.value, row.remainingQty)}
                                                disabled={row.remainingQty === 0}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="return-form-grid">
                        <div className="form-group">
                            <label>Reason (optional)</label>
                            <textarea
                                rows={3}
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="Damaged product, wrong item, customer change of mind, etc."
                            />
                        </div>
                        <div className="return-summary-card">
                            <p className="return-summary-label">Refund Preview</p>
                            <p className="return-summary-value">INR {refundPreview.toFixed(2)}</p>
                            <button className="btn btn-primary" onClick={processReturn} disabled={processing}>
                                <RefreshCcw size={16} /> {processing ? 'Processing...' : 'Process Refund'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card return-history-card">
                <h3>Return History</h3>
                {returns.length === 0 ? (
                    <div className="return-empty-state">
                        <AlertTriangle size={26} />
                        <p>No returns processed yet</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Return ID</th>
                                    <th>Invoice</th>
                                    <th>Items</th>
                                    <th>Refund</th>
                                    <th>Reason</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.map((returnRecord) => (
                                    <tr key={returnRecord._id}>
                                        <td className="text-mono">{returnRecord._id.slice(-8).toUpperCase()}</td>
                                        <td>{returnRecord.invoiceNumber}</td>
                                        <td>
                                            {returnRecord.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
                                        </td>
                                        <td><strong>INR {Number(returnRecord.refundAmount || 0).toFixed(2)}</strong></td>
                                        <td>{returnRecord.reason || '-'}</td>
                                        <td>
                                            {new Date(returnRecord.timestamp).toLocaleString('en-IN', {
                                                dateStyle: 'medium',
                                                timeStyle: 'short',
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

