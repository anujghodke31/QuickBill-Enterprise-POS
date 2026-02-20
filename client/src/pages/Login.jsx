import { useState } from 'react'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import './Login.css'

export default function Login({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false)
    const [form, setForm] = useState({ username: '', password: '' })
    const [loading, setLoading] = useState(false)
    const { addToast } = useToast()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.username || !form.password) {
            addToast('Please fill all fields', 'error')
            return
        }

        setLoading(true)
        try {
            if (isRegister) {
                await api.register(form)
                addToast('Account created! Please login.', 'success')
                setIsRegister(false)
                setForm({ username: '', password: '' })
            } else {
                await api.login(form)
                addToast('Welcome to QuickBill!', 'success')
                onLogin()
            }
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-page">
            <div className="login-bg-pattern" />

            <div className="login-card">
                <div className="login-brand">
                    <div className="login-brand-icon">Q</div>
                    <h1>QuickBill</h1>
                    <p>Enterprise POS System</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter username"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading}>
                        {loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}
                    </button>

                    <p className="login-toggle">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                        <button
                            type="button"
                            className="login-toggle-btn"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? 'Login' : 'Register'}
                        </button>
                    </p>
                </form>
            </div>
        </div>
    )
}
