import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Star, ShoppingCart, X, ChevronDown, ChevronRight, Zap } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import { CATEGORY_TREE, DEPARTMENTS } from '../../constants/categories'
import { useScrollReveal, useStaggeredReveal } from '../../hooks/useScrollReveal'
import './ProductCatalog.css'

export default function ProductCatalog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [products, setProducts] = useState([])
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)
    const { addToCart } = useCart()
    const [addedIds, setAddedIds] = useState(new Set())
    const [expandedDepts, setExpandedDepts] = useState({})
    const [fadeState, setFadeState] = useState('in') // 'in' | 'out'

    // Scroll reveal for product grid
    const [gridRef, gridVisible] = useScrollReveal({ threshold: 0.05 })
    const productStagger = useStaggeredReveal(gridVisible && fadeState === 'in', 60)

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

    const currentCategory = searchParams.get('category') || ''
    const currentSearch = searchParams.get('search') || ''
    const currentSort = searchParams.get('sort') || ''
    const currentPage = parseInt(searchParams.get('page') || '1')

    const isDept = DEPARTMENTS.includes(currentCategory)
    const deptSubs = isDept ? (CATEGORY_TREE[currentCategory] || []) : []

    const loadProducts = useCallback(async () => {
        // Fade out before loading
        setFadeState('out')
        await new Promise(resolve => setTimeout(resolve, 200))

        setLoading(true)
        try {
            const params = { page: currentPage, limit: 12 }
            if (isDept) {
                params.categories = deptSubs.join(',')
            } else if (currentCategory) {
                params.category = currentCategory
            }
            if (currentSearch) params.search = currentSearch
            if (currentSort) params.sort = currentSort
            const data = await api.getStorefrontProducts(params)
            setProducts(data.products || [])
            setTotalPages(data.totalPages || 1)
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
        // Fade in after loading
        requestAnimationFrame(() => setFadeState('in'))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCategory, currentSearch, currentSort, currentPage])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    // Auto-expand the dept that contains the current category
    useEffect(() => {
        if (!currentCategory) return
        if (isDept) {
            setExpandedDepts(prev => ({ ...prev, [currentCategory]: true }))
        } else {
            for (const [dept, subs] of Object.entries(CATEGORY_TREE)) {
                if (subs.includes(currentCategory)) {
                    setExpandedDepts(prev => ({ ...prev, [dept]: true }))
                    break
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentCategory])

    function updateParam(key, value) {
        const params = new URLSearchParams(searchParams)
        if (value) params.set(key, value)
        else params.delete(key)
        if (key !== 'page') params.delete('page')
        setSearchParams(params)
    }

    function clearFilters() {
        setSearchParams({})
    }

    const hasFilters = currentCategory || currentSearch || currentSort

    return (
        <div className="catalog">
            <div className="catalog-header">
                <h1>
                    {currentSearch ? `Results for "${currentSearch}"` :
                        currentCategory ? currentCategory : 'All Products'}
                </h1>
                <div className="catalog-controls">
                    <button className="catalog-filter-toggle" onClick={() => setShowFilters(!showFilters)}>
                        <SlidersHorizontal size={16} /> Filters
                    </button>
                    <select
                        className="catalog-sort"
                        value={currentSort}
                        onChange={(e) => updateParam('sort', e.target.value)}
                    >
                        <option value="">Newest</option>
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="rating">Top Rated</option>
                        <option value="name">Name A-Z</option>
                    </select>
                </div>
            </div>

            <div className={`catalog-body ${showFilters ? 'filters-open' : ''}`}>
                {/* Sidebar */}
                <aside className={`catalog-sidebar ${showFilters ? 'open' : ''}`}>
                    <div className="filter-section">
                        <h3>Category</h3>
                        <button
                            className={`filter-chip ${!currentCategory ? 'active' : ''}`}
                            onClick={() => updateParam('category', '')}
                        >All</button>

                        {DEPARTMENTS.map(dept => {
                            const isOpen = expandedDepts[dept]
                            const isDeptActive = currentCategory === dept
                            const subs = CATEGORY_TREE[dept]
                            return (
                                <div key={dept} className="filter-dept">
                                    <div className="filter-dept-header">
                                        <button
                                            className={`filter-chip filter-chip-dept ${isDeptActive ? 'active' : ''}`}
                                            onClick={() => updateParam('category', dept)}
                                        >{dept}</button>
                                        <button
                                            className="filter-dept-toggle"
                                            onClick={() => setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))}
                                        >
                                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                    </div>
                                    <div className={`filter-subcats ${isOpen ? 'filter-subcats--open' : ''}`}>
                                        {subs.map(sub => (
                                            <button
                                                key={sub}
                                                className={`filter-chip filter-chip-sub ${currentCategory === sub ? 'active' : ''}`}
                                                onClick={() => updateParam('category', sub)}
                                            >{sub}</button>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {hasFilters && (
                        <button className="filter-clear" onClick={clearFilters}>
                            <X size={14} /> Clear All Filters
                        </button>
                    )}
                </aside>

                {/* Products */}
                <div className="catalog-products" ref={gridRef}>
                    {loading ? (
                        <div className="catalog-loading">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="product-card-skeleton" style={{ animationDelay: `${i * 100}ms` }}>
                                    <div className="skeleton-img"></div>
                                    <div className="skeleton-text"></div>
                                    <div className="skeleton-text short"></div>
                                </div>
                            ))}
                        </div>
                    ) : products.length === 0 ? (
                        <div className="catalog-empty">
                            <Search size={48} />
                            <h3>No products found</h3>
                            <p>Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <>
                            <div className={`product-grid catalog-grid--${fadeState}`}>
                                {products.map((product, i) => {
                                    const discount = product.compareAtPrice && product.compareAtPrice > product.price
                                        ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0
                                    return (
                                        <div
                                            className={`product-card ${productStagger(i).className}`}
                                            key={product._id}
                                            style={productStagger(i).style}
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
                                                className={`product-card-cart-btn ${addedIds.has(product._id) ? 'added' : ''}`}
                                                onClick={(e) => handleAdd(e, product)}
                                            >
                                                <ShoppingCart size={15} />
                                                {addedIds.has(product._id) ? 'Added ✓' : 'Add to Cart'}
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="catalog-pagination">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i}
                                            className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                                            onClick={() => updateParam('page', String(i + 1))}
                                        >{i + 1}</button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
