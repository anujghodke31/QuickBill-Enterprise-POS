import { useState, useEffect } from 'react'
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
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

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        try {
            const [products, invoices] = await Promise.all([
                api.getProducts(),
                api.getInvoices()
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
        </div>
    )
}
