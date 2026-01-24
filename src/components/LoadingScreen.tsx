import React from 'react'
import { Logo } from '@/components/ui/logo'
import { Loader2 } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
  showLogo?: boolean
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...', 
  showLogo = true 
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {showLogo && (
        <div className="mb-8 animate-pulse">
          <Logo />
        </div>
      )}
      
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 rounded-full border-4 border-primary/20" />
          {/* Spinning ring */}
          <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          {/* Inner pulse */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/20 animate-pulse" />
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          {message}
        </p>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      </div>
    </div>
  )
}

export default LoadingScreen
