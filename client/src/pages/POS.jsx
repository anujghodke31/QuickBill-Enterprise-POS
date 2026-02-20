import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Smartphone, Receipt } from 'lucide-react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import Modal from '../components/Modal'
import './POS.css'

const CATEGORIES = ['All', 'Groceries', 'Personal Care', 'Household', 'Baby Care']
const PAYMENT_METHODS = [
    { id: 'Cash', icon: Banknote, label: 'Cash' },
    { id: 'Card', icon: CreditCard, label: 'Card' },
    { id: 'UPI', icon: Smartphone, label: 'UPI' },
]

export default function POS() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('Cash')
    const [cashGiven, setCashGiven] = useState('')
    const [processing, setProcessing] = useState(false)
    const [receipt, setReceipt] = useState(null)
    const searchRef = useRef(null)
    const { addToast } = useToast()

    useEffect(() => {
        loadProducts()
    }, [])

    // Keyboard shortcut: F2 to focus search
    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === 'F2') {
                e.preventDefault()
                searchRef.current?.focus()
            }
            if (e.key === 'F9' && cart.length > 0) {
                e.preventDefault()
                setCheckoutOpen(true)
            }
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [cart])

    async function loadProducts() {
        try {
            const data = await api.getProducts()
            setProducts(data)
        } catch (err) {
            addToast('Failed to load products', 'error')
        }
    }

    // Filter products by category + search
    const filteredProducts = products.filter(p => {
        const matchCat = activeCategory === 'All' || p.category === activeCategory
        const term = search.toLowerCase()
        const matchSearch = !term ||
            p.name.toLowerCase().includes(term) ||
            (p.barcode && p.barcode.includes(term))
        return matchCat && matchSearch
    })

    // Barcode scan — auto-add on exact match
    const handleSearch = useCallback((value) => {
        setSearch(value)
        const exact = products.find(p => p.barcode === value.trim())
        if (exact) {
            addToCart(exact)
            setSearch('')
        }
    }, [products])

    function addToCart(product) {
        setCart(prev => {
            const idx = prev.findIndex(item => item._id === product._id)
            if (idx >= 0) {
                const updated = [...prev]
                updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 }
                return updated
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    function updateQty(id, delta) {
        setCart(prev => {
            return prev
                .map(item => item._id === id ? { ...item, quantity: item.quantity + delta } : item)
                .filter(item => item.quantity > 0)
        })
    }

    function clearCart() {
        setCart([])
    }

    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    async function handleCheckout() {
        if (paymentMethod === 'Cash' && (!cashGiven || parseFloat(cashGiven) < cartTotal)) {
            addToast('Insufficient cash amount', 'error')
            return
        }

        setProcessing(true)
        try {
            const body = {
                cartItems: cart.map(item => ({
                    productId: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
                paymentMethod,
                cashGiven: paymentMethod === 'Cash' ? parseFloat(cashGiven) : cartTotal,
            }

            const result = await api.createInvoice(body)
            addToast('Transaction completed!', 'success')

            setReceipt({
                ...result.invoice,
                notesReturned: result.notesReturned,
                cashGiven: parseFloat(cashGiven),
            })
            setCart([])
            setCashGiven('')
            loadProducts() // Refresh stock
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="pos">
            <div className="pos-left">
                {/* Search & Categories */}
                <div className="pos-search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search products or scan barcode… (F2)"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="category-tabs">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat}
                            className={`cat-btn ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Product Grid */}
                <div className="product-grid">
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state">No products found</div>
                    ) : (
                        filteredProducts.map(p => (
                            <button
                                key={p._id}
                                className="product-card"
                                onClick={() => addToCart(p)}
                                disabled={p.stock <= 0}
                            >
                                <div className="product-name">{p.name}</div>
                                <div className="product-price">₹{p.price}</div>
                                <span className={`product-stock ${p.stock < 5 ? 'low' : 'ok'}`}>
                                    {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Cart Panel */}
            <div className="pos-right">
                <div className="cart-header">
                    <h2><ShoppingCart size={20} /> Cart</h2>
                    {cart.length > 0 && (
                        <button className="btn btn-sm btn-secondary" onClick={clearCart}>
                            <Trash2 size={14} /> Clear
                        </button>
                    )}
                </div>

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <ShoppingCart size={40} strokeWidth={1} />
                            <p>Cart is empty</p>
                            <small>Scan or click products to add</small>
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item._id} className="cart-item">
                                <div className="cart-item-info">
                                    <span className="cart-item-name">{item.name}</span>
                                    <span className="cart-item-meta">₹{item.price} × {item.quantity}</span>
                                </div>
                                <div className="cart-item-actions">
                                    <button className="qty-btn" onClick={() => updateQty(item._id, -1)}>−</button>
                                    <span className="qty-display">{item.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQty(item._id, 1)}>+</button>
                                </div>
                                <span className="cart-item-total">₹{item.price * item.quantity}</span>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total-row">
                            <span>Total</span>
                            <span className="cart-total-value">₹{cartTotal.toLocaleString()}</span>
                        </div>
                        <button
                            className="btn btn-primary btn-lg checkout-btn"
                            onClick={() => setCheckoutOpen(true)}
                        >
                            <Receipt size={18} /> Checkout (F9)
                        </button>
                    </div>
                )}
            </div>

            {/* Checkout Modal */}
            <Modal isOpen={checkoutOpen && !receipt} onClose={() => setCheckoutOpen(false)} title="Checkout" width={440}>
                <div className="checkout-total">
                    <span>Total Amount</span>
                    <span className="checkout-total-value">₹{cartTotal.toLocaleString()}</span>
                </div>

                <div className="payment-methods">
                    {PAYMENT_METHODS.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            className={`payment-option ${paymentMethod === id ? 'active' : ''}`}
                            onClick={() => setPaymentMethod(id)}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </button>
                    ))}
                </div>

                {paymentMethod === 'Cash' && (
                    <div className="form-group">
                        <label htmlFor="cashGiven">Cash Given (₹)</label>
                        <input
                            id="cashGiven"
                            type="number"
                            placeholder="Enter cash amount"
                            value={cashGiven}
                            onChange={(e) => setCashGiven(e.target.value)}
                            min={cartTotal}
                            autoFocus
                        />
                        {cashGiven && parseFloat(cashGiven) >= cartTotal && (
                            <div className="change-display">
                                Change: <strong>₹{(parseFloat(cashGiven) - cartTotal).toFixed(2)}</strong>
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setCheckoutOpen(false)}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleCheckout}
                        disabled={processing}
                    >
                        {processing ? 'Processing…' : 'Complete Sale'}
                    </button>
                </div>
            </Modal>

            {/* Receipt Modal */}
            <Modal isOpen={!!receipt} onClose={() => { setReceipt(null); setCheckoutOpen(false) }} title="Receipt" width={400}>
                {receipt && (
                    <div className="receipt">
                        <div className="receipt-header">
                            <h3>QuickBill POS</h3>
                            <p>Invoice #{receipt.invoiceNumber || '—'}</p>
                            <p>{new Date(receipt.timestamp || Date.now()).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="receipt-items">
                            {(receipt.items || []).map((item, i) => (
                                <div key={i} className="receipt-item">
                                    <span>{item.name} × {item.quantity}</span>
                                    <span>₹{item.price * item.quantity}</span>
                                </div>
                            ))}
                        </div>
                        <div className="receipt-total">
                            <span>Total</span>
                            <span>₹{receipt.totalAmount?.toLocaleString()}</span>
                        </div>
                        {receipt.paymentMethod === 'Cash' && receipt.cashGiven > receipt.totalAmount && (
                            <div className="receipt-change">
                                <span>Cash Given</span><span>₹{receipt.cashGiven}</span>
                                <span>Change</span><span>₹{(receipt.cashGiven - receipt.totalAmount).toFixed(2)}</span>
                            </div>
                        )}
                        <button
                            className="btn btn-primary btn-lg"
                            style={{ width: '100%', marginTop: 16 }}
                            onClick={() => { setReceipt(null); setCheckoutOpen(false) }}
                        >
                            Done
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    )
}
