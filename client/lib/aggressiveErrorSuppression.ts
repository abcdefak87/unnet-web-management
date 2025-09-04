// Aggressive error suppression for Next.js router AbortError
export const aggressiveErrorSuppression = () => {
  if (typeof window === 'undefined') return

  // Store original functions
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalOnError = window.onerror
  const originalOnUnhandledRejection = window.onunhandledrejection

  // Override console.error
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    
    if (
      message.includes('Abort fetching component for route') ||
      message.includes('AbortError') ||
      message.includes('cancelled') ||
      message.includes('Abort') ||
      message.includes('router.js')
    ) {
      // Completely suppress these errors
      return
    }
    
    originalConsoleError.apply(console, args)
  }

  // Override console.warn
  console.warn = (...args: any[]) => {
    const message = args.join(' ')
    
    if (
      message.includes('Abort fetching component for route') ||
      message.includes('AbortError') ||
      message.includes('cancelled') ||
      message.includes('Abort') ||
      message.includes('router.js')
    ) {
      // Completely suppress these warnings
      return
    }
    
    originalConsoleWarn.apply(console, args)
  }

  // Override window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      error?.name === 'AbortError' ||
      (typeof message === 'string' && (
        message.includes('Abort fetching component') ||
        message.includes('AbortError') ||
        message.includes('cancelled') ||
        message.includes('Abort') ||
        message.includes('router.js')
      ))
    ) {
      // Completely suppress these errors
      return true
    }
    
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error)
    }
    return false
  }

  // Override unhandledrejection
  window.onunhandledrejection = (event) => {
    if (
      event.reason?.name === 'AbortError' ||
      (typeof event.reason === 'string' && (
        event.reason.includes('Abort fetching component') ||
        event.reason.includes('AbortError') ||
        event.reason.includes('cancelled') ||
        event.reason.includes('Abort') ||
        event.reason.includes('router.js')
      ))
    ) {
      // Completely suppress these rejections
      event.preventDefault()
      return
    }
    
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(window, event)
    }
  }

  // Also override the global error handler
  window.addEventListener('error', (event) => {
    if (
      event.error?.name === 'AbortError' ||
      (typeof event.error === 'string' && (
        event.error.includes('Abort fetching component') ||
        event.error.includes('AbortError') ||
        event.error.includes('cancelled') ||
        event.error.includes('Abort') ||
        event.error.includes('router.js')
      ))
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, true)

  // Override unhandledrejection event listener
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.name === 'AbortError' ||
      (typeof event.reason === 'string' && (
        event.reason.includes('Abort fetching component') ||
        event.reason.includes('AbortError') ||
        event.reason.includes('cancelled') ||
        event.reason.includes('Abort') ||
        event.reason.includes('router.js')
      ))
    ) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, true)

  console.log('Aggressive error suppression activated')
}
