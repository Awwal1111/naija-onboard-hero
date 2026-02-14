import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { detectMiniPaySync } from '@/lib/minipay'

const isMiniPayEnv = detectMiniPaySync().isMiniPay

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

/**
 * ProtectedRoute - Uses centralized AuthContext (NOT useAuth hook)
 * to avoid creating multiple auth subscriptions.
 * 
 * This is the key fix: previously each ProtectedRoute called useAuth()
 * which created its own onAuthStateChange subscription, causing 14+
 * duplicate events and navigation conflicts on refresh.
 */
export const ProtectedRoute = ({ 
  children, 
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const { user, session, loading } = useAuthContext()

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

  if (!user && !session) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}
