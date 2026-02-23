import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, ShoppingCart, TrendingUp, Sparkles, Truck, Shield, RotateCcw } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import './Home.css'

export default function Home() {
    const [featured, setFeatured] = useState([])
    const [categories, setCategories] = useState([])
    const { addToCart } = useCart()

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [prodData, cats] = await Promise.all([
                api.getStorefrontProducts({ limit: 8, sort: 'rating' }),
                api.getCategories()
            ])
            setFeatured(prodData.products || [])
            setCategories(cats || [])
        } catch (err) {
            console.error('Failed to load home data:', err)
        }
    }

    const categoryIcons = {
        'Groceries': '🛒',
        'Personal Care': '🧴',
        'Household': '🏠',
        'Baby Care': '👶',
        'Electronics': '📱',
        'Fashion': '👗',
        'Home & Kitchen': '🍳',
    }

    return (
        <div className="home">
            {/* Hero */}
            <section className="hero">
                <div className="hero-content">
                    <div className="hero-badge"><Sparkles size={14} /> New Arrivals Daily</div>
                    <h1 className="hero-title">
                        Your everyday<br />
                        <span className="hero-gradient">essentials delivered</span>
                    </h1>
                    <p className="hero-subtitle">
                        Fresh groceries, personal care, household items &amp; more — all at the best prices with fast delivery.
                    </p>
                    <div className="hero-actions">
                        <Link to="/shop" className="btn-hero-primary">
                            Shop Now <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-glow"></div>
                    <div className="hero-stats">
                        <div className="hero-stat">
                            <span className="hero-stat-num">500+</span>
                            <span className="hero-stat-label">Products</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-stat-num">50+</span>
                            <span className="hero-stat-label">Brands</span>
                        </div>
                        <div className="hero-stat">
                            <span className="hero-stat-num">4.8★</span>
                            <span className="hero-stat-label">Rating</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features bar */}
            <section className="features-bar">
                <div className="feature-item">
                    <Truck size={20} />
                    <span>Fast Delivery</span>
                </div>
                <div className="feature-item">
                    <Shield size={20} />
                    <span>Secure Checkout</span>
                </div>
                <div className="feature-item">
                    <RotateCcw size={20} />
                    <span>Easy Returns</span>
                </div>
                <div className="feature-item">
                    <Star size={20} />
                    <span>Best Prices</span>
                </div>
            </section>

            {/* Categories */}
            {categories.length > 0 && (
                <section className="home-section">
                    <div className="section-header">
                        <h2>Shop by Category</h2>
                        <Link to="/shop" className="section-link">View All <ArrowRight size={16} /></Link>
                    </div>
                    <div className="category-grid">
                        {categories.map(cat => (
                            <Link to={`/shop?category=${encodeURIComponent(cat)}`} key={cat} className="category-card">
                                <span className="category-icon">{categoryIcons[cat] || '📦'}</span>
                                <span className="category-name">{cat}</span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* Featured Products */}
            {featured.length > 0 && (
                <section className="home-section">
                    <div className="section-header">
                        <h2><TrendingUp size={22} /> Trending Products</h2>
                        <Link to="/shop" className="section-link">See All <ArrowRight size={16} /></Link>
                    </div>
                    <div className="product-grid">
                        {featured.map(product => (
                            <div className="product-card" key={product._id}>
                                <Link to={`/product/${product._id}`} className="product-card-link">
                                    <div className="product-card-img">
                                        {product.images?.[0] ? (
                                            <img src={product.images[0]} alt={product.name} />
                                        ) : (
                                            <div className="product-card-placeholder">
                                                {product.name.charAt(0)}
                                            </div>
                                        )}
                                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                                            <span className="product-card-sale">
                                                {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
                                            </span>
                                        )}
                                    </div>
                                    <div className="product-card-info">
                                        <span className="product-card-brand">{product.brand}</span>
                                        <h3 className="product-card-name">{product.name}</h3>
                                        <div className="product-card-price">
                                            <span className="product-card-current">₹{product.price}</span>
                                            {product.compareAtPrice && product.compareAtPrice > product.price && (
                                                <span className="product-card-compare">₹{product.compareAtPrice}</span>
                                            )}
                                        </div>
                                        {product.ratings?.average > 0 && (
                                            <div className="product-card-rating">
                                                <Star size={13} fill="#f59e0b" stroke="#f59e0b" />
                                                <span>{product.ratings.average.toFixed(1)}</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>
                                <button
                                    className="product-card-cart-btn"
                                    onClick={() => addToCart(product)}
                                >
                                    <ShoppingCart size={15} /> Add
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
