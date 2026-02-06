import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, MessageCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCount: number
  lastErrorTime: number
}

class ErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null
  
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0,
    lastErrorTime: 0
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const now = Date.now()
    const timeSinceLastError = now - this.state.lastErrorTime
    
    // Reset error count if more than 30 seconds since last error
    const newErrorCount = timeSinceLastError > 30000 ? 1 : this.state.errorCount + 1
    
    console.error('[ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount: newErrorCount
    })
    
    this.setState({ 
      errorInfo,
      errorCount: newErrorCount,
      lastErrorTime: now
    })
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo)
    
    // Auto-recovery: If this is a transient error (first occurrence),
    // try to recover automatically after 2 seconds
    if (newErrorCount === 1 && !this.isKnownFatalError(error)) {
      this.retryTimeout = setTimeout(() => {
        console.log('[ErrorBoundary] Attempting auto-recovery...')
        this.handleRetry()
      }, 2000)
    }
  }
  
  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout)
    }
  }
  
  private isKnownFatalError(error: Error): boolean {
    // Errors that should NOT auto-recover
    const fatalPatterns = [
      'ChunkLoadError',
      'Loading chunk',
      'Minified React error',
      'Maximum update depth exceeded',
      'Too many re-renders'
    ]
    
    return fatalPatterns.some(pattern => 
      error.message?.includes(pattern) || error.name?.includes(pattern)
    )
  }
  
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleRefresh = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private handleClearAndRefresh = () => {
    // Clear local storage and session storage
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (e) {
      console.error('Failed to clear storage:', e)
    }
    window.location.href = '/'
  }
  
  private handleTryAgain = () => {
    this.handleRetry()
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Oops! Something went wrong</CardTitle>
              <CardDescription className="text-base">
                We're sorry, but something unexpected happened. Don't worry, your data is safe.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-semibold">{this.state.error.message}</p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
              
              <div className="grid gap-3">
                {/* Show "Try Again" button that attempts recovery without reload */}
                <Button onClick={this.handleTryAgain} className="w-full" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                
                <Button onClick={this.handleRefresh} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
                
                <Button onClick={this.handleGoHome} variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
                
                <Button 
                  onClick={this.handleClearAndRefresh} 
                  variant="ghost" 
                  className="w-full text-muted-foreground"
                >
                  Clear cache and refresh
                </Button>
              </div>
              
              {this.state.errorCount > 2 && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-sm text-warning">
                    This error has occurred multiple times. If it persists, 
                    try clearing cache or contact support.
                  </p>
                </div>
              )}
              
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground text-center">
                  If this problem persists, please{' '}
                  <a 
                    href="https://wa.me/2348167140857" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <MessageCircle className="h-3 w-3" />
                    contact support
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
