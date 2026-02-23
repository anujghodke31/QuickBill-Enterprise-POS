import { useState, useEffect } from 'react'
import { Package, Clock, Truck, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { api } from '../api/api'
import './Orders.css'

export default function Orders() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [expandedId, setExpandedId] = useState(null)

    useEffect(() => { loadOrders() }, [])

    async function loadOrders() {
        try {
            const data = await api.getOrders()
            setOrders(data || [])
        } catch (err) { console.error(err) }
        setLoading(false)
    }

    async function handleStatusChange(orderId, newStatus) {
        try {
            await api.updateOrderStatus(orderId, { status: newStatus })
            loadOrders()
        } catch (err) { alert(err.message) }
    }

    const statusConfig = {
        pending: { icon: Clock, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        confirmed: { icon: Package, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
        shipped: { icon: Truck, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
        delivered: { icon: CheckCircle, color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
        cancelled: { icon: XCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    }

    const statusOptions = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']

    if (loading) return <div className="orders-page"><p>Loading orders…</p></div>

    return (
        <div className="orders-page">
            <div className="page-header"><h1>Orders</h1></div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <Package size={40} />
                    <p>No orders yet</p>
                </div>
            ) : (
                <div className="orders-list">
                    {orders.map(order => {
                        const config = statusConfig[order.status] || statusConfig.pending
                        const StatusIcon = config.icon
                        const isExpanded = expandedId === order._id

                        return (
                            <div className={`order-row ${isExpanded ? 'expanded' : ''}`} key={order._id}>
                                <div className="order-row-main" onClick={() => setExpandedId(isExpanded ? null : order._id)}>
                                    <div className="order-row-id">
                                        <span className="order-id">#{order._id?.slice(-8)}</span>
                                        <span className="order-date">{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                    <div className="order-row-customer">
                                        <strong>{order.customer?.name}</strong>
                                        <span>{order.customer?.phone}</span>
                                    </div>
                                    <div className="order-row-items">
                                        {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                                    </div>
                                    <div className="order-row-total">₹{order.totalAmount}</div>
                                    <div className="order-row-status">
                                        <span className="status-badge" style={{ background: config.bg, color: config.color }}>
                                            <StatusIcon size={13} /> {order.status}
                                        </span>
                                    </div>
                                    <ChevronDown size={16} className={`expand-icon ${isExpanded ? 'rotated' : ''}`} />
                                </div>

                                {isExpanded && (
                                    <div className="order-row-details">
                                        <div className="detail-grid">
                                            <div className="detail-section">
                                                <h4>Customer</h4>
                                                <p>{order.customer?.name}</p>
                                                <p>{order.customer?.email}</p>
                                                <p>{order.customer?.phone}</p>
                                            </div>
                                            <div className="detail-section">
                                                <h4>Shipping Address</h4>
                                                <p>{order.shippingAddress?.address}</p>
                                                <p>{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.pincode}</p>
                                            </div>
                                            <div className="detail-section">
                                                <h4>Payment</h4>
                                                <p>Method: <strong>{order.paymentMethod?.toUpperCase()}</strong></p>
                                                <p>Status: <strong>{order.paymentStatus}</strong></p>
                                            </div>
                                        </div>
                                        <div className="detail-items">
                                            <h4>Items</h4>
                                            {order.items?.map((item, i) => (
                                                <div className="detail-item" key={i}>
                                                    <span>{item.quantity}× {item.name}</span>
                                                    <span>₹{item.price * item.quantity}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="detail-actions">
                                            <label>Update Status:</label>
                                            <select value={order.status} onChange={(e) => handleStatusChange(order._id, e.target.value)}>
                                                {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
