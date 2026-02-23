import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'

// Admin
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Customers from './pages/Customers'
import Employees from './pages/Employees'
import Suppliers from './pages/Suppliers'
import Returns from './pages/Returns'
import Orders from './pages/Orders'

// Storefront
import StorefrontLayout from './components/StorefrontLayout'
import Home from './pages/storefront/Home'
import ProductCatalog from './pages/storefront/ProductCatalog'
import ProductDetail from './pages/storefront/ProductDetail'
import CartPage from './pages/storefront/Cart'
import Checkout from './pages/storefront/Checkout'
import OrderConfirmation from './pages/storefront/OrderConfirmation'
import CustomerAccount from './pages/storefront/CustomerAccount'

import './components/Toast.css'
import './App.css'

function AdminLayout({ onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('quickbill_auth') === 'true'
  })

  const handleLogin = () => {
    localStorage.setItem('quickbill_auth', 'true')
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('quickbill_auth')
    setIsLoggedIn(false)
  }

  return (
    <CartProvider>
      <Routes>
        {/* ── Public Storefront ── */}
        <Route element={<StorefrontLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<ProductCatalog />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
          <Route path="/account" element={<CustomerAccount />} />
        </Route>

        {/* ── Admin ── */}
        <Route path="/admin/login" element={
          isLoggedIn ? <Navigate to="/admin" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/admin/*" element={
          isLoggedIn ? <AdminLayout onLogout={handleLogout} /> : <Navigate to="/admin/login" replace />
        } />
      </Routes>
    </CartProvider>
  )
}
