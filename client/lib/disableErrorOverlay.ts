// Disable Next.js error overlay for specific errors
export const disableErrorOverlay = () => {
  if (typeof window === 'undefined') return

  // Override Next.js error overlay
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const message = args.join(' ')
    
    // Check if this is a router AbortError
    if (
      message.includes('Abort fetching component for route') ||
      message.includes('AbortError') ||
      message.includes('cancelled')
    ) {
      // Don't show error overlay for these errors
      return
    }
    
    // Call original console.error for other errors
    originalConsoleError.apply(console, args)
  }

  // Override window.onerror to prevent error overlay
  const originalOnError = window.onerror
  window.onerror = (message, source, lineno, colno, error) => {
    if (
      error?.name === 'AbortError' ||
      (typeof message === 'string' && (
        message.includes('Abort fetching component') ||
        message.includes('AbortError') ||
        message.includes('cancelled')
      ))
    ) {
      // Prevent error overlay from showing
      return true
    }
    
    // Call original error handler for other errors
    if (originalOnError) {
      return originalOnError.call(window, message, source, lineno, colno, error)
    }
    return false
  }

  // Override unhandledrejection to prevent error overlay
  const originalOnUnhandledRejection = window.onunhandledrejection
  window.onunhandledrejection = (event) => {
    if (
      event.reason?.name === 'AbortError' ||
      (typeof event.reason === 'string' && (
        event.reason.includes('Abort fetching component') ||
        event.reason.includes('AbortError') ||
        event.reason.includes('cancelled')
      ))
    ) {
      // Prevent error overlay from showing
      event.preventDefault()
      return
    }
    
    // Call original handler for other rejections
    if (originalOnUnhandledRejection) {
      return originalOnUnhandledRejection.call(window, event)
    }
  }

  console.log('Error overlay suppressor activated')
}
