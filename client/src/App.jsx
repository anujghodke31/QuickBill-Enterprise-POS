import { useState, useEffect } from 'react'
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
import ProtectedRoute from './components/ProtectedRoute'

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

function Unauthorized() {
    return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Access Denied</h1>
            <p>You do not have permission to view this page.</p>
        </div>
    )
}

function AdminLayout({ onLogout }) {
  return (
    <div className="app-layout">
      <Sidebar onLogout={onLogout} />
      <main className="main-content">
        <Routes>
          {/* Admin / Full Access */}
          <Route path="/" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute allowedRoles={['admin']}><Inventory /></ProtectedRoute>} />
          <Route path="/customers" element={<ProtectedRoute allowedRoles={['admin']}><Customers /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute allowedRoles={['admin']}><Employees /></ProtectedRoute>} />
          <Route path="/suppliers" element={<ProtectedRoute allowedRoles={['admin']}><Suppliers /></ProtectedRoute>} />
          <Route path="/returns" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><Returns /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
          
          {/* Cashiers and above can access POS and Orders */}
          <Route path="/pos" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><POS /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute allowedRoles={['admin', 'cashier']}><Orders /></ProtectedRoute>} />
          
          <Route path="/unauthorized" element={<Unauthorized />} />
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

  useEffect(() => {
     // Validate JWT presence globally
     const token = localStorage.getItem('quickbill_token');
     if (!token && isLoggedIn) {
        setIsLoggedIn(false);
        localStorage.removeItem('quickbill_auth');
     }
  }, [isLoggedIn])

  const handleLogin = (response) => {
    localStorage.setItem('quickbill_auth', 'true')
    if (response?.token) {
      localStorage.setItem('quickbill_token', response.token)
    }
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('quickbill_auth')
    localStorage.removeItem('quickbill_token')
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
