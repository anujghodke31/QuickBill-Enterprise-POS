import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import './Cart.css'

export default function Cart() {
    const { cart, updateQuantity, removeFromCart, cartTotal, cartCount } = useCart()
    const [removingId, setRemovingId] = useState(null)
    const [qtyBounceId, setQtyBounceId] = useState(null)

    function handleRemove(id) {
        setRemovingId(id)
        setTimeout(() => {
            removeFromCart(id)
            setRemovingId(null)
        }, 350)
    }

    function handleQtyChange(id, newQty) {
        updateQuantity(id, newQty)
        setQtyBounceId(id)
        setTimeout(() => setQtyBounceId(null), 250)
    }

    if (cart.length === 0) {
        return (
            <div className="cart-empty">
                <div className="cart-empty-icon">
                    <ShoppingBag size={56} />
                </div>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything yet</p>
                <Link to="/shop" className="btn-hero-primary">
                    <ArrowLeft size={16} /> Continue Shopping
                </Link>
            </div>
        )
    }

    return (
        <div className="cart-page">
            <h1 className="cart-title">Shopping Cart <span>({cartCount} items)</span></h1>

            <div className="cart-layout">
                <div className="cart-items">
                    {cart.map((item, i) => (
                        <div
                            className={`cart-item ${removingId === item._id ? 'cart-item--removing' : ''}`}
                            key={item._id}
                            style={{ animationDelay: `${i * 60}ms` }}
                        >
                            <div className="cart-item-img">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} />
                                ) : (
                                    <div className="cart-item-placeholder">{item.name.charAt(0)}</div>
                                )}
                            </div>
                            <div className="cart-item-info">
                                <Link to={`/product/${item._id}`} className="cart-item-name">{item.name}</Link>
                                {item.brand && <span className="cart-item-brand">{item.brand}</span>}
                                <div className="cart-item-price-row">
                                    <span className="cart-item-price">₹{item.price}</span>
                                    {item.compareAtPrice && item.compareAtPrice > item.price && (
                                        <span className="cart-item-compare">₹{item.compareAtPrice}</span>
                                    )}
                                </div>
                            </div>
                            <div className="cart-item-actions">
                                <div className="cart-qty">
                                    <button onClick={() => handleQtyChange(item._id, item.quantity - 1)}>
                                        <Minus size={14} />
                                    </button>
                                    <span className={qtyBounceId === item._id ? 'cart-qty-bounce' : ''}>
                                        {item.quantity}
                                    </span>
                                    <button onClick={() => handleQtyChange(item._id, item.quantity + 1)}>
                                        <Plus size={14} />
                                    </button>
                                </div>
                                <span className="cart-item-subtotal">₹{item.price * item.quantity}</span>
                                <button className="cart-item-remove" onClick={() => handleRemove(item._id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <aside className="cart-summary">
                    <h3>Order Summary</h3>
                    <div className="summary-row">
                        <span>Subtotal ({cartCount} items)</span>
                        <span>₹{cartTotal}</span>
                    </div>
                    <div className="summary-row">
                        <span>Shipping</span>
                        <span className="summary-free">FREE</span>
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-row summary-total">
                        <span>Total</span>
                        <span>₹{cartTotal}</span>
                    </div>
                    <Link to="/checkout" className="btn-checkout">
                        Proceed to Checkout <ArrowRight size={16} />
                    </Link>
                    <Link to="/shop" className="btn-continue">Continue Shopping</Link>
                </aside>
            </div>
        </div>
    )
}
