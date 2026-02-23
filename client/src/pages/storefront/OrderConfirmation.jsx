import { useParams, Link } from 'react-router-dom'
import { CheckCircle, Package, ArrowRight } from 'lucide-react'
import './OrderConfirmation.css'

export default function OrderConfirmation() {
    const { id } = useParams()

    return (
        <div className="order-confirm">
            <div className="order-confirm-card">
                <div className="order-confirm-icon">
                    <CheckCircle size={56} />
                </div>
                <h1>Order Placed Successfully!</h1>
                <p className="order-confirm-sub">Thank you for your purchase. Your order has been received and is being processed.</p>

                {id && (
                    <div className="order-confirm-id">
                        <Package size={16} />
                        <span>Order ID: <strong>{id}</strong></span>
                    </div>
                )}

                <div className="order-confirm-actions">
                    <Link to="/shop" className="btn-hero-primary">
                        Continue Shopping <ArrowRight size={16} />
                    </Link>
                    <Link to="/account" className="order-confirm-link">View My Orders</Link>
                </div>
            </div>
        </div>
    )
}
