import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, ShoppingBag, Clock, ChevronRight } from 'lucide-react'
import { api } from '../../api/api'
import './CustomerAccount.css'

export default function CustomerAccount() {
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [email] = useState(() => localStorage.getItem('quickbill_customer_email') || '')

    async function loadOrders() {
        if (!email) { setLoading(false); return }
        try {
            const data = await api.getMyOrders(email)
            setOrders(data || [])
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadOrders()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])



    const statusColors = {
        'pending': { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
        'confirmed': { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
        'shipped': { bg: 'rgba(38, 70, 83,0.12)', color: '#264653' },
        'delivered': { bg: 'rgba(34,197,94,0.12)', color: '#22c55e' },
        'cancelled': { bg: 'rgba(239,68,68,0.12)', color: '#ef4444' },
    }

    return (
        <div className="account">
            <h1 className="account-title"><User size={22} /> My Account</h1>

            <div className="account-section">
                <h2><Package size={18} /> Order History</h2>
                {loading ? (
                    <div className="account-loading">Loading orders…</div>
                ) : orders.length === 0 ? (
                    <div className="account-empty">
                        <ShoppingBag size={40} />
                        <p>No orders yet</p>
                        <Link to="/shop" className="btn-hero-primary">Start Shopping</Link>
                    </div>
                ) : (
                    <div className="order-list">
                        {orders.map(order => {
                            const style = statusColors[order.status] || statusColors['pending']
                            return (
                                <div className="order-card" key={order._id}>
                                    <div className="order-card-header">
                                        <div>
                                            <span className="order-card-id">#{order._id?.slice(-8)}</span>
                                            <span className="order-card-date">
                                                <Clock size={13} />
                                                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <span className="order-status" style={{
                                            background: style.bg, color: style.color
                                        }}>{order.status}</span>
                                    </div>
                                    <div className="order-card-items">
                                        {order.items?.slice(0, 3).map((item, i) => (
                                            <span key={i} className="order-card-item">
                                                {item.quantity}× {item.name}
                                            </span>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <span className="order-card-more">+{order.items.length - 3} more</span>
                                        )}
                                    </div>
                                    <div className="order-card-footer">
                                        <span className="order-card-total">₹{order.totalAmount}</span>
                                        <ChevronRight size={16} className="order-card-arrow" />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
