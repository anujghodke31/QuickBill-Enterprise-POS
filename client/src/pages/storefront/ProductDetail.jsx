import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Star, ArrowLeft, Plus, Minus, Tag, Package, ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight, Zap, Check } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import './ProductDetail.css'

export default function ProductDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [qty, setQty] = useState(1)
    const [added, setAdded] = useState(false)
    const [activeImg, setActiveImg] = useState(0)
    const { addToCart } = useCart()
    const imgRef = useRef(null)
    const [qtyBounce, setQtyBounce] = useState(false)

    // Scroll reveals for sections
    const [offersRef, offersVisible] = useScrollReveal({ threshold: 0.2 })
    const [descRef, descVisible] = useScrollReveal({ threshold: 0.2 })
    const [servicesRef, servicesVisible] = useScrollReveal({ threshold: 0.2 })

    async function loadProduct() {
        setLoading(true)
        try {
            const data = await api.getProductById(id)
            setProduct(data)
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadProduct()
        window.scrollTo({ top: 0, behavior: 'smooth' })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])

    // Image zoom on hover
    const handleImgMouseMove = useCallback((e) => {
        const img = imgRef.current
        if (!img) return
        const rect = img.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100
        img.style.transformOrigin = `${x}% ${y}%`
    }, [])

    const handleImgEnter = useCallback(() => {
        const img = imgRef.current
        if (img) img.style.transform = 'scale(1.6)'
    }, [])

    const handleImgLeave = useCallback(() => {
        const img = imgRef.current
        if (img) {
            img.style.transform = 'scale(1)'
            img.style.transformOrigin = 'center center'
        }
    }, [])

    function handleAddToCart() {
        if (!product) return
        addToCart(product, qty)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
    }

    function handleBuyNow() {
        if (!product) return
        addToCart(product, qty)
        navigate('/checkout')
    }

    function changeQty(newQty) {
        setQty(newQty)
        setQtyBounce(true)
        setTimeout(() => setQtyBounce(false), 200)
    }

    if (loading) {
        return (
            <div className="pd-loading">
                <div className="pd-skeleton-img"></div>
                <div className="pd-skeleton-info">
                    <div className="skeleton-text" style={{ width: '40%' }}></div>
                    <div className="skeleton-text" style={{ width: '70%', height: 28 }}></div>
                    <div className="skeleton-text" style={{ width: '30%' }}></div>
                    <div className="skeleton-text" style={{ width: '90%', height: 60 }}></div>
                </div>
            </div>
        )
    }

    if (!product) {
        return (
            <div className="pd-empty">
                <h2>Product not found</h2>
                <Link to="/shop" className="btn-hero-primary"><ArrowLeft size={16} /> Back to Shop</Link>
            </div>
        )
    }

    const discount = product.compareAtPrice && product.compareAtPrice > product.price
        ? Math.round((1 - product.price / product.compareAtPrice) * 100)
        : 0

    return (
        <div className="pd">
            {/* Breadcrumbs */}
            <nav className="pd-breadcrumbs">
                <Link to="/">Home</Link>
                <ChevronRight size={14} />
                <Link to="/shop">Shop</Link>
                {product.category && (
                    <>
                        <ChevronRight size={14} />
                        <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>{product.category}</Link>
                    </>
                )}
                <ChevronRight size={14} />
                <span className="pd-breadcrumb-current">{product.name}</span>
            </nav>

            <div className="pd-layout">
                {/* Image Gallery with zoom */}
                <div className="pd-gallery">
                    <div
                        className="pd-main-img"
                        onMouseMove={handleImgMouseMove}
                        onMouseEnter={handleImgEnter}
                        onMouseLeave={handleImgLeave}
                    >
                        {product.images?.length > 0 ? (
                            <img
                                ref={imgRef}
                                src={product.images[activeImg] || product.images[0]}
                                alt={product.name}
                                className="pd-zoomable-img"
                            />
                        ) : (
                            <div className="pd-img-placeholder">{product.name.charAt(0)}</div>
                        )}
                        {discount > 0 && (
                            <span className="pd-sale-badge">
                                <Zap size={12} /> {discount}% OFF
                            </span>
                        )}
                    </div>
                    {product.images?.length > 1 && (
                        <div className="pd-thumbnails">
                            {product.images.map((img, idx) => (
                                <button
                                    key={idx}
                                    className={`pd-thumbnail ${activeImg === idx ? 'active' : ''}`}
                                    onClick={() => setActiveImg(idx)}
                                >
                                    <img src={img} alt={`Thumbnail ${idx + 1}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div className="pd-info">
                    {product.brand && <span className="pd-brand">{product.brand}</span>}
                    <h1 className="pd-name">{product.name}</h1>

                    {product.ratings?.average > 0 && (
                        <div className="pd-rating">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16}
                                    fill={i < Math.round(product.ratings.average) ? '#f59e0b' : 'transparent'}
                                    stroke={i < Math.round(product.ratings.average) ? '#f59e0b' : '#4b5563'}
                                />
                            ))}
                            <span>{product.ratings.average.toFixed(1)} ({product.ratings.count} reviews)</span>
                        </div>
                    )}

                    <div className="pd-price-block">
                        <span className="pd-price">₹{product.price}</span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                            <>
                                <span className="pd-compare-price">₹{product.compareAtPrice}</span>
                                <span className="pd-discount-label">
                                    Save ₹{product.compareAtPrice - product.price}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Offers */}
                    <div
                        className={`pd-offers ${offersVisible ? 'pd-section--visible' : 'pd-section--hidden'}`}
                        ref={offersRef}
                    >
                        <div className="pd-offer-title"><Tag size={16} /> Available Offers</div>
                        <ul className="pd-offer-list">
                            <li><strong>Bank Offer:</strong> Get 10% off on Select Credit Cards, up to ₹1,500.</li>
                            <li><strong>Special Price:</strong> Get extra {discount}% off (price inclusive of cashback/coupon).</li>
                        </ul>
                    </div>

                    {/* Description */}
                    {product.description && (
                        <div
                            className={`pd-description-block ${descVisible ? 'pd-section--visible' : 'pd-section--hidden'}`}
                            ref={descRef}
                        >
                            <h3>Product Description</h3>
                            <p className="pd-description">{product.description}</p>
                        </div>
                    )}

                    {/* Stock */}
                    {product.stock > 0 ? (
                        <div className="pd-stock pd-in-stock">
                            <Check size={16} /> In Stock ({product.stock} available)
                        </div>
                    ) : (
                        <div className="pd-stock pd-out-stock">✕ Out of Stock</div>
                    )}

                    {/* Actions */}
                    {product.stock > 0 && (
                        <div className="pd-actions">
                            <div className="pd-qty">
                                <button onClick={() => changeQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
                                <span className={qtyBounce ? 'pd-qty-bounce' : ''}>{qty}</span>
                                <button onClick={() => changeQty(Math.min(product.stock, qty + 1))}><Plus size={16} /></button>
                            </div>
                            <button className={`pd-add-btn ${added ? 'added' : ''}`} onClick={handleAddToCart}>
                                {added ? <Check size={18} /> : <ShoppingCart size={18} />}
                                {added ? 'Added to Cart ✓' : 'Add to Cart'}
                            </button>
                            <button className="pd-buy-btn" onClick={handleBuyNow}>
                                <Zap size={16} /> Buy Now
                            </button>
                        </div>
                    )}

                    {/* Service Guarantees */}
                    <div
                        className={`pd-services ${servicesVisible ? 'pd-section--visible' : 'pd-section--hidden'}`}
                        ref={servicesRef}
                    >
                        {[
                            { icon: Truck, label: 'Free Delivery' },
                            { icon: RotateCcw, label: '7 Days Replacement' },
                            { icon: CreditCard, label: 'Cash on Delivery' },
                            { icon: ShieldCheck, label: '1 Year Warranty' },
                        ].map((svc, i) => (
                            <div className="pd-service-item" key={svc.label} style={{ transitionDelay: `${i * 80}ms` }}>
                                <div className="pd-service-icon"><svc.icon size={20} /></div>
                                <span>{svc.label}</span>
                            </div>
                        ))}
                    </div>

                    {product.tags?.length > 0 && (
                        <div className="pd-tags">
                            {product.tags.map(tag => (
                                <Link key={tag} to={`/shop?search=${tag}`} className="pd-tag">#{tag}</Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
