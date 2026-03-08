import { NavLink, Link } from 'react-router-dom'
import {
    LayoutDashboard, ShoppingCart, Package, FileText,
    Users, UserCog, LogOut, Menu, X, Building2,
    RotateCcw, ClipboardList, Store
} from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const navSections = [
    {
        label: 'Overview',
        items: [
            { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
            { to: '/admin/pos', icon: ShoppingCart, label: 'POS Terminal' },
        ]
    },
    {
        label: 'Catalog',
        items: [
            { to: '/admin/inventory', icon: Package, label: 'Inventory' },
            { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
            { to: '/admin/returns', icon: RotateCcw, label: 'Returns' },
        ]
    },
    {
        label: 'People',
        items: [
            { to: '/admin/customers', icon: Users, label: 'Customers' },
            { to: '/admin/employees', icon: UserCog, label: 'Employees' },
            { to: '/admin/suppliers', icon: Building2, label: 'Suppliers' },
        ]
    },
    {
        label: 'Analytics',
        items: [
            { to: '/admin/reports', icon: FileText, label: 'Reports' },
        ]
    },
]

export default function Sidebar({ onLogout }) {
    const [mobileOpen, setMobileOpen] = useState(false)

    return (
        <>
            <button
                className="mobile-menu-btn"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
            >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

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
                    {navSections.map((section) => (
                        <div key={section.label}>
                            <div className="nav-section-label">{section.label}</div>
                            {section.items.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        end={item.to === '/admin'}
                                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        <Icon size={18} />
                                        <span className="nav-label">{item.label}</span>
                                    </NavLink>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="sidebar-footer">
                    <Link to="/" className="store-link" onClick={() => setMobileOpen(false)}>
                        <Store size={16} />
                        <span>View Store</span>
                    </Link>
                    <button className="logout-btn" onClick={onLogout}>
                        <LogOut size={18} />
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </aside>
        </>
    )
}
