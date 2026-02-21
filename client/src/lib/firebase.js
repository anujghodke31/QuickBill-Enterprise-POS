import { initializeApp, getApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
}

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId']
const hasFirebaseConfig = requiredKeys.every((key) => Boolean(firebaseConfig[key]))

let firebaseAuth = null
let googleProvider = null

if (hasFirebaseConfig) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
    firebaseAuth = getAuth(app)
    googleProvider = new GoogleAuthProvider()
    googleProvider.setCustomParameters({ prompt: 'select_account' })
}

export { firebaseAuth, googleProvider, hasFirebaseConfig }
