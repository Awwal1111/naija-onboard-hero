import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { detectMiniPaySync } from '@/lib/minipay'
import { RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

const isMiniPayEnv = detectMiniPaySync().isMiniPay

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute - Uses centralized AuthContext (NOT useAuth hook)
 * 
 * CRITICAL FIX: Now shows recovery UI if auth loading times out,
 * instead of showing "Loading..." forever. Users can retry auth
 * or clear cache to recover.
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, session, loading, authTimedOut, retryAuth } = useAuthContext()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className={`animate-spin rounded-full ${isMiniPayEnv ? 'h-6 w-6' : 'h-8 w-8'} border-b-2 border-primary mx-auto mb-4`}></div>
          {!isMiniPayEnv && <p className="text-muted-foreground">Loading...</p>}
        </div>
      </div>
    )
  }

  // Auth timed out - show recovery UI instead of redirecting to login
  if (authTimedOut && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="mx-auto w-14 h-14 bg-muted rounded-full flex items-center justify-center">
            <WifiOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Connection Issue</h2>
          <p className="text-sm text-muted-foreground">
            We couldn't verify your login. This usually happens due to a slow connection or a stale cache.
          </p>
          <div className="space-y-2">
            <Button onClick={retryAuth} className="w-full" size="lg">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                try {
                  // Only clear auth-related storage, not everything
                  sessionStorage.removeItem('appMounted')
                  sessionStorage.removeItem('lastRoute')
                } catch {}
                window.location.href = '/login'
              }}
            >
              Go to Login
            </Button>
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                try {
                  localStorage.clear()
                  sessionStorage.clear()
                } catch {}
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(r => r.unregister())
                  }).finally(() => {
                    window.location.href = '/login'
                  })
                } else {
                  window.location.href = '/login'
                }
              }}
            >
              Clear cache & refresh
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
