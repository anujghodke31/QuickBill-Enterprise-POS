import { Outlet, Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, User, Store, Menu, X, ArrowUp } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useState, useEffect, useCallback } from 'react'
import './StorefrontLayout.css'

export default function StorefrontLayout() {
    const { cartCount } = useCart()
    const [searchQuery, setSearchQuery] = useState('')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [showScrollTop, setShowScrollTop] = useState(false)
    const navigate = useNavigate()

    // Scroll-based header shrink + show/hide scroll-to-top
    const handleScroll = useCallback(() => {
        const y = window.scrollY
        setScrolled(y > 50)
        setShowScrollTop(y > 400)
    }, [])

    useEffect(() => {
        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [handleScroll])

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
            setSearchQuery('')
            setMobileMenuOpen(false)
        }
    }

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <div className="storefront">
            {/* Top bar */}
            <header className={`sf-header ${scrolled ? 'sf-header--scrolled' : ''}`}>
                <div className="sf-header-inner">
                    <Link to="/" className="sf-brand">
                        <div className="sf-brand-icon"><Store size={22} /></div>
                        <span className="sf-brand-name">QuickBill<span className="sf-brand-accent">Store</span></span>
                    </Link>

                    <form className="sf-search" onSubmit={handleSearch}>
                        <Search size={18} className="sf-search-icon" />
                        <input
                            type="text"
                            placeholder="Search products, brands…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>

                    <nav className="sf-nav">
                        <Link to="/shop" className="sf-nav-link">Shop</Link>
                        <Link to="/cart" className="sf-nav-link sf-cart-link">
                            <ShoppingCart size={20} />
                            {cartCount > 0 && (
                                <span className="sf-cart-badge" key={cartCount}>
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <Link to="/account" className="sf-nav-link">
                            <User size={20} />
                        </Link>
                    </nav>

                    <button className="sf-mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>

                {/* Mobile menu with smooth animation */}
                <div className={`sf-mobile-menu ${mobileMenuOpen ? 'sf-mobile-menu--open' : ''}`}>
                    <form className="sf-search sf-search-mobile" onSubmit={handleSearch}>
                        <Search size={18} className="sf-search-icon" />
                        <input
                            type="text"
                            placeholder="Search products…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </form>
                    <Link to="/shop" className="sf-mobile-link" onClick={() => setMobileMenuOpen(false)}>Shop All</Link>
                    <Link to="/cart" className="sf-mobile-link" onClick={() => setMobileMenuOpen(false)}>
                        Cart {cartCount > 0 && `(${cartCount})`}
                    </Link>
                    <Link to="/account" className="sf-mobile-link" onClick={() => setMobileMenuOpen(false)}>Account</Link>
                </div>
            </header>

            {/* Page content */}
            <main className="sf-main">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="sf-footer">
                <div className="sf-footer-inner">
                    <div className="sf-footer-brand">
                        <Store size={20} />
                        <span>QuickBill Store</span>
                    </div>
                    <div className="sf-footer-links">
                        <Link to="/shop">All Products</Link>
                        <Link to="/cart">Cart</Link>
                        <Link to="/account">My Account</Link>
                    </div>
                    <p className="sf-footer-copy">&copy; 2026 QuickBill Store. All rights reserved.</p>
                </div>
            </footer>

            {/* Scroll to top button */}
            <button
                className={`sf-scroll-top ${showScrollTop ? 'sf-scroll-top--visible' : ''}`}
                onClick={scrollToTop}
                aria-label="Scroll to top"
            >
                <ArrowUp size={20} />
            </button>
        </div>
    )
}
