import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingCart, Package, AlertTriangle, Clock, AlertCircle } from 'lucide-react'
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

            // Today's stats
            const today = new Date().toDateString()
            const todayInvoices = invoices.filter(i => new Date(i.timestamp).toDateString() === today)
            const todaySales = todayInvoices.reduce((sum, i) => sum + i.totalAmount, 0)
            const lowStock = products.filter(p => p.stock < (p.lowStockThreshold || 5)).length

            setStats({
                todaySales,
                todayTx: todayInvoices.length,
                totalProducts: products.length,
                lowStock
            })

            setAlerts(alertsData)

            // 7-day chart
            const days = []
            const salesByDay = []
            for (let i = 6; i >= 0; i--) {
                const d = new Date()
                d.setDate(d.getDate() - i)
                const dayStr = d.toDateString()
                days.push(d.toLocaleDateString('en-IN', { weekday: 'short' }))
                const dayTotal = invoices
                    .filter(inv => new Date(inv.timestamp).toDateString() === dayStr)
                    .reduce((sum, inv) => sum + inv.totalAmount, 0)
                salesByDay.push(dayTotal)
            }

            setChartData({
                labels: days,
                datasets: [{
                    label: 'Daily Sales (₹)',
                    data: salesByDay,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }]
            })
        } catch (err) {
            console.error('Dashboard load failed:', err)
        }
    }

    const statCards = [
        { label: "Today's Sales", value: `₹${stats.todaySales.toLocaleString()}`, icon: TrendingUp, color: 'accent' },
        { label: 'Transactions', value: stats.todayTx, icon: ShoppingCart, color: 'success' },
        { label: 'Total Products', value: stats.totalProducts, icon: Package, color: 'info' },
        { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'warning' },
    ]

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e2640',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(148,163,184,0.1)',
                borderWidth: 1,
                cornerRadius: 10,
                padding: 12,
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(148,163,184,0.06)' },
                ticks: { color: '#64748b', font: { size: 12 } },
                border: { display: false },
            },
            y: {
                grid: { color: 'rgba(148,163,184,0.06)' },
                ticks: { color: '#64748b', font: { size: 12 }, callback: v => `₹${v}` },
                border: { display: false },
                beginAtZero: true,
            }
        }
    }

    return (
        <div className="dashboard">
            <div className="page-header">
                <h1>Dashboard</h1>
                <span className="header-date">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid">
                {statCards.map((s, i) => (
                    <div key={i} className={`stat-card stat-${s.color}`} style={{ animationDelay: `${i * 0.08}s` }}>
                        <div className="stat-icon-wrap">
                            <s.icon size={22} />
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">{s.label}</span>
                            <span className="stat-value">{s.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="chart-card card">
                <h3 className="chart-title">Sales — Last 7 Days</h3>
                <div className="chart-wrap">
                    {chartData ? (
                        <Line data={chartData} options={chartOptions} />
                    ) : (
                        <div className="chart-placeholder">Loading chart…</div>
                    )}
                </div>
            </div>

            {/* Alert Tables */}
            <div className="alerts-grid">
                {/* Expiring Soon */}
                <div className="alert-card card">
                    <div className="alert-card-header expiry">
                        <Clock size={18} />
                        <h3>Expiring Soon</h3>
                        <span className="alert-count">{alerts.expiringSoon.length}</span>
                    </div>
                    {alerts.expiringSoon.length > 0 ? (
                        <div className="table-container">
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
                            <Clock size={32} />
                            <p>No products expiring soon</p>
                        </div>
                    )}
                </div>

                {/* Low Stock */}
                <div className="alert-card card">
                    <div className="alert-card-header low-stock">
                        <AlertCircle size={18} />
                        <h3>Low Stock Alert</h3>
                        <span className="alert-count">{alerts.lowStock.length}</span>
                    </div>
                    {alerts.lowStock.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Current Stock</th>
                                        <th>Threshold</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {alerts.lowStock.map(p => (
                                        <tr key={p._id}>
                                            <td><strong>{p.name}</strong></td>
                                            <td>
                                                <span className="stock-critical">{p.stock}</span>
                                            </td>
                                            <td>{p.lowStockThreshold}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="alert-empty">
                            <Package size={32} />
                            <p>All products well stocked</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
