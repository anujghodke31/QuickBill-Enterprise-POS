import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const saved = localStorage.getItem('quickbill_cart')
            return saved ? JSON.parse(saved) : []
        } catch { return [] }
    })

    useEffect(() => {
        localStorage.setItem('quickbill_cart', JSON.stringify(cart))
    }, [cart])

    const addToCart = (product, qty = 1) => {
        setCart(prev => {
            const exists = prev.find(item => item._id === product._id)
            if (exists) {
                return prev.map(item =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + qty }
                        : item
                )
            }
            return [...prev, {
                _id: product._id,
                name: product.name,
                price: product.price,
                compareAtPrice: product.compareAtPrice,
                brand: product.brand,
                image: product.images?.[0] || null,
                quantity: qty,
                stock: product.stock,
            }]
        })
    }

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId)
            return
        }
        setCart(prev =>
            prev.map(item =>
                item._id === productId ? { ...item, quantity } : item
            )
        )
    }

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item._id !== productId))
    }

    const clearCart = () => setCart([])

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    return (
        <CartContext.Provider value={{
            cart, addToCart, updateQuantity, removeFromCart, clearCart,
            cartCount, cartTotal
        }}>
            {children}
        </CartContext.Provider>
    )
}

export const useCart = () => useContext(CartContext)
