import { useState, useEffect } from 'react'
import {
    TrendingUp, ShoppingCart, Package, AlertTriangle,
    Clock, AlertCircle, IndianRupee, ArrowUpRight, ArrowDownRight,
    BarChart3, Activity
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Filler, Tooltip, Legend
} from 'chart.js'
import { api } from '../api/api'
import './Dashboard.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

export default function Dashboard() {
    const [stats, setStats] = useState({ todaySales: 0, todayTx: 0, totalProducts: 0, lowStock: 0 })
    const [chartData, setChartData] = useState(null)
    const [alerts, setAlerts] = useState({ expiringSoon: [], lowStock: [] })
    const [recentInvoices, setRecentInvoices] = useState([])
    const [salesTrend, setSalesTrend] = useState(0)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [products, invoices, alertsData] = await Promise.all([
                api.getProducts(),
                api.getInvoices(),
                api.getAlerts()
            ])

            const today = new Date().toDateString()
            const todayInvoices = invoices.filter(i => new Date(i.timestamp).toDateString() === today)
            const todaySales = todayInvoices.reduce((sum, i) => sum + i.totalAmount, 0)
            const lowStock = products.filter(p => p.stock < (p.lowStockThreshold || 5)).length

            // Yesterday's sales for trend comparison
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toDateString()
            const yesterdaySales = invoices
                .filter(i => new Date(i.timestamp).toDateString() === yesterdayStr)
                .reduce((sum, i) => sum + i.totalAmount, 0)

            if (yesterdaySales > 0) {
                setSalesTrend(((todaySales - yesterdaySales) / yesterdaySales) * 100)
            } else if (todaySales > 0) {
                setSalesTrend(100)
            }

            setStats({ todaySales, todayTx: todayInvoices.length, totalProducts: products.length, lowStock })
            setAlerts(alertsData)
            setRecentInvoices(invoices.slice(0, 5))

            // 7-day chart
            const days = []
            const salesByDay = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dayStr = d.toDateString()
                days.push(d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }))
                const dayTotal = invoices
                    .filter(inv => new Date(inv.timestamp).toDateString() === dayStr)
                    .reduce((sum, inv) => sum + inv.totalAmount, 0)
                salesByDay.push(dayTotal)
            }

            setChartData({
                labels: days,
                datasets: [{
                    label: 'Revenue (₹)',
                    data: salesByDay,
                    borderColor: '#818cf8',
                    backgroundColor: (ctx) => {
                        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, ctx.chart.height)
                        gradient.addColorStop(0, 'rgba(129, 140, 248, 0.25)')
                        gradient.addColorStop(1, 'rgba(129, 140, 248, 0.0)')
                        return gradient
                    },
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#818cf8',
                    pointBorderColor: '#1e1b4b',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBorderWidth: 3,
                    borderWidth: 2.5,
                }]
            })
        } catch (err) {
            console.error('Dashboard load failed:', err)
        }
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index',
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(129, 140, 248, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                padding: 14,
                titleFont: { weight: '600', size: 13 },
                bodyFont: { size: 12 },
                callbacks: {
                    label: (ctx) => ` ₹${ctx.parsed.y.toLocaleString()}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(148,163,184,0.04)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 11, weight: '500' } },
                border: { display: false },
            },
            y: {
                grid: { color: 'rgba(148,163,184,0.06)', drawBorder: false },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    callback: v => v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`,
                    maxTicksLimit: 5,
                },
                border: { display: false },
                beginAtZero: true,
            }
        }
    }

    const greeting = (() => {
        const h = new Date().getHours()
        if (h < 12) return 'Good Morning'
        if (h < 17) return 'Good Afternoon'
        return 'Good Evening'
    })()

    return (
        <div className="dashboard">
            {/* Hero Header */}
            <div className="dash-hero">
                <div className="dash-hero-text">
                    <h1>{greeting} 👋</h1>
                    <p className="dash-hero-date">
                        {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <div className="dash-hero-badge">
                    <Activity size={16} />
                    <span>Live</span>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid">
                <div className="stat-card stat-revenue" style={{ animationDelay: '0s' }}>
                    <div className="stat-glow"></div>
                    <div className="stat-icon-wrap">
                        <IndianRupee size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Today's Revenue</span>
                        <span className="stat-value">₹{stats.todaySales.toLocaleString()}</span>
                        {salesTrend !== 0 && (
                            <span className={`stat-trend ${salesTrend > 0 ? 'up' : 'down'}`}>
                                {salesTrend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                {Math.abs(salesTrend).toFixed(1)}% vs yesterday
                            </span>
                        )}
                    </div>
                </div>

                <div className="stat-card stat-transactions" style={{ animationDelay: '0.08s' }}>
                    <div className="stat-icon-wrap">
                        <ShoppingCart size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Transactions</span>
                        <span className="stat-value">{stats.todayTx}</span>
                        <span className="stat-sub">today</span>
                    </div>
                </div>

                <div className="stat-card stat-products" style={{ animationDelay: '0.16s' }}>
                    <div className="stat-icon-wrap">
                        <Package size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Total Products</span>
                        <span className="stat-value">{stats.totalProducts}</span>
                        <span className="stat-sub">in inventory</span>
                    </div>
                </div>

                <div className="stat-card stat-alerts" style={{ animationDelay: '0.24s' }}>
                    <div className="stat-icon-wrap">
                        <AlertTriangle size={22} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Low Stock</span>
                        <span className="stat-value">{stats.lowStock}</span>
                        <span className="stat-sub">need restock</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dash-content-grid">
                {/* Chart */}
                <div className="chart-card">
                    <div className="chart-header">
                        <div>
                            <h3><BarChart3 size={18} /> Revenue Overview</h3>
                            <p className="chart-subtitle">Last 7 days performance</p>
                        </div>
                    </div>
                    <div className="chart-wrap">
                        {chartData ? (
                            <Line data={chartData} options={chartOptions} />
                        ) : (
                            <div className="chart-placeholder">
                                <div className="chart-loader"></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="recent-card">
                    <h3><TrendingUp size={18} /> Recent Sales</h3>
                    <div className="recent-list">
                        {recentInvoices.length > 0 ? recentInvoices.map((inv, i) => (
                            <div key={inv._id} className="recent-item" style={{ animationDelay: `${0.3 + i * 0.06}s` }}>
                                <div className="recent-item-left">
                                    <div className="recent-avatar">
                                        {(inv.customer?.name || 'W').charAt(0)}
                                    </div>
                                    <div>
                                        <span className="recent-name">{inv.customer?.name || 'Walk-in'}</span>
                                        <span className="recent-time">
                                            {new Date(inv.timestamp).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                        </span>
                                    </div>
                                </div>
                                <span className="recent-amount">₹{Number(inv.totalAmount).toLocaleString()}</span>
                            </div>
                        )) : (
                            <div className="recent-empty">No transactions yet today</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Alert Tables */}
            <div className="alerts-grid">
                <div className="alert-card">
                    <div className="alert-card-header expiry">
                        <Clock size={18} />
                        <h3>Expiring Soon</h3>
                        <span className="alert-count">{alerts.expiringSoon.length}</span>
                    </div>
                    {alerts.expiringSoon.length > 0 ? (
                        <div className="alert-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Expiry Date</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.expiringSoon.map(p => (
                                        <tr key={p._id}>
                                            <td><strong>{p.name}</strong></td>
                                            <td>{new Date(p.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td>{p.stock}</td>
                                            <td>
                                                {p.expired ? (
                                                    <span className="badge badge-danger">Expired</span>
                                                ) : (
                                                    <span className="badge badge-warning">Expiring</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert-empty">
                            <Clock size={28} />
                            <p>No products expiring soon</p>
                        </div>
                    )}
                </div>

                <div className="alert-card">
                    <div className="alert-card-header low-stock">
                        <AlertCircle size={18} />
                        <h3>Low Stock Alerts</h3>
                        <span className="alert-count">{alerts.lowStock.length}</span>
                    </div>
                    {alerts.lowStock.length > 0 ? (
                        <div className="alert-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Current</th>
                                        <th>Threshold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.lowStock.map(p => (
                                        <tr key={p._id}>
                                            <td><strong>{p.name}</strong></td>
                                            <td>
                                                <span className="stock-bar-wrap">
                                                    <span className="stock-bar-fill" style={{ width: `${Math.min(100, (p.stock / (p.lowStockThreshold || 10)) * 100)}%` }}></span>
                                                </span>
                                                <span className="stock-critical">{p.stock}</span>
                                            </td>
                                            <td className="stock-threshold">{p.lowStockThreshold}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert-empty">
                            <Package size={28} />
                            <p>All products well stocked</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
