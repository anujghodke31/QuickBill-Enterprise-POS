import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, Star, ShoppingCart, X } from 'lucide-react'
import { api } from '../../api/api'
import { useCart } from '../../context/CartContext'
import './ProductCatalog.css'

export default function ProductCatalog() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [showFilters, setShowFilters] = useState(false)
    const { addToCart } = useCart()
    const [addedIds, setAddedIds] = useState(new Set())

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

    useEffect(() => {
        loadProducts()
    }, [currentCategory, currentSearch, currentSort, currentPage])

    useEffect(() => {
        api.getCategories().then(setCategories).catch(() => { })
    }, [])

    async function loadProducts() {
        setLoading(true)
        try {
            const params = { page: currentPage, limit: 12 }
            if (currentCategory) params.category = currentCategory
            if (currentSearch) params.search = currentSearch
            if (currentSort) params.sort = currentSort
            const data = await api.getStorefrontProducts(params)
            setProducts(data.products || [])
            setTotalPages(data.totalPages || 1)
        } catch (err) {
            console.error(err)
        }
        setLoading(false)
    }

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
                        {categories.map(cat => (
                            <button
                                key={cat}
                                className={`filter-chip ${currentCategory === cat ? 'active' : ''}`}
                                onClick={() => updateParam('category', cat)}
                            >{cat}</button>
                        ))}
                    </div>
                    {hasFilters && (
                        <button className="filter-clear" onClick={clearFilters}>
                            <X size={14} /> Clear All Filters
                        </button>
                    )}
                </aside>

                {/* Products */}
                <div className="catalog-products">
                    {loading ? (
                        <div className="catalog-loading">
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="product-card-skeleton">
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
                            <div className="product-grid">
                                {products.map(product => (
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
                                            className={`product-card-cart-btn ${addedIds.has(product._id) ? 'added' : ''}`}
                                            onClick={(e) => handleAdd(e, product)}
                                        >
                                            <ShoppingCart size={15} />
                                            {addedIds.has(product._id) ? 'Added ✓' : 'Add to Cart'}
                                        </button>
                                    </div>
                                ))}
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
