import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Star, ArrowLeft, Plus, Minus, Tag, Package, ShieldCheck, Truck, RotateCcw, CreditCard, ChevronRight } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import { useNavigate } from 'react-router-dom'
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])



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
                {/* Image Gallery */}
                <div className="pd-gallery">
                    <div className="pd-main-img">
                        {product.images?.length > 0 ? (
                            <img src={product.images[activeImg] || product.images[0]} alt={product.name} />
                        ) : (
                            <div className="pd-img-placeholder">{product.name.charAt(0)}</div>
                        )}
                        {discount > 0 && <span className="pd-sale-badge">{discount}% OFF</span>}
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

                {/* Info */}
                <div className="pd-info">
                    {product.brand && <span className="pd-brand">{product.brand}</span>}
                    <h1 className="pd-name">{product.name}</h1>

                    {product.ratings?.average > 0 && (
                        <div className="pd-rating">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16}
                                    fill={i < Math.round(product.ratings.average) ? '#f59e0b' : 'transparent'}
                                    stroke={i < Math.round(product.ratings.average) ? '#f59e0b' : '#71717a'}
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
                                <span className="pd-discount-label">Save ₹{product.compareAtPrice - product.price}</span>
                            </>
                        )}
                    </div>

                    {/* Offers Box */}
                    <div className="pd-offers">
                        <div className="pd-offer-title"><Tag size={16} /> Available Offers</div>
                        <ul className="pd-offer-list">
                            <li><strong>Bank Offer:</strong> Get 10% off on Select Credit Cards, up to ₹1,500.</li>
                            <li><strong>Special Price:</strong> Get extra {discount}% off (price inclusive of cashback/coupon).</li>
                        </ul>
                    </div>

                    {product.description && (
                        <div className="pd-description-block">
                            <h3>Product Description</h3>
                            <p className="pd-description">{product.description}</p>
                        </div>
                    )}

                    {product.stock > 0 ? (
                        <div className="pd-stock pd-in-stock">✓ In Stock ({product.stock} available)</div>
                    ) : (
                        <div className="pd-stock pd-out-stock">✕ Out of Stock</div>
                    )}

                    {product.stock > 0 && (
                        <div className="pd-actions">
                            <div className="pd-qty">
                                <button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16} /></button>
                                <span>{qty}</span>
                                <button onClick={() => setQty(Math.min(product.stock, qty + 1))}><Plus size={16} /></button>
                            </div>
                            <button className={`pd-add-btn ${added ? 'added' : ''}`} onClick={handleAddToCart}>
                                <ShoppingCart size={18} />
                                {added ? 'Added to Cart ✓' : 'Add to Cart'}
                            </button>
                            <button className="pd-buy-btn" onClick={handleBuyNow}>
                                Buy Now
                            </button>
                        </div>
                    )}

                    {/* Service Guarantees */}
                    <div className="pd-services">
                        <div className="pd-service-item">
                            <div className="pd-service-icon"><Truck size={20} /></div>
                            <span>Free Delivery</span>
                        </div>
                        <div className="pd-service-item">
                            <div className="pd-service-icon"><RotateCcw size={20} /></div>
                            <span>7 Days Replacement</span>
                        </div>
                        <div className="pd-service-item">
                            <div className="pd-service-icon"><CreditCard size={20} /></div>
                            <span>Cash on Delivery</span>
                        </div>
                        <div className="pd-service-item">
                            <div className="pd-service-icon"><ShieldCheck size={20} /></div>
                            <span>1 Year Warranty</span>
                        </div>
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
