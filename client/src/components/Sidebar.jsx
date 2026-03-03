import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ShoppingCart, Package, FileText, Users, UserCog, LogOut, Menu, X, Building2, RotateCcw, ClipboardList } from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/pos', icon: ShoppingCart, label: 'POS Terminal' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/customers', icon: Users, label: 'Customers' },
    { to: '/admin/employees', icon: UserCog, label: 'Employees' },
    { to: '/admin/suppliers', icon: Building2, label: 'Suppliers' },
    { to: '/admin/returns', icon: RotateCcw, label: 'Returns' },
    { to: '/admin/orders', icon: ClipboardList, label: 'Orders' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
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
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.to === '/admin'}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileOpen(false)}
                            >
                                <Icon size={20} />
                                <span className="nav-label">{item.label}</span>
                            </NavLink>
                        )
                    })}
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
