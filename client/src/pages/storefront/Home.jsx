import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Star, ShoppingCart, TrendingUp, Sparkles, Truck, Shield, RotateCcw, Zap, Heart } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import { DEPARTMENTS } from '../../constants/categories'
import { useScrollReveal, useStaggeredReveal } from '../../hooks/useScrollReveal'
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter'
import './Home.css'

/* ── Animated Counter Component ── */
function AnimatedStat({ value, suffix = '', label, shouldStart }) {
    const isDecimal = value % 1 !== 0
    const animatedValue = useAnimatedCounter(value, 2200, shouldStart, isDecimal ? 1 : 0)
    return (
        <div className="hero-stat">
            <span className="hero-stat-num">{animatedValue}{suffix}</span>
            <span className="hero-stat-label">{label}</span>
        </div>
    )
}

/* ── Product Card with Tilt Effect ── */
function ProductCard({ product, onAdd, isAdded }) {
    const cardRef = useRef(null)

    const handleMouseMove = useCallback((e) => {
        const card = cardRef.current
        if (!card) return
        const rect = card.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const centerX = rect.width / 2
        const centerY = rect.height / 2
        const rotateX = ((y - centerY) / centerY) * -6
        const rotateY = ((x - centerX) / centerX) * 6
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
    }, [])

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current
        if (!card) return
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    }, [])

    const discount = product.compareAtPrice && product.compareAtPrice > product.price
        ? Math.round((1 - product.price / product.compareAtPrice) * 100)
        : 0

    return (
        <div
            className="product-card"
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <Link to={`/product/${product._id}`} className="product-card-link">
                <div className="product-card-img">
                    {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} loading="lazy" />
                    ) : (
                        <div className="product-card-placeholder">
                            {product.name.charAt(0)}
                        </div>
                    )}
                    {discount > 0 && (
                        <span className="product-card-sale">
                            <Zap size={10} /> {discount}% OFF
                        </span>
                    )}
                    <button className="product-card-wishlist" onClick={(e) => e.preventDefault()}>
                        <Heart size={16} />
                    </button>
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
                className={`product-card-cart-btn ${isAdded ? 'added' : ''}`}
                onClick={(e) => onAdd(e, product)}
            >
                <ShoppingCart size={15} />
                {isAdded ? 'Added ✓' : 'Add'}
            </button>
        </div>
    )
}

export default function Home() {
    const [featured, setFeatured] = useState([])
    const { addToCart } = useCart()
    const [addedIds, setAddedIds] = useState(new Set())

    // Scroll reveal hooks for each section
    const [heroRef, heroVisible] = useScrollReveal({ threshold: 0.1 })
    const [featuresRef, featuresVisible] = useScrollReveal({ threshold: 0.2 })
    const [categoriesRef, categoriesVisible] = useScrollReveal({ threshold: 0.1 })
    const [productsRef, productsVisible] = useScrollReveal({ threshold: 0.1 })

    // Staggered reveals
    const featureStagger = useStaggeredReveal(featuresVisible, 100)
    const categoryStagger = useStaggeredReveal(categoriesVisible, 60)
    const productStagger = useStaggeredReveal(productsVisible, 80)

    async function loadData() {
        try {
            const prodData = await api.getStorefrontProducts({ limit: 8, sort: 'rating' })
            setFeatured(prodData.products || [])
        } catch (err) {
            console.error('Failed to load home data:', err)
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        loadData()
    }, [])

    function handleAdd(e, product) {
        e.stopPropagation()
        e.preventDefault()
        addToCart(product)
        setAddedIds(prev => new Set(prev).add(product._id))
        setTimeout(() => {
            setAddedIds(prev => {
                const next = new Set(prev)
                next.delete(product._id)
                return next
            })
        }, 1500)
    }

    const categoryIcons = {
        'Groceries & Food': '🍍',
        'Fashion': '👗',
        'Electronics': '🛸',
        'Home & Kitchen': '🥥',
        'Personal Care': '🧴',
        'Baby & Kids': '🍼',
        'Sports & Fitness': '🏋️',
        'Health & Wellness': '💊',
    }

    const features = [
        { icon: Truck, label: 'Hyperdrive Delivery', desc: 'Same-day shipping' },
        { icon: Shield, label: 'Galactic Security', desc: '100% secure payments' },
        { icon: RotateCcw, label: 'Island Returns', desc: '7-day easy returns' },
        { icon: Star, label: 'Stellar Prices', desc: 'Best price guarantee' },
    ]

    return (
        <div className="home">
            {/* ── Hero Section ── */}
            <section className="hero" ref={heroRef}>
                {/* Animated particles */}
                <div className="hero-particles">
                    {[...Array(6)].map((_, i) => (
                        <span key={i} className="hero-particle" style={{ '--i': i }} />
                    ))}
                </div>

                <div className={`hero-content ${heroVisible ? 'hero-content--visible' : ''}`}>
                    <div className="hero-badge">
                        <Sparkles size={14} /> Ohana means family deals!
                    </div>
                    <h1 className="hero-title">
                        Say Aloha to your<br />
                        <span className="hero-gradient">everyday essentials</span>
                    </h1>
                    <p className="hero-subtitle">
                        Fresh groceries, alien-approved snacks, and tropical finds — delivered faster than a spaceship! 🚀🏄‍♂️
                    </p>
                    <div className="hero-actions">
                        <Link to="/shop" className="btn-hero-primary">
                            Catch the Wave 🌊 <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>

                <div className={`hero-visual ${heroVisible ? 'hero-visual--visible' : ''}`}>
                    <div className="hero-glow"></div>
                    <div className="hero-stats">
                        <AnimatedStat value={500} suffix="+" label="Products" shouldStart={heroVisible} />
                        <AnimatedStat value={50} suffix="+" label="Brands" shouldStart={heroVisible} />
                        <AnimatedStat value={4.8} suffix="★" label="Rating" shouldStart={heroVisible} />
                    </div>
                </div>
            </section>

            {/* ── Trust Marquee ── */}
            <div className="trust-marquee">
                <div className="trust-marquee-track">
                    {[...Array(2)].map((_, setIdx) => (
                        <div className="trust-marquee-set" key={setIdx}>
                            <span>🔒 Secure Checkout</span>
                            <span>⭐ 4.8/5 Customer Rating</span>
                            <span>🚚 Free Shipping Over ₹499</span>
                            <span>💯 Genuine Products</span>
                            <span>🔄 Easy Returns</span>
                            <span>💳 Multiple Payment Options</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Features Bar ── */}
            <section className="features-bar" ref={featuresRef}>
                {features.map((feat, i) => (
                    <div
                        key={feat.label}
                        className={`feature-item ${featureStagger(i).className}`}
                        style={featureStagger(i).style}
                    >
                        <div className="feature-icon-wrap">
                            <feat.icon size={22} />
                        </div>
                        <div className="feature-text">
                            <span className="feature-label">{feat.label}</span>
                            <span className="feature-desc">{feat.desc}</span>
                        </div>
                    </div>
                ))}
            </section>

            {/* ── Categories ── */}
            {DEPARTMENTS.length > 0 && (
                <section className="home-section" ref={categoriesRef}>
                    <div className="section-header">
                        <div className="section-header-left">
                            <span className="section-tag">Browse</span>
                            <h2>Shop by Category</h2>
                        </div>
                        <Link to="/shop" className="section-link">View All <ArrowRight size={16} /></Link>
                    </div>
                    <div className="category-grid">
                        {DEPARTMENTS.map((dept, i) => (
                            <Link
                                to={`/shop?category=${encodeURIComponent(dept)}`}
                                key={dept}
                                className={`category-card ${categoryStagger(i).className}`}
                                style={categoryStagger(i).style}
                            >
                                <span className="category-icon">{categoryIcons[dept] || '📦'}</span>
                                <span className="category-name">{dept}</span>
                                <span className="category-arrow"><ArrowRight size={14} /></span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Featured Products ── */}
            {featured.length > 0 && (
                <section className="home-section" ref={productsRef}>
                    <div className="section-header">
                        <div className="section-header-left">
                            <span className="section-tag">Popular</span>
                            <h2><TrendingUp size={22} /> Trending Products</h2>
                        </div>
                        <Link to="/shop" className="section-link">See All <ArrowRight size={16} /></Link>
                    </div>
                    <div className="product-grid">
                        {featured.map((product, i) => (
                            <div
                                key={product._id}
                                className={productStagger(i).className}
                                style={productStagger(i).style}
                            >
                                <ProductCard
                                    product={product}
                                    onAdd={handleAdd}
                                    isAdded={addedIds.has(product._id)}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
