import { useEffect, useRef, useState } from 'react'

/**
 * Custom hook that reveals elements as they scroll into view.
 * Uses IntersectionObserver for performant scroll-based animations.
 *
 * @param {Object} options
 * @param {number} options.threshold - Visibility threshold (0-1), default 0.15
 * @param {string} options.rootMargin - Root margin for observer
 * @param {boolean} options.once - Whether to only trigger once (default true)
 * @returns {[React.RefObject, boolean]} - [ref to attach, isVisible state]
 */
export function useScrollReveal({ threshold = 0.15, rootMargin = '0px 0px -40px 0px', once = true } = {}) {
    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const element = ref.current
        if (!element) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                    if (once) observer.unobserve(element)
                } else if (!once) {
                    setIsVisible(false)
                }
            },
            { threshold, rootMargin }
        )

        observer.observe(element)
        return () => observer.disconnect()
    }, [threshold, rootMargin, once])

    return [ref, isVisible]
}

/**
 * Hook to create staggered reveal effects for list items.
 * Returns a function that generates style + className for each index.
 *
 * @param {boolean} isVisible - Parent container visibility
 * @param {number} staggerMs - Delay between each item in ms
 * @returns {Function} - (index) => { style, className }
 */
export function useStaggeredReveal(isVisible, staggerMs = 80) {
    return (index) => ({
        className: isVisible ? 'reveal-visible' : 'reveal-hidden',
        style: {
            transitionDelay: isVisible ? `${index * staggerMs}ms` : '0ms',
        },
    })
}
