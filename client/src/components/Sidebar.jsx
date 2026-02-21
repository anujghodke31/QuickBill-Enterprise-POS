import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, UserCog, LogOut, Menu, X, Building2, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/pos', icon: ShoppingCart, label: 'POS Terminal' },
    { to: '/inventory', icon: Package, label: 'Inventory' },
    { to: '/customers', icon: Users, label: 'Customers' },
    { to: '/employees', icon: UserCog, label: 'Employees' },
    { to: '/suppliers', icon: Building2, label: 'Suppliers' },
    { to: '/returns', icon: RotateCcw, label: 'Returns' },
    { to: '/reports', icon: FileText, label: 'Reports' },
]

export default function Sidebar({ onLogout }) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <>
            {/* Mobile toggle */}
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Backdrop */}
            {mobileOpen && (
                <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />
            )}

            <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
                {/* Brand */}
                <div className="sidebar-brand">
                    <div className="brand-icon">Q</div>
                    <div className="brand-text">
                        <span className="brand-name">QuickBill</span>
                        <span className="brand-sub">Enterprise POS</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setMobileOpen(false)}
                        >
                            <Icon size={20} />
                            <span className="nav-label">{label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <button className="nav-link logout-btn" onClick={onLogout}>
                        <LogOut size={20} />
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
