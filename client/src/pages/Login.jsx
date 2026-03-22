import { useState } from 'react'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { api } from '../api/api'
import { useToast } from '../hooks/useToast'
import { firebaseAuth, googleProvider, hasFirebaseConfig } from '../lib/firebase'
import './Login.css'

function mapFirebaseErrorMessage(error) {
    const code = error?.code || ''
    if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled'
    if (code === 'auth/popup-blocked') return 'Popup was blocked by browser'
    if (code === 'auth/network-request-failed') return 'Network error during Google sign-in'
    return error?.message || 'Google sign-in failed'
}

export default function Login({ onLogin }) {
    const [isRegister, setIsRegister] = useState(false)
    const [form, setForm] = useState({ name: '', username: '', password: '', role: 'cashier' })
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const { addToast } = useToast()

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (isRegister) {
            if (!form.name || !form.username || !form.password) {
                addToast('Please fill all required fields', 'error')
                return
            }
        } else if (!form.username || !form.password) {
            addToast('Please fill all fields', 'error')
            return
        }

        setLoading(true)
        try {
            if (isRegister) {
                await api.register({
                    name: form.name,
                    username: form.username,
                    password: form.password,
                    role: form.role,
                })
                addToast('Account created! Please login.', 'success')
                setIsRegister(false)
                setForm({ name: '', username: '', password: '', role: 'cashier' })
            } else {
                const response = await api.login({
                    username: form.username,
                    password: form.password,
                })
                addToast('Welcome to QuickBill!', 'success')
                onLogin(response)
            }
        } catch (err) {
            addToast(err.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignIn = async () => {
        if (!hasFirebaseConfig || !firebaseAuth || !googleProvider) {
            addToast('Firebase Google auth is not configured', 'error')
            return
        }

        setGoogleLoading(true)
        try {
            const result = await signInWithPopup(firebaseAuth, googleProvider)
            const googleCredential = GoogleAuthProvider.credentialFromResult(result)
            const googleIdToken = googleCredential?.idToken

            if (!googleIdToken) {
                throw new Error('Unable to get Google ID token from Firebase')
            }

            const response = await api.googleLogin({
                credential: googleIdToken,
                role: 'cashier',
            })

            addToast(response.isNewUser ? 'Google account created successfully' : 'Logged in with Google', 'success')
            onLogin(response)
        } catch (error) {
            addToast(mapFirebaseErrorMessage(error), 'error')
        } finally {
            setGoogleLoading(false)
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
                    <h2>{isRegister ? 'Register Employee/User' : 'Welcome Back'}</h2>

                    {isRegister && (
                        <>
                            <div className="form-group">
                                <label htmlFor="name">Full Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="Enter full name"
                                    value={form.name}
                                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select
                                    id="role"
                                    value={form.role}
                                    onChange={(event) => setForm({ ...form, role: event.target.value })}
                                >
                                    <option value="cashier">Cashier</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            placeholder="Enter username"
                            value={form.username}
                            onChange={(event) => setForm({ ...form, username: event.target.value })}
                            autoFocus={!isRegister}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={form.password}
                            onChange={(event) => setForm({ ...form, password: event.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg login-btn" disabled={loading || googleLoading}>
                        {loading ? 'Please wait...' : isRegister ? 'Register Now' : 'Login'}
                    </button>

                    {!isRegister && (
                        <>
                            <div className="login-divider">
                                <span>or</span>
                            </div>

                            <button
                                type="button"
                                className="btn btn-secondary btn-lg login-btn google-btn"
                                onClick={handleGoogleSignIn}
                                disabled={loading || googleLoading || !hasFirebaseConfig}
                            >
                                {googleLoading ? 'Signing in with Google...' : 'Continue with Google'}
                            </button>

                            {!hasFirebaseConfig && (
                                <small className="google-help">
                                    Configure Firebase env in <code>client/.env</code>:<br />
                                    <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>,<br />
                                    <code>VITE_FIREBASE_PROJECT_ID</code>, <code>VITE_FIREBASE_APP_ID</code>
                                </small>
                            )}
                        </>
                    )}

                    <div className="register-box">
                        <p>
                            {isRegister
                                ? 'Already registered as user or employee?'
                                : 'Not registered as user or employee yet?'}
                        </p>
                        <button
                            type="button"
                            className="login-toggle-btn"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? 'Back to Login' : 'Register Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
