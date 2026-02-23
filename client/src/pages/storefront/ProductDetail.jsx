import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ShoppingCart, Star, ArrowLeft, Plus, Minus, Tag, Package } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import './ProductDetail.css'

export default function ProductDetail() {
    const { id } = useParams()
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [qty, setQty] = useState(1)
    const [added, setAdded] = useState(false)
    const { addToCart } = useCart()

    useEffect(() => {
        loadProduct()
    }, [id])

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

    function handleAddToCart() {
        if (!product) return
        addToCart(product, qty)
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
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
            <Link to="/shop" className="pd-back"><ArrowLeft size={16} /> Back to Shop</Link>

            <div className="pd-layout">
                {/* Image */}
                <div className="pd-gallery">
                    <div className="pd-main-img">
                        {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} />
                        ) : (
                            <div className="pd-img-placeholder">{product.name.charAt(0)}</div>
                        )}
                        {discount > 0 && <span className="pd-sale-badge">{discount}% OFF</span>}
                    </div>
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

                    {product.description && (
                        <p className="pd-description">{product.description}</p>
                    )}

                    <div className="pd-meta">
                        {product.category && (
                            <div className="pd-meta-item">
                                <Package size={15} />
                                <span>Category: <strong>{product.category}</strong></span>
                            </div>
                        )}
                        {product.sku && (
                            <div className="pd-meta-item">
                                <Tag size={15} />
                                <span>SKU: <strong>{product.sku}</strong></span>
                            </div>
                        )}
                    </div>

                    <div className="pd-stock">
                        {product.stock > 0 ? (
                            <span className="pd-in-stock">✓ In Stock ({product.stock} available)</span>
                        ) : (
                            <span className="pd-out-stock">✕ Out of Stock</span>
                        )}
                    </div>

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
                        </div>
                    )}

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
