import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { CreditCard, MapPin, ArrowLeft, Lock, ShieldCheck, Loader, Check } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { api } from '../../api/api'
import './Checkout.css'

export default function Checkout() {
    const { cart, cartTotal, clearCart } = useCart()
    const navigate = useNavigate()
    const [submitting, setSubmitting] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false)
    const [activeStep, setActiveStep] = useState(0) // 0: contact, 1: address, 2: payment

    const [form, setForm] = useState({
        name: '', email: '', phone: '',
        address: '', city: '', state: '', pincode: '',
        paymentMethod: 'online',
        cardNumber: '', cardExpiry: '', cardCvc: '', cardName: ''
    })

    function handleChange(e) {
        let value = e.target.value

        if (e.target.name === 'cardNumber') {
            value = value.replace(/\D/g, '').substring(0, 16)
            value = value.replace(/(\d{4})(?=\d)/g, '$1 ')
        }
        if (e.target.name === 'cardExpiry') {
            value = value.replace(/\D/g, '')
            if (value.length > 2) value = value.substring(0, 2) + '/' + value.substring(2, 4)
        }
        if (e.target.name === 'cardCvc') {
            value = value.replace(/\D/g, '').substring(0, 3)
        }

        setForm(prev => ({ ...prev, [e.target.name]: value }))

        // Auto-advance step based on field focus
        if (['name', 'email', 'phone'].includes(e.target.name)) setActiveStep(0)
        if (['address', 'city', 'state', 'pincode'].includes(e.target.name)) setActiveStep(1)
        if (['paymentMethod', 'cardNumber', 'cardExpiry', 'cardCvc', 'cardName'].includes(e.target.name)) setActiveStep(2)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (cart.length === 0) return
        setSubmitting(true)

        if (form.paymentMethod === 'online') {
            setProcessingPayment(true)
            await new Promise(resolve => setTimeout(resolve, 2500))
            setProcessingPayment(false)
        }

        try {
            const orderData = {
                customer: { name: form.name, email: form.email, phone: form.phone },
                shippingAddress: { address: form.address, city: form.city, state: form.state, pincode: form.pincode },
                items: cart.map(item => ({ product: item._id, name: item.name, price: item.price, quantity: item.quantity })),
                paymentMethod: form.paymentMethod,
                totalAmount: cartTotal,
            }

            const order = await api.createOrder(orderData)
            localStorage.setItem('quickbill_customer_email', form.email)
            clearCart()
            navigate(`/order-confirmation/${order._id}`)
        } catch (err) {
            console.error('Checkout failed:', err)
            alert('Something went wrong. Please try again.')
        }
        setSubmitting(false)
    }

    const steps = [
        { icon: MapPin, label: 'Contact' },
        { icon: MapPin, label: 'Address' },
        { icon: CreditCard, label: 'Payment' },
    ]

    if (cart.length === 0) {
        return (
            <div className="checkout-empty">
                <h2>Nothing to check out</h2>
                <Link to="/shop" className="btn-hero-primary"><ArrowLeft size={16} /> Go Shopping</Link>
            </div>
        )
    }

    return (
        <div className="checkout">
            {/* Step indicator */}
            <div className="checkout-steps">
                {steps.map((step, i) => (
                    <div
                        key={step.label}
                        className={`checkout-step ${i <= activeStep ? 'checkout-step--active' : ''} ${i < activeStep ? 'checkout-step--done' : ''}`}
                    >
                        <div className="checkout-step-icon">
                            {i < activeStep ? <Check size={16} /> : <step.icon size={16} />}
                        </div>
                        <span>{step.label}</span>
                        {i < steps.length - 1 && <div className="checkout-step-line" />}
                    </div>
                ))}
            </div>

            <h1 className="checkout-title"><Lock size={20} /> Secure Checkout</h1>

            <form className="checkout-layout" onSubmit={handleSubmit}>
                <div className="checkout-form">
                    {/* Contact */}
                    <div className={`checkout-section ${activeStep === 0 ? 'checkout-section--active' : ''}`}>
                        <h2><MapPin size={18} /> Contact Information</h2>
                        <div className="checkout-row">
                            <div className="checkout-field">
                                <label>Full Name *</label>
                                <input name="name" value={form.name} onChange={handleChange} required
                                    onFocus={() => setActiveStep(0)} />
                            </div>
                        </div>
                        <div className="checkout-row two-col">
                            <div className="checkout-field">
                                <label>Email *</label>
                                <input type="email" name="email" value={form.email} onChange={handleChange} required
                                    onFocus={() => setActiveStep(0)} />
                            </div>
                            <div className="checkout-field">
                                <label>Phone *</label>
                                <input type="tel" name="phone" value={form.phone} onChange={handleChange} required
                                    onFocus={() => setActiveStep(0)} />
                            </div>
                        </div>
                    </div>

                    {/* Address */}
                    <div className={`checkout-section ${activeStep === 1 ? 'checkout-section--active' : ''}`}>
                        <h2><MapPin size={18} /> Shipping Address</h2>
                        <div className="checkout-field">
                            <label>Address *</label>
                            <textarea name="address" value={form.address} onChange={handleChange} required rows="2"
                                onFocus={() => setActiveStep(1)} />
                        </div>
                        <div className="checkout-row three-col">
                            <div className="checkout-field">
                                <label>City *</label>
                                <input name="city" value={form.city} onChange={handleChange} required
                                    onFocus={() => setActiveStep(1)} />
                            </div>
                            <div className="checkout-field">
                                <label>State *</label>
                                <input name="state" value={form.state} onChange={handleChange} required
                                    onFocus={() => setActiveStep(1)} />
                            </div>
                            <div className="checkout-field">
                                <label>Pincode *</label>
                                <input name="pincode" value={form.pincode} onChange={handleChange} required
                                    onFocus={() => setActiveStep(1)} />
                            </div>
                        </div>
                    </div>

                    {/* Payment */}
                    <div className={`checkout-section ${activeStep === 2 ? 'checkout-section--active' : ''}`}>
                        <h2><CreditCard size={18} /> Payment Method</h2>
                        <div className="payment-options">
                            <label className={`payment-option ${form.paymentMethod === 'online' ? 'active' : ''}`}
                                onClick={() => setActiveStep(2)}>
                                <input type="radio" name="paymentMethod" value="online"
                                    checked={form.paymentMethod === 'online'} onChange={handleChange} />
                                <span className="payment-radio"></span>
                                <div>
                                    <strong>Credit / Debit Card</strong>
                                    <small>Secure encrypted payment</small>
                                </div>
                            </label>

                            {form.paymentMethod === 'online' && (
                                <div className="credit-card-form">
                                    <div className="checkout-field">
                                        <label>Card Number</label>
                                        <div className="card-input-wrapper">
                                            <input name="cardNumber" placeholder="0000 0000 0000 0000"
                                                value={form.cardNumber} onChange={handleChange} required />
                                            <CreditCard size={18} className="card-icon" />
                                        </div>
                                    </div>
                                    <div className="checkout-row two-col">
                                        <div className="checkout-field">
                                            <label>Expiry (MM/YY)</label>
                                            <input name="cardExpiry" placeholder="MM/YY"
                                                value={form.cardExpiry} onChange={handleChange} required />
                                        </div>
                                        <div className="checkout-field">
                                            <label>CVC</label>
                                            <input name="cardCvc" placeholder="123" type="password"
                                                value={form.cardCvc} onChange={handleChange} required />
                                        </div>
                                    </div>
                                    <div className="checkout-field">
                                        <label>Name on Card</label>
                                        <input name="cardName" placeholder="John Doe"
                                            value={form.cardName} onChange={handleChange} required />
                                    </div>
                                </div>
                            )}

                            <label className={`payment-option ${form.paymentMethod === 'cod' ? 'active' : ''}`}
                                onClick={() => setActiveStep(2)}>
                                <input type="radio" name="paymentMethod" value="cod"
                                    checked={form.paymentMethod === 'cod'} onChange={handleChange} />
                                <span className="payment-radio"></span>
                                <div>
                                    <strong>Cash on Delivery</strong>
                                    <small>Pay when your order arrives</small>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Order summary */}
                <aside className="checkout-summary">
                    <h3>Order Summary</h3>
                    <div className="checkout-items">
                        {cart.map(item => (
                            <div className="checkout-item" key={item._id}>
                                <div className="checkout-item-left">
                                    <span className="checkout-item-qty">{item.quantity}×</span>
                                    <span className="checkout-item-name">{item.name}</span>
                                </div>
                                <span className="checkout-item-total">₹{item.price * item.quantity}</span>
                            </div>
                        ))}
                    </div>
                    <div className="summary-divider"></div>
                    <div className="summary-row">
                        <span>Subtotal</span>
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
                    <button type="submit" className="btn-place-order" disabled={submitting}>
                        {processingPayment ? (
                            <><Loader size={18} className="btn-spinner" /> Processing Payment...</>
                        ) : submitting ? (
                            'Placing Order…'
                        ) : (
                            <><ShieldCheck size={18} /> Pay ₹{cartTotal}</>
                        )}
                    </button>
                    <div className="checkout-secure-note">
                        <Lock size={12} /> Your payment is 256-bit SSL encrypted
                    </div>
                </aside>
            </form>

            {/* Payment processing overlay */}
            {processingPayment && (
                <div className="payment-overlay">
                    <div className="payment-overlay-card">
                        <div className="payment-spinner" />
                        <h3>Processing Your Payment</h3>
                        <p>Please wait while we securely process your transaction...</p>
                    </div>
                </div>
            )}
        </div>
    )
}
