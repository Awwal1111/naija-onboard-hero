import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Eye, EyeOff, Mail, Lock, Sparkles, Shield, Zap } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'

const Login = () => {
  // ALL HOOKS AT THE TOP
  const { isMiniPay } = useMiniPayContext()
  const { user, loading: authLoading, signIn, signInWithGoogle } = useAuth()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    const result = await signIn(formData.email, formData.password)
    if (result?.error) {
      setError(result.error.message || 'Invalid credentials')
    }
    setIsLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    await signInWithGoogle()
    setIsLoading(false)
  }

  // CONDITIONAL RETURNS AFTER HOOKS
  // Show loading while determining auth state to prevent flickering
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }
  
  // If user is already authenticated, redirect to feed
  if (user) {
    return <Navigate to="/main-feed" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <Link to="/" className="transition-transform hover:scale-105">
          <Logo />
        </Link>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Welcome Back
              </h1>
            </div>
            <p className="text-text-secondary text-sm">
              Log in to continue your journey with NaijaLancers
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">Secure</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">Fast</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">Trusted</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
            {error && (
              <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-text-primary">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2 text-text-primary">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-12 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link 
                  to="/forgot-password" 
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              <BrandButton 
                type="submit" 
                className="w-full py-6 text-base font-semibold" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚪</span>
                    Signing In...
                  </span>
                ) : (
                  'Log In'
                )}
              </BrandButton>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-text-secondary font-medium">or continue with</span>
              </div>
            </div>

            <div className="space-y-3">
              <BrandButton 
                variant="secondary" 
                className="w-full py-3" 
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </BrandButton>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-8 text-center">
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login