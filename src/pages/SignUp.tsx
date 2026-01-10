import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { SecureInput } from '@/components/ui/secure-input'
import { Eye, EyeOff, User, Mail, Lock, Sparkles, Shield, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { validatePasswordStrength } from '@/lib/security'
import { Progress } from '@/components/ui/progress'

const SignUp = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false
  })
  const [invitationRole, setInvitationRole] = useState<string | null>(null)

  useEffect(() => {
    if (inviteToken) {
      // Verify invitation and pre-fill email
      supabase
        .from('admin_invitations')
        .select('email, role, status, expires_at')
        .eq('invitation_token', inviteToken)
        .single()
        .then(({ data, error }) => {
          if (error || !data) {
            toast({
              title: "Invalid Invitation",
              description: "This invitation link is invalid or has expired",
              variant: "destructive"
            })
            return
          }

          if (data.status !== 'pending') {
            toast({
              title: "Invitation Already Used",
              description: "This invitation has already been accepted",
              variant: "destructive"
            })
            return
          }

          if (new Date(data.expires_at) < new Date()) {
            toast({
              title: "Invitation Expired",
              description: "This invitation has expired",
              variant: "destructive"
            })
            return
          }

          setFormData(prev => ({ ...prev, email: data.email }))
          setInvitationRole(data.role)
          toast({
            title: "Invitation Found",
            description: `You've been invited as ${data.role}. Please complete your registration.`,
          })
        })
    }
  }, [inviteToken])
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } | null>(null)
  const { signUp, signInWithGoogle } = useAuth()

  const generateStrongPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '@#$%&*!';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // Format: @Capital + lowercase letters + numbers (like @Awwal2886)
    const randomSpecial = special[Math.floor(Math.random() * special.length)];
    const randomUpper = upper[Math.floor(Math.random() * upper.length)];
    const randomChars = Array.from({ length: 5 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    const randomNumbers = Array.from({ length: 4 }, () => 
      numbers[Math.floor(Math.random() * numbers.length)]
    ).join('');
    
    const suggestedPassword = `${randomSpecial}${randomUpper}${randomChars}${randomNumbers}`;
    
    setFormData(prev => ({
      ...prev,
      password: suggestedPassword,
      confirmPassword: suggestedPassword
    }));
    
    const validation = validatePasswordStrength(suggestedPassword);
    setPasswordValidation(validation);
    
    toast({
      title: "Password Generated",
      description: "A strong password has been created for you. Make sure to save it!",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    console.log('Input changed:', { name, value, currentFormData: formData })
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Validate password strength in real-time
    if (name === 'password') {
      const validation = validatePasswordStrength(value)
      setPasswordValidation(validation)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.acceptedTerms) {
      toast({
        title: "Terms Required",
        description: "Please accept the Terms & Conditions to continue",
        variant: "destructive"
      })
      return
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure both passwords are the same",
        variant: "destructive"
      })
      return
    }
    
    setIsLoading(true)
    
    const { error } = await signUp(
      formData.email || '', 
      formData.password || '', 
      formData.fullName || 'User'
    )
    
    if (!error && inviteToken) {
      // Accept invitation after successful signup
      try {
        const { data, error: inviteError } = await supabase.rpc('accept_admin_invitation', {
          p_token: inviteToken
        }) as { data: any; error: any }

        if (inviteError || !data?.success) {
          toast({
            title: "Invitation Error",
            description: data?.error || "Failed to accept invitation",
            variant: "destructive"
          })
        } else {
          toast({
            title: "Role Assigned",
            description: `You've been assigned the ${data.role} role`,
          })
        }
      } catch (error: any) {
        console.error('Error accepting invitation:', error)
      }
    }
    
    setIsLoading(false)
    
    if (!error) {
      navigate('/onboarding')
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    await signInWithGoogle()
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      {/* Navigation */}
      <nav className="flex items-center justify-between p-6">
        <Link to="/" className="transition-transform hover:scale-105">
          <Logo />
        </Link>
      </nav>

      {/* Sign Up Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Join NaijaLancers
              </h1>
            </div>
            <p className="text-text-secondary text-sm">
              Create your account and start your journey today
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">10K+ Users</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">Secure</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-accent/50">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs text-text-secondary">Free</span>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium mb-2 text-text-primary">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    id="fullName"
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>
              </div>

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
                    disabled={!!inviteToken}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Suggest Strong Password
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a strong password"
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
                
                {/* Password Strength Indicator */}
                {passwordValidation && formData.password && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-secondary">Password Strength</span>
                      <span className={
                        passwordValidation.strength === 'strong' ? 'text-green-500' :
                        passwordValidation.strength === 'medium' ? 'text-yellow-500' : 
                        'text-red-500'
                      }>
                        {passwordValidation.strength.toUpperCase()}
                      </span>
                    </div>
                    <Progress 
                      value={
                        passwordValidation.strength === 'strong' ? 100 :
                        passwordValidation.strength === 'medium' ? 66 : 33
                      } 
                      className="h-2"
                    />
                    {passwordValidation.errors.length > 0 && (
                      <ul className="text-xs text-red-500 space-y-1 mt-2">
                        {passwordValidation.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2 text-text-primary">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Re-enter your password"
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

              {/* Terms & Conditions Checkbox */}
              <div className="flex items-start gap-3 p-4 bg-accent/30 rounded-lg border border-border/50">
                <Checkbox 
                  id="terms"
                  checked={formData.acceptedTerms}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptedTerms: !!checked }))}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-text-secondary leading-relaxed">
                  I agree to the{' '}
                  <Link to="/terms-conditions" className="text-primary hover:text-primary/80 underline font-medium">
                    Terms & Conditions
                  </Link>
                  {' '}and{' '}
                  <Link to="/privacy-policy" className="text-primary hover:text-primary/80 underline font-medium">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              <BrandButton 
                type="submit" 
                className="w-full py-6 text-base font-semibold" 
                disabled={isLoading || !formData.acceptedTerms}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚪</span>
                    Creating Account...
                  </span>
                ) : (
                  'Create Account'
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
              {/* Telegram Sign Up Option */}
              <a 
                href="https://t.me/NaijaLancersBot?start=signup"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <BrandButton 
                  variant="secondary" 
                  className="w-full py-3"
                  type="button"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0088cc">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                  Sign Up via Telegram
                </BrandButton>
              </a>
              
              <BrandButton 
                variant="secondary" 
                className="w-full py-3"
                onClick={handleGoogleSignUp}
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

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-text-secondary text-sm">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp