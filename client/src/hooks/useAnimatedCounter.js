import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook that animates a number counting up from 0 to a target value.
 * Uses requestAnimationFrame for smooth 60fps animation.
 *
 * @param {number} target - The target number to count to
 * @param {number} duration - Animation duration in ms (default 2000)
 * @param {boolean} shouldStart - Whether to start the animation
 * @param {number} decimals - Number of decimal places (default 0)
 * @returns {string} - The current animated value as a string
 */
export function useAnimatedCounter(target, duration = 2000, shouldStart = false, decimals = 0) {
    const [value, setValue] = useState(0)
    const animRef = useRef(null)
    const startTimeRef = useRef(null)
    const hasStarted = useRef(false)

    useEffect(() => {
        if (!shouldStart || hasStarted.current) return
        hasStarted.current = true

        function easeOutExpo(t) {
            return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
        }

        function animate(timestamp) {
            if (!startTimeRef.current) startTimeRef.current = timestamp
            const elapsed = timestamp - startTimeRef.current
            const progress = Math.min(elapsed / duration, 1)
            const easedProgress = easeOutExpo(progress)
            const current = easedProgress * target

            setValue(current)

            if (progress < 1) {
                animRef.current = requestAnimationFrame(animate)
            }
        }

        animRef.current = requestAnimationFrame(animate)

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current)
        }
    }, [shouldStart, target, duration])

    return decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toString()
}
