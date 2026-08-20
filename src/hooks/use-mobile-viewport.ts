import { useEffect } from 'react'

/**
 * Hook to manage mobile viewport stability and virtual keyboard handling.
 * - Tracks window.visualViewport height and offsetTop
 * - Sets CSS custom property `--viewport-height` and `--viewport-offset-top` on documentElement
 * - Listens to `resize` and `scroll` on visualViewport
 * - When virtual keyboard closes or active element loses focus, ensures scroll and layout return to clean stable position
 */
export function useMobileViewportStabilizer() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateViewportVariables = () => {
      const vv = window.visualViewport
      if (vv) {
        const height = `${vv.height}px`
        const offsetTop = `${vv.offsetTop}px`
        document.documentElement.style.setProperty('--viewport-height', height)
        document.documentElement.style.setProperty('--viewport-offset-top', offsetTop)
      } else {
        const height = `${window.innerHeight}px`
        document.documentElement.style.setProperty('--viewport-height', height)
        document.documentElement.style.setProperty('--viewport-offset-top', '0px')
      }
    }

    updateViewportVariables()

    const vv = window.visualViewport
    if (vv) {
      vv.addEventListener('resize', updateViewportVariables, { passive: true })
      vv.addEventListener('scroll', updateViewportVariables, { passive: true })
    }

    window.addEventListener('resize', updateViewportVariables, { passive: true })

    // When an input/textarea loses focus (keyboard closing), reset any unwanted window scroll offset smoothly
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        // Small delay to let keyboard finish dismissal animation
        setTimeout(() => {
          updateViewportVariables()
          // If no other input gained focus, ensure window scroll is not shifted horizontally
          if (
            document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA'
          ) {
            if (window.scrollX !== 0) {
              window.scrollTo({ left: 0, top: window.scrollY })
            }
          }
        }, 120)
      }
    }

    window.addEventListener('focusout', handleFocusOut, { passive: true })

    return () => {
      if (vv) {
        vv.removeEventListener('resize', updateViewportVariables)
        vv.removeEventListener('scroll', updateViewportVariables)
      }
      window.removeEventListener('resize', updateViewportVariables)
      window.removeEventListener('focusout', handleFocusOut)
    }
  }, [])
}
