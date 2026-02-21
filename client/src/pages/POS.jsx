import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Smartphone, Receipt, User } from 'lucide-react'
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
const DEFAULT_LOYALTY = { eligible: false, purchaseCount: 0, discountPercent: 0 }
const roundAmount = (value) => Math.round((value + Number.EPSILON) * 100) / 100

export default function POS() {
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [cart, setCart] = useState([])
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState('All')
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState('Cash')
    const [cashGiven, setCashGiven] = useState('')
    const [selectedCustomerId, setSelectedCustomerId] = useState('')
    const [loyaltyStatus, setLoyaltyStatus] = useState(DEFAULT_LOYALTY)
    const [processing, setProcessing] = useState(false)
    const [receipt, setReceipt] = useState(null)
    const searchRef = useRef(null)
    const { addToast } = useToast()

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (!selectedCustomerId) {
            setLoyaltyStatus(DEFAULT_LOYALTY)
            return
        }

        checkLoyaltyEligibility(selectedCustomerId)
    }, [selectedCustomerId])

    useEffect(() => {
        const handleKey = (event) => {
            if (event.key === 'F2') {
                event.preventDefault()
                searchRef.current?.focus()
            }
            if (event.key === 'F9' && cart.length > 0) {
                event.preventDefault()
                setCheckoutOpen(true)
            }
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [cart.length])

    async function loadInitialData() {
        await Promise.all([loadProducts(), loadCustomers()])
    }

    async function loadProducts() {
        try {
            setProducts(await api.getProducts())
        } catch (_) {
            addToast('Failed to load products', 'error')
        }
    }

    async function loadCustomers() {
        try {
            setCustomers(await api.getCustomers())
        } catch (_) {
            addToast('Failed to load customers', 'error')
        }
    }

    async function checkLoyaltyEligibility(customerId) {
        try {
            setLoyaltyStatus(await api.getLoyaltyStatus(customerId))
        } catch (err) {
            setLoyaltyStatus(DEFAULT_LOYALTY)
            addToast(err.message, 'error')
        }
    }

    const filteredProducts = products.filter((product) => {
        const matchCategory = activeCategory === 'All' || product.category === activeCategory
        const term = search.toLowerCase()
        const matchSearch =
            !term ||
            product.name.toLowerCase().includes(term) ||
            (product.barcode && product.barcode.includes(term))
        return matchCategory && matchSearch
    })

    const handleSearch = useCallback((value) => {
        setSearch(value)
        const exact = products.find((product) => product.barcode === value.trim())
        if (exact) {
            addToCart(exact)
            setSearch('')
        }
    }, [products])

    function addToCart(product) {
        setCart((prev) => {
            const existingIndex = prev.findIndex((item) => item._id === product._id)
            if (existingIndex >= 0) {
                const updated = [...prev]
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: updated[existingIndex].quantity + 1,
                }
                return updated
            }
            return [...prev, { ...product, quantity: 1 }]
        })
    }

    function updateQty(id, delta) {
        setCart((prev) => prev
            .map((item) => item._id === id ? { ...item, quantity: item.quantity + delta } : item)
            .filter((item) => item.quantity > 0))
    }

    function clearCart() {
        setCart([])
    }

    const cartSubTotal = roundAmount(cart.reduce((sum, item) => sum + item.price * item.quantity, 0))
    const loyaltyDiscount = loyaltyStatus.eligible
        ? roundAmount(cartSubTotal * (Number(loyaltyStatus.discountPercent || 10) / 100))
        : 0
    const payableTotal = roundAmount(cartSubTotal - loyaltyDiscount)

    async function handleCheckout() {
        if (cart.length === 0) {
            addToast('Cart is empty', 'error')
            return
        }

        const parsedCashGiven = Number(cashGiven)
        if (paymentMethod === 'Cash' && (!Number.isFinite(parsedCashGiven) || parsedCashGiven < payableTotal)) {
            addToast('Insufficient cash amount', 'error')
            return
        }

        setProcessing(true)
        try {
            const body = {
                cartItems: cart.map((item) => ({
                    productId: item._id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                })),
                customerId: selectedCustomerId || null,
                paymentMethod,
                cashGiven: paymentMethod === 'Cash' ? parsedCashGiven : payableTotal,
            }

            const result = await api.createInvoice(body)
            addToast('Transaction completed', 'success')

            const selectedCustomer = customers.find((customer) => customer._id === selectedCustomerId) || null
            setReceipt({
                ...result.invoice,
                notesReturned: result.notesReturned || {},
                cashGiven: paymentMethod === 'Cash' ? parsedCashGiven : null,
                customer: selectedCustomer,
            })

            setCart([])
            setCashGiven('')
            setSelectedCustomerId('')
            setLoyaltyStatus(DEFAULT_LOYALTY)
            await loadProducts()
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="pos">
            <div className="pos-left">
                <div className="pos-search-bar">
                    <Search size={18} className="search-icon" />
                    <input
                        ref={searchRef}
                        type="text"
                        placeholder="Search products or scan barcode... (F2)"
                        value={search}
                        onChange={(event) => handleSearch(event.target.value)}
                    />
                </div>

                <div className="category-tabs">
                    {CATEGORIES.map((category) => (
                        <button
                            key={category}
                            className={`cat-btn ${activeCategory === category ? 'active' : ''}`}
                            onClick={() => setActiveCategory(category)}
                        >
                            {category}
                        </button>
                    ))}
                </div>

                <div className="product-grid">
                    {filteredProducts.length === 0 ? (
                        <div className="empty-state">No products found</div>
                    ) : (
                        filteredProducts.map((product) => (
                            <button
                                key={product._id}
                                className="product-card"
                                onClick={() => addToCart(product)}
                                disabled={product.stock <= 0}
                            >
                                <div className="product-name">{product.name}</div>
                                <div className="product-price">INR {product.price}</div>
                                <span className={`product-stock ${product.stock < 5 ? 'low' : 'ok'}`}>
                                    {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>

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
                        cart.map((item) => (
                            <div key={item._id} className="cart-item">
                                <div className="cart-item-info">
                                    <span className="cart-item-name">{item.name}</span>
                                    <span className="cart-item-meta">INR {item.price} x {item.quantity}</span>
                                </div>
                                <div className="cart-item-actions">
                                    <button className="qty-btn" onClick={() => updateQty(item._id, -1)}>-</button>
                                    <span className="qty-display">{item.quantity}</span>
                                    <button className="qty-btn" onClick={() => updateQty(item._id, 1)}>+</button>
                                </div>
                                <span className="cart-item-total">INR {item.price * item.quantity}</span>
                            </div>
                        ))
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total-row">
                            <span>Subtotal</span>
                            <span className="cart-total-value">INR {cartSubTotal.toLocaleString()}</span>
                        </div>
                        {loyaltyDiscount > 0 && (
                            <div className="cart-total-row discount-row">
                                <span>Loyalty Discount</span>
                                <span className="discount-value">- INR {loyaltyDiscount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="cart-total-row grand-total-row">
                            <span>Total</span>
                            <span className="cart-total-value">INR {payableTotal.toLocaleString()}</span>
                        </div>
                        <button className="btn btn-primary btn-lg checkout-btn" onClick={() => setCheckoutOpen(true)}>
                            <Receipt size={18} /> Checkout (F9)
                        </button>
                    </div>
                )}
            </div>

            <Modal isOpen={checkoutOpen && !receipt} onClose={() => setCheckoutOpen(false)} title="Checkout" width={460}>
                <div className="form-group">
                    <label htmlFor="checkoutCustomer"><User size={14} /> Customer (optional)</label>
                    <select
                        id="checkoutCustomer"
                        value={selectedCustomerId}
                        onChange={(event) => setSelectedCustomerId(event.target.value)}
                    >
                        <option value="">Walk-in Customer</option>
                        {customers.map((customer) => (
                            <option key={customer._id} value={customer._id}>
                                {customer.name} ({customer.phone})
                            </option>
                        ))}
                    </select>
                    {selectedCustomerId && loyaltyStatus.eligible && (
                        <div className="loyalty-badge">
                            Eligible for {loyaltyStatus.discountPercent}% discount ({loyaltyStatus.purchaseCount} purchases in last 30 days)
                        </div>
                    )}
                    {selectedCustomerId && !loyaltyStatus.eligible && (
                        <div className="loyalty-note">
                            Not eligible yet: {loyaltyStatus.purchaseCount} purchases in last 30 days (minimum 3 required)
                        </div>
                    )}
                </div>

                <div className="checkout-total">
                    <span>Subtotal</span>
                    <span className="checkout-total-value">INR {cartSubTotal.toLocaleString()}</span>
                </div>
                {loyaltyDiscount > 0 && (
                    <div className="checkout-total discount">
                        <span>Loyalty Discount</span>
                        <span className="checkout-total-value">- INR {loyaltyDiscount.toLocaleString()}</span>
                    </div>
                )}
                <div className="checkout-total final">
                    <span>Payable Amount</span>
                    <span className="checkout-total-value">INR {payableTotal.toLocaleString()}</span>
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
                        <label htmlFor="cashGiven">Cash Given (INR)</label>
                        <input
                            id="cashGiven"
                            type="number"
                            placeholder="Enter cash amount"
                            value={cashGiven}
                            onChange={(event) => setCashGiven(event.target.value)}
                            min={payableTotal}
                            autoFocus
                        />
                        {cashGiven && Number(cashGiven) >= payableTotal && (
                            <div className="change-display">
                                Change: <strong>INR {(Number(cashGiven) - payableTotal).toFixed(2)}</strong>
                            </div>
                        )}
                    </div>
                )}

                <div className="form-actions">
                    <button className="btn btn-secondary" onClick={() => setCheckoutOpen(false)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCheckout} disabled={processing}>
                        {processing ? 'Processing...' : 'Complete Sale'}
                    </button>
                </div>
            </Modal>

            <Modal isOpen={!!receipt} onClose={() => { setReceipt(null); setCheckoutOpen(false) }} title="Receipt" width={420}>
                {receipt && (
                    <div className="receipt">
                        <div className="receipt-header">
                            <h3>QuickBill POS</h3>
                            <p>Invoice #{receipt.invoiceNumber || '-'}</p>
                            <p>{new Date(receipt.timestamp || Date.now()).toLocaleString('en-IN')}</p>
                            {receipt.customer?.name && <p>Customer: {receipt.customer.name}</p>}
                        </div>
                        <div className="receipt-items">
                            {(receipt.items || []).map((item, index) => (
                                <div key={`${item.productId || item.name}-${index}`} className="receipt-item">
                                    <span>{item.name} x {item.quantity}</span>
                                    <span>INR {(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="receipt-summary">
                            <div className="receipt-row">
                                <span>Subtotal</span>
                                <span>INR {Number(receipt.subTotal || receipt.totalAmount || 0).toFixed(2)}</span>
                            </div>
                            {Number(receipt.discount || 0) > 0 && (
                                <div className="receipt-row discount-value">
                                    <span>Discount</span>
                                    <span>- INR {Number(receipt.discount).toFixed(2)}</span>
                                </div>
                            )}
                            <div className="receipt-total">
                                <span>Total</span>
                                <span>INR {Number(receipt.totalAmount || 0).toFixed(2)}</span>
                            </div>
                        </div>
                        {receipt.paymentMethod === 'Cash' && Number(receipt.cashGiven || 0) > 0 && (
                            <div className="receipt-change">
                                <span>Cash Given</span><span>INR {Number(receipt.cashGiven).toFixed(2)}</span>
                                <span>Change</span><span>INR {(Number(receipt.cashGiven) - Number(receipt.totalAmount || 0)).toFixed(2)}</span>
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
